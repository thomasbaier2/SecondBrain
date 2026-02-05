/**
 * Standalone Second Brain Server
 * 
 * Run: npm start
 * Or: node src/server.js
 */

import 'dotenv/config';
import express from 'express';
import { BrainStorage, createBrainRoutes } from './index.js';

// Create Express app
const app = express();
app.use(express.json());

// Serve static files from current directory
const rootDir = process.cwd();
console.log('📂 Serving static files from:', rootDir);
app.use(express.static(rootDir));

// CORS middleware (for frontend access)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Simple auth middleware (replace with your own)
const authMiddleware = (req, res, next) => {
    // Example: Check for API key in header (optional)
    const apiKey = req.headers['x-api-key'];
    const requiredKey = process.env.API_KEY;

    // If API_KEY is set, require it; otherwise allow all
    if (requiredKey && apiKey !== requiredKey) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

// Create Brain Storage instance
const brainStorage = new BrainStorage({
    storagePath: './data/brain',
    // vectorStore: null // Optional: Add vector store for semantic search
});

// Create and mount routes
const brainRoutes = createBrainRoutes(brainStorage, {
    authMiddleware: authMiddleware
});

app.use('/api/brain', brainRoutes);

// Genkit Flows
import { suggestTask } from './genkit/flows/suggestTask.js';
import { indexDocument } from './genkit/flows/indexDocs.js';
import { retrieveContext } from './genkit/flows/retrieveDocs.js';
import { chatWithSecretary } from './genkit/flows/chat.js';

app.post('/api/brain/chat', async (req, res) => {
    try {
        const result = await chatWithSecretary(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/brain/index', async (req, res) => {
    try {
        await indexDocument(req.body);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/brain/retrieve', async (req, res) => {
    try {
        const result = await retrieveContext(req.body);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/brain/suggest', async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const result = await suggestTask(text);
        res.json({ suggestion: result });
    } catch (e) {
        console.error('Genkit Error:', e);
        res.status(500).json({ error: e.message });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        module: 'second-brain',
        version: '1.0.0',
        storage: brainStorage.storagePath
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🚀 Second Brain Server running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api/brain`);
    console.log(`💾 Storage: ${brainStorage.storagePath}`);
    console.log(`🔐 Auth: ${process.env.API_KEY ? 'Enabled (API Key required)' : 'Disabled'}`);
});
