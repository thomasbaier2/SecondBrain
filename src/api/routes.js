import express from 'express';

/**
 * Second Brain API Routes - Standalone Module
 * 
 * Independent Express routes that can be mounted in any Express app.
 * No dependencies on Agent Framework.
 */
export function createBrainRoutes(brainStorage, options = {}) {
    const router = express.Router();

    // Domain Agents
    const gmailAgent = options.gmailAgent;
    const msGraphAgent = options.msGraphAgent;
    const orchestrator = options.orchestrator;

    // Optional auth middleware (can be injected)
    const authMiddleware = options.authMiddleware || ((req, res, next) => next());

    router.get('/ping', (req, res) => res.json({ pong: true, mounted: true }));

    /**
     * GET /api/brain
     * Fetch all brain data (tasks, contexts, graph)
     */
    router.get('/', authMiddleware, async (req, res) => {
        try {
            // Refresh urgency before returning
            brainStorage.refreshUrgency();

            const tasks = brainStorage.data.tasks || [];
            const contexts = brainStorage.data.contexts || [];
            const graph = brainStorage.data.graph || { nodes: [], edges: [] };

            res.json({
                tasks,
                contexts,
                graph,
                preferences: brainStorage.getUserPreferences()
            });
        } catch (err) {
            console.error('[BrainAPI] Failed to load brain data:', err);
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/brain/tasks
     * Get tasks with optional filters
     */
    router.get('/tasks', authMiddleware, async (req, res) => {
        try {
            const filters = {
                status: req.query.status || 'all',
                priority: req.query.priority || 'all',
                category: req.query.category || 'all'
            };

            const tasks = brainStorage.getTasks(filters);
            res.json({ tasks, count: tasks.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/brain/matrix
     * Get highly granular Eisenhower Matrix
     */
    router.get('/matrix', authMiddleware, async (req, res) => {
        try {
            const matrix = brainStorage.getEisenhowerMatrix({
                filterMode: req.query.mode || brainStorage.data.preferences.current_work_mode
            });
            res.json({ matrix, count: matrix.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/brain/contexts
     * Get contexts with optional filters
     */
    router.get('/contexts', authMiddleware, async (req, res) => {
        try {
            const filters = {
                tags: req.query.tags ? req.query.tags.split(',') : []
            };

            const contexts = brainStorage.getContexts(filters);
            res.json({ contexts, count: contexts.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/brain/tasks
     * Create a new task
     */
    router.post('/tasks', authMiddleware, async (req, res) => {
        try {
            const task = await brainStorage.storeItem('task', req.body);
            res.status(201).json({ success: true, task });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * PUT /api/brain/tasks/:id
     * Update an existing task
     */
    router.put('/tasks/:id', authMiddleware, async (req, res) => {
        try {
            const success = await brainStorage.updateItem('task', req.params.id, req.body);
            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Task not found' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/brain/tasks/:id
     * Delete a task
     */
    router.delete('/tasks/:id', authMiddleware, async (req, res) => {
        try {
            const success = await brainStorage.deleteItem('task', req.params.id);
            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Task not found' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/brain/contexts
     * Create a new context entry
     */
    router.post('/contexts', authMiddleware, async (req, res) => {
        try {
            const context = await brainStorage.storeItem('context', req.body);
            res.status(201).json({ success: true, context });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * DELETE /api/brain/contexts/:id
     * Delete a context entry
     */
    router.delete('/contexts/:id', authMiddleware, async (req, res) => {
        try {
            const success = await brainStorage.deleteItem('context', req.params.id);
            if (success) {
                res.json({ success: true });
            } else {
                res.status(404).json({ error: 'Context not found' });
            }
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/brain/query
     * Semantic search in brain data
     */
    router.post('/query', authMiddleware, async (req, res) => {
        try {
            const { query, limit, threshold } = req.body;
            if (!query) {
                return res.status(400).json({ error: 'Query parameter required' });
            }

            const results = await brainStorage.query(query, { limit, threshold });
            res.json({ results, count: results.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/brain/preferences
     * Get user preferences
     */
    router.get('/preferences', authMiddleware, async (req, res) => {
        try {
            const preferences = brainStorage.getUserPreferences();
            res.json({ preferences });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // --- BRAIN ACTIONS ---

    // Generic chat/orchestration endpoint
    router.post('/chat', async (req, res) => {
        try {
            const result = await orchestrator.processRequest(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // Specific review endpoint (Daily Briefing)
    router.get('/review', async (req, res) => {
        try {
            const result = await orchestrator.processRequest({
                message: "Gib mir einen Review der Mails der letzten 14 Tage."
            });
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * POST /api/brain/preferences
     * Update user preferences
     */
    router.post('/preferences', authMiddleware, async (req, res) => {
        try {
            const { key, value, confidence } = req.body;
            if (!key || value === undefined) {
                return res.status(400).json({ error: 'key and value required' });
            }

            const preference = await brainStorage.storeItem('preference', {
                key,
                value,
                confidence
            });
            res.json({ success: true, preference });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/auth/google/login
     * Start Gmail OAuth Flow
     */
    router.get('/auth/google/login', async (req, res) => {
        try {
            if (!gmailAgent) return res.status(500).json({ error: 'Gmail Agent not initialized' });
            const { url } = await gmailAgent.run({ action: 'get_auth_url' });
            res.redirect(url);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/auth/google/callback
     * Receive code and save tokens
     */
    router.get('/auth/google/callback', async (req, res) => {
        try {
            if (!gmailAgent) return res.status(500).json({ error: 'Gmail Agent not initialized' });
            const { code } = req.query;
            await gmailAgent.handleCallback(code);
            res.send('<h1>Authentifizierung erfolgreich!</h1><p>Du kannst dieses Fenster jetzt schließen und Sonia bitten, deine Mails zu synchronisieren.</p>');
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * GET /api/auth/microsoft/login
     * Start Microsoft Graph Device Code Flow
     */
    router.get('/auth/microsoft/login', async (req, res) => {
        try {
            if (!msGraphAgent) return res.status(500).json({ error: 'MS Graph Agent not initialized' });
            const result = await msGraphAgent.run({ action: 'get_auth_url' });

            // Return landing page with code and instructions
            res.send(`
                <div style="font-family: sans-serif; padding: 40px; text-align: center; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05);">
                    <h1 style="color: #0078d4;">Microsoft Login</h1>
                    <p>Öffne den folgenden Link in einem neuen Tab:</p>
                    <p><a href="${result.url}" target="_blank" style="font-size: 18px; color: #0078d4; font-weight: bold;">${result.url}</a></p>
                    <p>Gib dort diesen Code ein:</p>
                    <div style="background: #f4f4f4; padding: 20px; font-size: 32px; font-weight: bold; letter-spacing: 5px; border-radius: 10px; margin: 20px 0;">${result.code}</div>
                    <p style="color: #666; font-size: 14px;">Nach der Eingabe kannst du dieses Fenster schließen. Sonia wird dann Zugriff auf deinen Kalender und deine Aufgaben haben.</p>
                </div>
            `);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    /**
     * POST /api/brain/sync
     * Trigger global sync via Orchestrator
     */
    router.post('/sync', authMiddleware, async (req, res) => {
        try {
            if (!orchestrator) return res.status(500).json({ error: 'Orchestrator not initialized' });
            const result = await orchestrator.processRequest({ message: 'sync everything' });
            res.json(result);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    return router;
}

// module.exports = createBrainRoutes;
