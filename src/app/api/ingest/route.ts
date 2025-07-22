import { NextResponse } from 'next/server';
import { ingestDriveFolder } from '@/tools/driveIngest';

export async function POST(request: Request) {
  try {
    const { folderId } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    // Check if Google Drive service account JSON is configured
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json(
        { 
          error: 'Missing configuration', 
          details: 'Google Drive service account credentials are not configured. Please set up the GOOGLE_SERVICE_ACCOUNT_JSON environment variable.' 
        },
        { status: 400 }
      );
    }

    console.log(`Starting document ingestion from Google Drive folder: ${folderId}`);
    
    try {
      // Start the ingestion process
      await ingestDriveFolder(folderId);
      
      return NextResponse.json(
        { message: 'Document ingestion completed successfully!' },
        { status: 200 }
      );
    } catch (ingestError) {
      console.error('Ingestion process error:', ingestError);
      
      // Provide more specific error messages based on the error
      if (ingestError instanceof Error) {
        if (ingestError.message.includes('Google Service Account')) {
          return NextResponse.json(
            { error: 'Google Drive configuration error', details: ingestError.message },
            { status: 400 }
          );
        }
      }
      
      // Generic error response
      return NextResponse.json(
        { error: 'Document ingestion failed', details: ingestError instanceof Error ? ingestError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Request processing failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
