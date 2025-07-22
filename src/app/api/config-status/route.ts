import { NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';

export async function GET() {
  // Check configuration status
  const configStatus = {
    googleDrive: false,
    openai: false,
    qdrant: false
  };

  // Check Google Drive configuration
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && 
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON.includes('service_account')) {
    configStatus.googleDrive = true;
  }

  // Check OpenAI configuration
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 10) {
    configStatus.openai = true;
  }

  // Check Qdrant connection
  try {
    const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
    const qdrant = new QdrantClient({ 
      url: qdrantUrl,
      checkCompatibility: false // Disable version compatibility check
    });
    
    // Try to get collection info
    const collectionName = process.env.COLLECTION_NAME || 'documents';
    await qdrant.getCollections();
    configStatus.qdrant = true;
  } catch (error) {
    console.error('Qdrant connection error:', error);
    configStatus.qdrant = false;
  }

  return NextResponse.json(configStatus);
}
