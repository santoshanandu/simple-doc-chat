import { google } from 'googleapis';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Environment variables validation
const envSchema = z.object({
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().min(1),
});

export async function GET(request: Request) {
  try {
    // Get folder ID from query parameters
    const url = new URL(request.url);
    const folderId = url.searchParams.get('folderId');
    
    if (!folderId) {
      return NextResponse.json({
        error: 'Missing folderId query parameter',
      }, { status: 400 });
    }

    // Validate environment variables
    let env;
    try {
      env = envSchema.parse({
        GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "",
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Missing or invalid environment variables',
        details: (error as Error).message,
      }, { status: 500 });
    }

    // Parse the service account JSON
    let serviceAccountKey: any;
    try {
      serviceAccountKey = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } catch (error) {
      return NextResponse.json({
        error: 'Failed to parse Google service account JSON',
        details: (error as Error).message,
        jsonPreview: env.GOOGLE_SERVICE_ACCOUNT_JSON.substring(0, 100) + '...',
      }, { status: 500 });
    }

    // Initialize Google Drive client
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth });

    // List all files in the folder (not just PDFs and text files)
    const response = await drive.files.list({
      q: `'${folderId}' in parents`,
      fields: 'files(id, name, mimeType, size)',
    });

    // Get folder details
    const folderResponse = await drive.files.get({
      fileId: folderId,
      fields: 'name,mimeType,capabilities,permissions'
    });

    return NextResponse.json({
      status: 'success',
      serviceAccount: {
        email: serviceAccountKey.client_email,
        projectId: serviceAccountKey.project_id,
      },
      folder: folderResponse.data,
      files: response.data.files || [],
      supportedTypes: [
        'text/plain',
        'application/pdf',
        'application/vnd.google-apps.document',
      ],
    });
  } catch (error) {
    console.error('Error debugging Google Drive:', error);
    return NextResponse.json({
      error: 'Failed to access Google Drive',
      details: (error as Error).message,
    }, { status: 500 });
  }
}
