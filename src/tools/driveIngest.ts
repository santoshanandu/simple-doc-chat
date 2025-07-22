import { google, drive_v3 } from 'googleapis';
import { z } from 'zod';
import dotenv from 'dotenv';
import { chunkDocument, generateEmbeddings } from './embeddings';
import { initializeCollection, upsertVectors } from './qdrantClient';

dotenv.config();

// Helper function to initialize Google Drive client
export function initGoogleDriveClient(): drive_v3.Drive {
  // Validate environment variables
  const envSchema = z.object({
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1, "Google Service Account JSON is required"),
  });

  // Use safeParse instead of parse to handle validation errors gracefully
  const envResult = envSchema.safeParse({
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
  });

  if (!envResult.success) {
    throw new Error('Missing required environment variable: GOOGLE_SERVICE_ACCOUNT_JSON');
  }

  const env = envResult.data;

  // Parse the service account JSON
  let serviceAccountKey: any;
  try {
    serviceAccountKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } catch (error) {
    throw new Error('Failed to parse Google service account JSON');
  }

  // Initialize Google Drive client
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountKey,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return google.drive({ version: 'v3', auth });
}

// Create drive client lazily when needed
let drive: drive_v3.Drive | null = null;

/**
 * List files in a Google Drive folder
 * @param folderId The ID of the Google Drive folder
 * @returns Array of file metadata
 */
export async function listDriveFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
  try {
    // Initialize drive client if not already initialized
    if (!drive) {
      drive = initGoogleDriveClient();
    }
    
    // First, verify the folder exists and we have access
    try {
      const folderCheck = await drive.files.get({
        fileId: folderId,
        fields: 'id,name,mimeType'
      });
      
      if (!folderCheck.data || folderCheck.data.mimeType !== 'application/vnd.google-apps.folder') {
        console.error('The provided ID is not a folder or does not exist');
        throw new Error('The provided ID is not a folder or does not exist');
      }
      
      console.log(`Accessing folder: ${folderCheck.data.name} (${folderId})`);
    } catch (folderError) {
      console.error('Error accessing folder:', folderError);
      throw new Error(`Cannot access folder with ID ${folderId}. Make sure the folder exists and is shared with the service account.`);
    }
    
    // Support more file types including Google Docs
    const response = await drive.files.list({
      q: `'${folderId}' in parents and mimeType != 'application/vnd.google-apps.folder' and (mimeType = 'text/plain' or mimeType = 'application/pdf' or mimeType = 'application/vnd.google-apps.document')`,
      fields: 'files(id, name, mimeType)',
    });

    const files = response.data.files || [];
    console.log(`Found ${files.length} files in folder ${folderId}:`);
    files.forEach(file => console.log(`- ${file.name} (${file.mimeType})`));
    
    return files;
  } catch (error) {
    console.error('Error listing Drive files:', error);
    throw error;
  }
}

/**
 * Download a file from Google Drive
 * @param fileId The ID of the file to download
 * @param mimeType The mime type of the file
 * @returns The file content as a string
 */
export async function downloadDriveFile(fileId: string, mimeType: string): Promise<string> {
  try {
    // Initialize drive client if not already initialized
    if (!drive) {
      drive = initGoogleDriveClient();
    }
    
    // Handle Google Docs differently - export as plain text
    if (mimeType === 'application/vnd.google-apps.document') {
      console.log(`Exporting Google Doc ${fileId} as text`);
      const response = await drive.files.export({
        fileId,
        mimeType: 'text/plain',
      }, { responseType: 'text' });
      
      return response.data as string;
    } else {
      // For regular files like PDFs and text files
      console.log(`Downloading file ${fileId} directly`);
      const response = await drive.files.get({
        fileId,
        alt: 'media',
      }, { responseType: 'text' });

      return response.data as string;
    }
  } catch (error) {
    console.error(`Error downloading file ${fileId}:`, error);
    throw error;
  }
}

/**
 * Process a single document: download, chunk, embed, and store in Qdrant
 * @param fileId The Google Drive file ID
 * @param fileName The file name
 * @param mimeType The mime type of the file
 */
export async function processDocument(fileId: string, fileName: string, mimeType: string): Promise<void> {
  console.log(`Processing document: ${fileName} (${mimeType})`);
  
  try {
    // Download the file content
    const content = await downloadDriveFile(fileId, mimeType);
    
    if (!content || content.trim().length === 0) {
      console.warn(`Warning: Empty content for file ${fileName}. Skipping.`);
      return;
    }
    
    console.log(`Downloaded content length: ${content.length} characters`);
    
    // Chunk the document
    const chunks = chunkDocument(content);
    console.log(`Created ${chunks.length} chunks from ${fileName}`);
    
    if (chunks.length === 0) {
      console.warn(`Warning: No chunks created for ${fileName}. Skipping.`);
      return;
    }
    
    // Generate embeddings for chunks
    const embeddings = await generateEmbeddings(chunks);
    console.log(`Generated ${embeddings.length} embeddings for ${fileName}`);
    
    // Create payloads for Qdrant
    const payloads = chunks.map((text, index) => ({
      text,
      metadata: {
        filename: fileName,
        mimeType: mimeType,
        chunkIndex: index,
        totalChunks: chunks.length,
      },
    }));
    
    // Store in Qdrant
    await upsertVectors(embeddings, payloads);
    
    console.log(`Successfully processed ${fileName}`);
  } catch (error) {
    console.error(`Failed to process document ${fileName}:`, error);
    // Don't throw the error, just log it and continue with other files
    // This prevents one bad file from stopping the entire ingestion process
  }
}

/**
 * Main function to ingest documents from a Google Drive folder
 * @param folderId The ID of the Google Drive folder containing documents
 */
export async function ingestDriveFolder(folderId: string): Promise<void> {
  try {
    // Initialize Qdrant collection
    await initializeCollection();
    
    // List files in the folder
    const files = await listDriveFiles(folderId);
    console.log(`Found ${files.length} files in the Drive folder`);
    
    if (files.length === 0) {
      console.warn('No files found in the specified folder. Please check:');
      console.warn('1. The folder ID is correct');
      console.warn('2. The folder contains supported file types (PDF, text, Google Docs)');
      console.warn('3. The service account has access to the folder');
      return;
    }
    
    // Process each file
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      if (file.id && file.name && file.mimeType) {
        try {
          await processDocument(file.id, file.name, file.mimeType);
          successCount++;
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          errorCount++;
        }
      }
    }
    
    console.log('Document ingestion complete!');
    console.log(`Successfully processed ${successCount} files`);
    if (errorCount > 0) {
      console.warn(`Failed to process ${errorCount} files`);
    }
  } catch (error) {
    console.error('Error during document ingestion:', error);
    throw error;
  }
}

// Functions are already exported individually with the export keyword

// Run the ingestion if this file is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const folderId = args[0];
  
  if (!folderId) {
    console.error('Please provide a Google Drive folder ID as an argument');
    process.exit(1);
  }
  
  ingestDriveFolder(folderId)
    .then(() => console.log('Ingestion completed successfully'))
    .catch((error) => {
      console.error('Ingestion failed:', error);
      process.exit(1);
    });
}

export default {
  ingestDriveFolder,
  listDriveFiles,
  processDocument,
};
