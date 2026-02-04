const express = require('express');

/**
 * Second Brain API Routes - Standalone Module
 * 
 * Independent Express routes that can be mounted in any Express app.
 * No dependencies on Agent Framework.
 */
function createBrainRoutes(brainStorage, options = {}) {
    const router = express.Router();
    
    // Optional auth middleware (can be injected)
    const authMiddleware = options.authMiddleware || ((req, res, next) => next());
    
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
    
    return router;
}

module.exports = createBrainRoutes;
