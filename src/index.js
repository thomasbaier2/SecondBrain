const BrainStorage = require('./storage/BrainStorage');
const createBrainRoutes = require('./api/routes');

/**
 * Second Brain Module - Standalone Package
 * 
 * This module can be used independently of any framework.
 * 
 * Usage:
 * ```javascript
 * const { BrainStorage, createBrainRoutes } = require('./src');
 * 
 * // Create storage instance
 * const brainStorage = new BrainStorage({
 *     storagePath: './data/brain',
 *     vectorStore: null // Optional: inject vector store if available
 * });
 * 
 * // Create Express routes
 * const brainRoutes = createBrainRoutes(brainStorage, {
 *     authMiddleware: myAuthMiddleware // Optional
 * });
 * 
 * // Mount in Express app
 * app.use('/api/brain', brainRoutes);
 * ```
 */
module.exports = {
    BrainStorage,
    createBrainRoutes
};
