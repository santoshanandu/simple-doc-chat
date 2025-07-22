import { OpenAI } from 'openai';
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

// Validate environment variables
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
});

const env = envSchema.parse({
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Generate embeddings for a batch of text chunks
 * @param texts Array of text chunks to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: texts,
    });

    return response.data.map((item) => item.embedding);
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
}

/**
 * Split a document into chunks of roughly equal size
 * @param text The document text to chunk
 * @param chunkSize Target size of each chunk in characters
 * @param overlap Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function chunkDocument(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): string[] {
  // Safety checks for input
  if (!text || typeof text !== 'string') {
    console.warn('Warning: Invalid text provided to chunkDocument');
    return [];
  }
  
  // Ensure reasonable chunk size and overlap
  chunkSize = Math.max(100, Math.min(chunkSize, 8000));
  overlap = Math.max(0, Math.min(overlap, chunkSize / 2));
  
  // For very short texts, just return as a single chunk
  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;
  let loopGuard = 0;
  const maxIterations = Math.ceil(text.length / (chunkSize - overlap)) + 10; // Add buffer

  while (startIndex < text.length && loopGuard < maxIterations) {
    loopGuard++;
    
    // Find a good breaking point (end of sentence or paragraph)
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    if (endIndex < text.length) {
      // Try to find sentence boundaries (period, question mark, exclamation point followed by space)
      const sentenceBreaks = ['. ', '? ', '! ', '\n\n'];
      let bestBreakPoint = endIndex;
      
      for (const breakChar of sentenceBreaks) {
        const breakPoint = text.lastIndexOf(breakChar, endIndex);
        if (breakPoint > startIndex && breakPoint < endIndex) {
          bestBreakPoint = breakPoint + breakChar.length;
          break;
        }
      }
      
      endIndex = bestBreakPoint;
    }
    
    // Ensure we're making progress
    if (endIndex <= startIndex) {
      endIndex = Math.min(startIndex + chunkSize, text.length);
    }

    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    
    // Move to next chunk with overlap
    startIndex = endIndex - overlap;
  }
  
  if (loopGuard >= maxIterations) {
    console.warn('Warning: Maximum chunking iterations reached, chunking may be incomplete');
  }
  
  return chunks;
}

// Functions are already exported individually with the export keyword
