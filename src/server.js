/**
 * Standalone Second Brain Server
 * 
 * Run: npm start
 * Or: node src/server.js
 */

import 'dotenv/config';
import express from 'express';
import { BrainStorage, createBrainRoutes } from './index.js';
import Orchestrator from './genkit/orchestrator/Orchestrator.js';
import GmailAgent from './genkit/agents/GmailAgent.js';
import MsGraphAgent from './genkit/agents/MsGraphAgent.js';

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

// Initialize Domain Agents & Orchestrator
const gmailAgent = new GmailAgent(brainStorage);
const msGraphAgent = new MsGraphAgent(brainStorage);
const orchestrator = new Orchestrator(brainStorage);

// Register Agents in Orchestrator
orchestrator.registerAgent('gmail', gmailAgent);
orchestrator.registerAgent('ms_graph', msGraphAgent);

// Create and mount routes
const brainRoutes = createBrainRoutes(brainStorage, {
    authMiddleware: authMiddleware,
    gmailAgent: gmailAgent,
    msGraphAgent: msGraphAgent,
    orchestrator: orchestrator
});

app.use('/api/brain', brainRoutes);

// Direct Auth Routes (for debugging and better visibility)
app.get('/api/brain/ping', (req, res) => res.json({ status: 'ok', source: 'server.js' }));

app.get('/api/brain/auth/google/login', async (req, res) => {
    try {
        const { url } = await gmailAgent.run({ action: 'get_auth_url' });
        res.redirect(url);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/brain/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        await gmailAgent.handleCallback(code);
        res.send('<h1>Authentifizierung erfolgreich!</h1><p>Du kannst dieses Fenster jetzt schließen und Sonia bitten, deine Mails zu synchronisieren.</p>');
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Genkit Flows
import { suggestTask } from './genkit/flows/suggestTask.js';
import { indexDocument } from './genkit/flows/indexDocs.js';
import { retrieveContext } from './genkit/flows/retrieveDocs.js';
import { chatWithSecretary } from './genkit/flows/chat.js';

app.post('/api/brain/chat', async (req, res) => {
    try {
        const msg = (req.body.message || '').toLowerCase();

        // Route mail/gmail/sync requests through Orchestrator for proper UI
        if (msg.includes('mail') || msg.includes('gmail') || msg.includes('review') || msg.includes('sync') || msg.includes('morgen') || msg.includes('routine') || msg.includes('heute') || msg.includes('anstehend') || msg.includes(' an ') || msg.includes('plan')) {
            const result = await orchestrator.processRequest(req.body);
            return res.json(result);
        }

        // Default: use chatWithSecretary for general chat
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
import { exec, execSync } from 'child_process';
import crypto from 'crypto';

app.get('/health', (req, res) => {
    let commit = 'unknown';
    try {
        commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch (e) { }

    res.json({
        status: 'ok',
        module: 'second-brain',
        version: '1.0.0',
        commit: commit,
        storage: brainStorage.storagePath
    });
});

// --- AUTO-DEPLOY WEBHOOK ---

app.post('/api/deploy', (req, res) => {
    const secret = process.env.DEPLOY_SECRET;

    // Verify GitHub signature if secret is set
    if (secret) {
        const signature = req.headers['x-hub-signature-256'];
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');

        if (signature !== digest) {
            console.log('[Deploy] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
    }

    console.log('[Deploy] Webhook received, pulling latest code...');

    exec('git pull origin master && pm2 restart tb-assistant', { cwd: process.cwd() }, (error, stdout, stderr) => {
        if (error) {
            console.error('[Deploy] Error:', error.message);
            return res.status(500).json({ error: error.message });
        }
        console.log('[Deploy] Success:', stdout);
        res.json({ success: true, output: stdout });
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
