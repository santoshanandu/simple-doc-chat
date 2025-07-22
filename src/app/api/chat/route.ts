import { OpenAI } from 'openai';
import { QdrantClient } from '@qdrant/js-client-rest';
import { StreamingTextResponse } from 'ai';
import { z } from 'zod';
import { NextResponse } from 'next/server';

// Environment variables validation
const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1),
  QDRANT_URL: z.string().url(),
  COLLECTION_NAME: z.string().min(1),
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Qdrant client
const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL,
  checkCompatibility: false, // Disable version compatibility check
});

// Define request body type using AIMessage from Vercel AI SDK
type RequestBody = {
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
};

export async function POST(req: Request) {
  try {
    // Validate environment variables
    try {
      envSchema.parse({
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        QDRANT_URL: process.env.QDRANT_URL,
        COLLECTION_NAME: process.env.COLLECTION_NAME,
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Missing or invalid environment variables',
          details: (error as Error).message,
        }),
        { status: 500 }
      );
    }

    // Parse request
    const { messages }: RequestBody = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    // Generate embedding for the query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: lastMessage,
    });
    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Search for similar documents in Qdrant
    console.log(`Searching in collection: ${process.env.COLLECTION_NAME}`);
    console.log(`Searching in collection: ${process.env.COLLECTION_NAME}`);
    const searchResults = await qdrant.search(process.env.COLLECTION_NAME!, {
      vector: queryEmbedding,
      limit: 5,
      with_payload: true,
      score_threshold: 0.6, // Lowered threshold to potentially get more results
    });
    console.log(`Found ${searchResults.length} search results`);

    // If no results found, provide a fallback message
    if (searchResults.length === 0) {
      console.log('No matching documents found in the vector database');
    }

    // Extract relevant context from search results
    // Process search results and build context
    const context = searchResults.length > 0 ? searchResults
      .map((result, index) => {
        // Log detailed information about each result
        console.log(`Result ${index + 1} score: ${result.score}`);
        console.log(`Result ${index + 1} id: ${result.id}`);
        const payload = result.payload as { text: string; metadata: { filename: string; chunkIndex: number } };
        console.log(`Result ${index + 1} filename: ${payload.metadata.filename}`);
        console.log(`Result ${index + 1} chunk: ${payload.metadata.chunkIndex}`);
        console.log(`Result ${index + 1} text preview: ${payload.text.substring(0, 100)}...`);
        return `[${index + 1}] From ${payload.metadata.filename}, chunk ${payload.metadata.chunkIndex}:\n${payload.text}`;
      })
      .join('\n\n') : 'No relevant documents found.';

    // Create system prompt with context
    const systemPrompt = searchResults.length > 0 ?
      `You are a helpful assistant that answers questions based on the provided document context. 
    If the answer cannot be found in the context, say "I don't have enough information to answer this question." 
    Always include citations to the source documents in your answer using [1], [2], etc. format that corresponds to the numbered context below.
    Be concise but thorough in your answers.

    Context from documents:
    ${context}` :
      `You are a helpful assistant that answers questions about documents. However, I couldn't find any relevant documents in the database to answer this specific question. Please inform the user that either:
    1. The documents related to this query haven't been ingested yet
    2. The query might need to be rephrased to better match the content of ingested documents
    3. The system might need to check if documents were properly ingested and indexed
    
    Suggest that they visit the admin panel to check the document ingestion status and verify that documents have been properly indexed.`;

    // Convert messages to OpenAI format
    const apiMessages = messages.map(message => ({
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content
    }));
    
    // Add system message at the beginning
    apiMessages.unshift({
      role: 'system',
      content: systemPrompt
    });

    // Create the streaming response directly
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: apiMessages,
      stream: true,
      temperature: 0.5,
      max_tokens: 1000,
    });
    
    // Convert the response to a ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Process each chunk from the OpenAI stream
        for await (const chunk of response) {
          // Extract the content from the chunk
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // Send the content to the stream
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });
    
    // Return the streaming response
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error('Error in chat route:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred during processing', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
