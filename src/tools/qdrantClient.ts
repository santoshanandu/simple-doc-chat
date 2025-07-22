import { QdrantClient } from '@qdrant/js-client-rest';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
const envSchema = z.object({
  QDRANT_URL: z.string().url(),
  COLLECTION_NAME: z.string().min(1),
});

const env = envSchema.parse({
  QDRANT_URL: process.env.QDRANT_URL,
  COLLECTION_NAME: process.env.COLLECTION_NAME,
});

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  checkCompatibility: false, // Disable version compatibility check
});

/**
 * Initialize the Qdrant collection for document storage
 */
export async function initializeCollection(): Promise<void> {
  try {
    // Check if collection exists
    const collections = await qdrant.getCollections();
    const collectionExists = collections.collections.some(
      (collection) => collection.name === env.COLLECTION_NAME
    );

    if (!collectionExists) {
      console.log(`Creating collection: ${env.COLLECTION_NAME}`);
      
      // Create collection with OpenAI embedding dimensions (1536 for text-embedding-ada-002)
      await qdrant.createCollection(env.COLLECTION_NAME, {
        vectors: {
          size: 1536,
          distance: 'Cosine',
        },
      });
      
      console.log('Collection created successfully');
    } else {
      console.log(`Collection ${env.COLLECTION_NAME} already exists`);
    }
  } catch (error) {
    console.error('Error initializing Qdrant collection:', error);
    throw error;
  }
}

/**
 * Insert or update vectors in the Qdrant collection
 * @param embeddings Array of embedding vectors
 * @param payloads Array of payloads containing text and metadata
 */
export async function upsertVectors(
  embeddings: number[][],
  payloads: Array<{
    text: string;
    metadata: {
      filename: string;
      chunkIndex: number;
    };
  }>
): Promise<void> {
  try {
    // Create numeric IDs for each point
    const ids = payloads.map((_, index) => index + 1); // Simple numeric IDs starting from 1
    
    // Use batch format for Qdrant upsert
    await qdrant.upsert(env.COLLECTION_NAME, {
      batch: {
        ids: ids,
        vectors: embeddings,
        payloads: payloads
      },
      wait: true
    });

    console.log(`Upserted ${embeddings.length} vectors to Qdrant`);
  } catch (error) {
    console.error('Error upserting vectors to Qdrant:', error);
    throw error;
  }
}

/**
 * Search for similar vectors in the Qdrant collection
 * @param queryEmbedding The query embedding vector
 * @param limit Maximum number of results to return
 * @returns Array of search results with scores and payloads
 */
export async function searchSimilarVectors(
  queryEmbedding: number[],
  limit: number = 5
) {
  try {
    const results = await qdrant.search(env.COLLECTION_NAME, {
      vector: queryEmbedding,
      limit,
      with_payload: true,
    });

    return results;
  } catch (error) {
    console.error('Error searching Qdrant:', error);
    throw error;
  }
}

export default {
  initializeCollection,
  upsertVectors,
  searchSimilarVectors,
};
