import BrainStorage from './storage/BrainStorage.js';
import { createBrainRoutes } from './api/routes.js';

/**
 * Second Brain Module - Standalone Package
 * 
 * This module can be used independently of any framework.
 * 
 * Usage:
 * ```javascript
 * import { BrainStorage, createBrainRoutes } from './src/index.js';
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
export {
    BrainStorage,
    createBrainRoutes
};
