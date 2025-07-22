const { ingestDriveFolder } = require('../src/tools/driveIngest');
const dotenv = require('dotenv');
const { z } = require('zod');

// Load environment variables
dotenv.config({ path: '.env' });

// Validate required environment variables
try {
  const envSchema = z.object({
    GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
    OPENAI_API_KEY: z.string().min(1),
    QDRANT_URL: z.string().url(),
    COLLECTION_NAME: z.string().min(1),
  });

  envSchema.parse({
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    QDRANT_URL: process.env.QDRANT_URL,
    COLLECTION_NAME: process.env.COLLECTION_NAME,
  });
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

async function main() {
  // Get folder ID from command line arguments
  const args = process.argv.slice(2);
  const folderId = args[0];

  if (!folderId) {
    console.error('Please provide a Google Drive folder ID as an argument');
    console.error('Usage: npm run ingest -- YOUR_GOOGLE_DRIVE_FOLDER_ID');
    process.exit(1);
  }

  console.log(`Starting document ingestion from Google Drive folder: ${folderId}`);
  console.log('This process will:');
  console.log('1. Download text files from the specified Google Drive folder');
  console.log('2. Chunk the documents into smaller pieces');
  console.log('3. Generate embeddings for each chunk using OpenAI');
  console.log('4. Store the chunks and embeddings in Qdrant');
  console.log('---------------------------------------------------');

  try {
    await ingestDriveFolder(folderId);
    console.log('✅ Document ingestion completed successfully!');
  } catch (error) {
    console.error('❌ Document ingestion failed:', error);
    process.exit(1);
  }
}

main();
