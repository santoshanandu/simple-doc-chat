import { z } from 'zod';
import { ingestDriveFolder } from '../tools/driveIngest';

// Define the tool schema
export const DriveIngestToolSchema = z.object({
  folderId: z.string().min(1, "Google Drive folder ID is required"),
});

// Define the tool handler
export async function driveIngestToolHandler(params: z.infer<typeof DriveIngestToolSchema>) {
  try {
    await ingestDriveFolder(params.folderId);
    return {
      success: true,
      message: `Successfully ingested documents from folder ${params.folderId}`,
    };
  } catch (error) {
    console.error('Error in drive.ingest tool:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during document ingestion',
    };
  }
}

// Export the tool definition
export const driveIngestTool = {
  name: 'drive.ingest',
  description: 'Ingest documents from a Google Drive folder into the Qdrant vector database',
  schema: DriveIngestToolSchema,
  handler: driveIngestToolHandler,
};
