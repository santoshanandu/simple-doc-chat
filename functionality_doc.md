# Document Q&A System Analysis

## Project Overview
This application is a document Q&A system that allows users to ask questions about documents stored in Google Drive. The system uses vector embeddings and a vector database to provide relevant answers based on document content.

## Core Components

### 1. Google Drive Integration
- Uses Google Drive API to fetch documents from specified folders
- Supports plain text formats
- Authentication via service account credentials

### 2. Document Processing
- Documents are chunked into smaller pieces (~1000 characters with 200 character overlap)
- Chunking respects sentence boundaries for better context preservation
- Implemented in [src/tools/embeddings.ts](cci:7://file:///c:/Users/DELL/Desktop/Santosh%20AS/simple-doc-chat-main/simple-doc-chat-main/src/tools/embeddings.ts:0:0-0:0)

### 3. Vector Embedding
- Uses OpenAI's text-embedding-ada-002 model to generate embeddings
- Converts text chunks into 1536-dimensional vectors
- Implemented in [src/tools/embeddings.ts](cci:7://file:///c:/Users/DELL/Desktop/Santosh%20AS/simple-doc-chat-main/simple-doc-chat-main/src/tools/embeddings.ts:0:0-0:0)

### 4. Vector Database (Qdrant)
- Stores document chunks and their embeddings
- Enables efficient similarity search for relevant content
- Implemented in [src/tools/qdrantClient.ts](cci:7://file:///c:/Users/DELL/Desktop/Santosh%20AS/simple-doc-chat-main/simple-doc-chat-main/src/tools/qdrantClient.ts:0:0-0:0)

### 5. Chat Interface
- React-based UI with real-time streaming responses using Vercel AI SDK
- Displays answers with citations to source documents
- Implemented in [src/app/page.tsx](cci:7://file:///c:/Users/DELL/Desktop/Santosh%20AS/simple-doc-chat-main/simple-doc-chat-main/src/app/page.tsx:0:0-0:0)

## Key Workflows

### 1. Document Ingestion Process
- Authentication with Google Drive
- Document retrieval from specified folders
- Text extraction and chunking
- Embedding generation
- Storage in Qdrant
- Implemented in [src/tools/driveIngest.ts](cci:7://file:///c:/Users/DELL/Desktop/Santosh%20AS/simple-doc-chat-main/simple-doc-chat-main/src/tools/driveIngest.ts:0:0-0:0)

### 2. Query Processing
- User submits a question through the chat interface
- Question is converted to a vector embedding
- System finds similar document chunks in Qdrant
- Relevant chunks are assembled into a context string
- OpenAI's chat completion API generates an answer based on the context
- Response is streamed back to the user with citations
- Implemented in [src/app/api/chat/route.ts](cci:7://file:///c:/Users/DELL/Desktop/Santosh%20AS/simple-doc-chat-main/simple-doc-chat-main/src/app/api/chat/route.ts:0:0-0:0)

## Technical Stack
- Frontend: Next.js, React, Tailwind CSS
- Backend: node.js API routes
- Vector Database: Qdrant
- AI Models: OpenAI's text-embedding-ada-002 for embeddings, GPT-4 for chat completions
- SDK: Vercel AI SDK for streaming responses and chat UI
- Authentication: Google service account for Drive API
- Environment: Node.js, Docker for Qdrant

## Architecture Strengths
1. Modular Design: Clear separation of concerns between document ingestion, embedding generation, and query processing
2. Streaming Responses: Uses Vercel AI SDK for efficient streaming of responses
3. Error Handling: Comprehensive error handling throughout the codebase
4. Environment Validation: Uses Zod for environment variable validation
5. Docker Support: Includes Docker configuration for Qdrant

## Potential Improvements
1. Pagination: The current implementation doesn't appear to have pagination for large document sets
2. Authentication: The frontend doesn't have user authentication
3. Document Management: No UI for managing ingested documents (only API endpoints)
4. Monitoring: Limited monitoring and logging capabilities

## API Endpoints

### `/api/ingest`
- Ingests documents from a Google Drive folder
- Method: POST
- Body: `{ "folderId": "your-google-drive-folder-id" }`

### `/api/chat`
- Processes user questions and returns answers based on document context
- Method: POST
- Body: `{ "messages": [{ "role": "user", "content": "your question" }] }`
- Uses Vercel AI SDK for streaming responses

### `/api/config-status` & `/api/qdrant-status`
- Check system configuration and database status
- Method: GET

## Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Google Cloud account with Drive API enabled
- OpenAI API key
- Qdrant vector database (local or cloud)

### Environment Variables
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=documents

### Installation
# Install dependencies
npm install

# Start the development server
npm run dev

# Run docker for qdrant
docker run -p 6333:6333 qdrant/qdrant