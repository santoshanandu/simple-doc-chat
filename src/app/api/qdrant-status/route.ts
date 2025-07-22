import { QdrantClient } from '@qdrant/js-client-rest';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Environment variables validation
const envSchema = z.object({
  QDRANT_URL: z.string().url(),
  COLLECTION_NAME: z.string().min(1),
});

export async function GET() {
  try {
    // Validate environment variables
    let env;
    try {
      env = envSchema.parse({
        QDRANT_URL: process.env.QDRANT_URL,
        COLLECTION_NAME: process.env.COLLECTION_NAME,
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Missing or invalid environment variables',
        details: (error as Error).message,
      }, { status: 500 });
    }

    // Initialize Qdrant client
    const qdrant = new QdrantClient({
      url: env.QDRANT_URL,
      checkCompatibility: false, // Disable version compatibility check
    });

    // Get collection info
    const collectionInfo = await qdrant.getCollection(env.COLLECTION_NAME);
    
    // Count points in collection
    const countResponse = await qdrant.count(env.COLLECTION_NAME, {});
    
    // Get a sample of points to verify content
    const samplePoints = await qdrant.scroll(env.COLLECTION_NAME, {
      limit: 5,
      with_payload: true,
      with_vector: false,
    });

    return NextResponse.json({
      status: 'success',
      collection: {
        name: env.COLLECTION_NAME,
        vectorSize: collectionInfo.config?.params?.vectors?.size || 'unknown',
        vectorDistance: collectionInfo.config?.params?.vectors?.distance || 'unknown',
        pointsCount: countResponse.count,
      },
      samplePoints: samplePoints.points.map(point => ({
        id: point.id,
        payload: point.payload,
      })),
    });
  } catch (error) {
    console.error('Error checking Qdrant status:', error);
    return NextResponse.json({
      error: 'Failed to check Qdrant status',
      details: (error as Error).message,
    }, { status: 500 });
  }
}
