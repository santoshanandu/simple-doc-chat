import express from 'express';
import { z } from 'zod';
import dotenv from 'dotenv';
import cors from 'cors';
import { ingestDriveFolder } from '../tools/driveIngest';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MCP Tool Schema
const ToolRequestSchema = z.object({
  tool: z.string(),
  params: z.record(z.unknown()),
});

// MCP Tools Registry
const tools = {
  'drive.ingest': async (params: any) => {
    const { folderId } = z.object({
      folderId: z.string(),
    }).parse(params);
    
    try {
      await ingestDriveFolder(folderId);
      return { success: true, message: 'Documents ingested successfully' };
    } catch (error) {
      console.error('Error ingesting documents:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error during ingestion' 
      };
    }
  }
};

// MCP Tool Endpoint
app.post('/api/tools', async (req, res) => {
  try {
    const { tool, params } = ToolRequestSchema.parse(req.body);
    
    // Check if tool exists
    if (!Object.keys(tools).includes(tool)) {
      return res.status(404).json({ error: `Tool '${tool}' not found` });
    }
    
    // Execute tool
    const result = await tools[tool as keyof typeof tools](params);
    return res.json(result);
  } catch (error) {
    console.error('Error executing tool:', error);
    return res.status(400).json({ 
      error: 'Invalid request',
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (_, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});

export default app;
