Here is the refined version of your `README.md` file with improved formatting and Markdown consistency for better visibility on GitHub:

---

````md
# 📄 Document Q&A System

A **Next.js** application that allows users to ask questions about documents stored in **Google Drive**. It uses **OpenAI embeddings** to convert document chunks into vector representations, which are stored in a **Qdrant vector database** for efficient similarity search and retrieval.

---

## 🧠 System Architecture

### 🧩 Components

1. **Google Drive Integration**
   - Fetches documents from specified Google Drive folders
   - Supports  plain text formats

2. **Document Processing**
   - Chunks documents into ~1000-character segments (with 200-character overlap)
   - Preserves sentence boundaries for context

3. **Vector Embedding**
   - Uses OpenAI `text-embedding-ada-002` model to generate 1536-dimensional vectors

4. **Vector Database (Qdrant)**
   - Stores embeddings for similarity search

5. **Chat Interface**
   - Web-based chat interface to ask questions
   - Displays cited answers from source documents

---

## 🔁 Workflow

### 📥 Document Ingestion Process

1. **Authentication**: Google Drive service account credentials
2. **Document Retrieval**: Downloads files from the specified Drive folder
3. **Text Extraction**: Parses the plain text files
4. **Chunking**: Splits text into overlapping chunks
5. **Embedding Generation**: Generates embeddings for each chunk
6. **Storage**: Saves embeddings in Qdrant vector DB

### 🤖 Query Processing

1. **User Query**: Entered via chat UI
2. **Query Embedding**: User input converted to embedding
3. **Similarity Search**: Finds most relevant chunks from Qdrant
4. **Context Building**: Assembles relevant text into a prompt
5. **Answer Generation**: OpenAI chat completion model returns an answer
6. **Response**: Answer is streamed back with citations

---

## 🛠️ Setup Instructions

### ✅ Prerequisites

- Node.js 18+ and npm
- Google Cloud project with Drive API enabled
- OpenAI API key
- Qdrant (local or cloud instance)

### 🔐 Environment Variables

Create a `.env` file in the root directory with:

```env
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...} # Full JSON string
OPENAI_API_KEY=your-openai-api-key
QDRANT_URL=http://localhost:6333
COLLECTION_NAME=documents
````

### 📦 Installation

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Start Qdrant (local)
docker run -p 6333:6333 qdrant/qdrant
```

---

## 🚀 Usage

### 🗂️ Document Ingestion

#### Option 1: API Ingestion

```bash
curl -X POST http://localhost:3000/api/ingest \
     -H "Content-Type: application/json" \
     -d '{"folderId": "your-google-drive-folder-id"}'
```

#### Option 2: CLI Script

```bash
node scripts/ingest.js your-google-drive-folder-id
```

### 💬 Asking Questions

1. Visit `http://localhost:3000`
2. Enter a question in the chat box
3. Get an answer with citations from documents

---

## 🧩 API Reference

### `/api/ingest`

Ingests documents from Google Drive

* **POST**
* Body: `{ "folderId": "your-google-drive-folder-id" }`

### `/api/chat`

Processes user queries and returns answers

* **POST**
* Body: `{ "messages": [{ "role": "user", "content": "your question" }] }`

### `/api/config-status`

Returns status of required environment variables

* **GET**

### `/api/qdrant-status`

Returns Qdrant connection status and vector count

* **GET**

---

## 🧰 Troubleshooting

| Issue                       | Fix                                                 |
| --------------------------- | --------------------------------------------------- |
| **Module export errors**    | Use ES module syntax consistently                   |
| **Qdrant not connecting**   | Ensure Qdrant is running and accessible             |
| **Google Drive API errors** | Ensure service account has folder access            |
| **No results from search**  | Confirm documents are ingested and embeddings exist |

---

## 📁 File Structure

```
document-QA/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   ├── ingest/
│   │   │   ├── config-status/
│   │   │   └── qdrant-status/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   └── tools/
│       ├── driveIngest.ts
│       ├── embeddings.ts
│       └── qdrantClient.ts
├── scripts/
│   └── ingest.ts
├── .env
└── package.json
```

### 🔑 Key Files

* `driveIngest.ts`: Google Drive fetch & processing
* `embeddings.ts`: Text chunking & embedding
* `qdrantClient.ts`: Qdrant DB operations
* `chat/route.ts`: Chat API endpoint
* `ingest/route.ts`: Document ingestion API
* `scripts/ingest.ts`: CLI ingestion script

---

[Demo video](https://drive.google.com/file/d/1EuPvHr1JxwL434gCLDKQVmM2qF5sOahs/view?usp=sharing)
[Functinality document](https://github.com/santoshanandu/simple-doc-chat/blob/main/functionality_doc.md)
