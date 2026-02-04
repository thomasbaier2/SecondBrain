import fs from 'fs';
import path from 'path';

/**
 * Second Brain Storage - Standalone Module
 * 
 * Independent storage implementation that can work without the Agent Framework.
 * Supports file-based storage with optional vector store integration.
 */
export class BrainStorage {
    constructor(options = {}) {
        // Storage path configuration
        this.storagePath = options.storagePath || path.join(process.cwd(), 'data', 'brain');
        this.dataFile = path.join(this.storagePath, 'personal_brain.json');

        // Optional vector store integration (can be injected)
        this.vectorStore = options.vectorStore || null;

        // Initialize data structure
        this.data = {
            tasks: [],
            contexts: [],
            graph: { nodes: [], edges: [] },
            preferences: {}
        };

        // Ensure storage directory exists
        this.ensureStorageDir();

        // Load existing data
        this.load();

        // Default Work Mode
        if (!this.data.preferences.current_work_mode) {
            this.data.preferences.current_work_mode = 'neutral';
        }
    }

    /**
     * Get tasks for the highly granular Eisenhower Matrix
     * Calculates scores dynamically based on logic/time.
     */
    getEisenhowerMatrix(options = {}) {
        const now = new Date();
        const { timeFilter } = options;

        return this.data.tasks.map(task => {
            let urgency = task.urgency_score || 5;
            let importance = task.importance_score || 5;

            // 1. Dynamic Urgency Growth
            if (task.deadline_at) {
                const deadline = new Date(task.deadline_at);
                const diffMs = deadline - now;
                const diffDays = diffMs / (1000 * 60 * 60 * 24);

                if (diffDays < 0) {
                    urgency = 10; // Overdue
                } else if (diffDays < 1) {
                    urgency = Math.min(10, urgency + 4);
                } else if (diffDays < 3) {
                    urgency = Math.min(10, urgency + 2);
                }
            }

            // 2. Dependency Urgency Push
            if (task.dependency_id) {
                const parent = this.data.tasks.find(t => t.id === task.dependency_id);
                if (parent && (parent.urgency_score > 7 || parent.is_calendar_event)) {
                    urgency = Math.max(urgency, 8);
                }
            }

            return {
                ...task,
                calculated_urgency: urgency,
                calculated_importance: importance,
                quadrant: this._getQuadrant(urgency, importance)
            };
        }).filter(t => {
            if (!timeFilter || timeFilter === 'all') return true;

            const deadline = t.deadline_at ? new Date(t.deadline_at) : null;
            const diffDays = deadline ? (deadline - now) / (1000 * 60 * 60 * 24) : null;

            if (timeFilter === 'today') {
                // Today: Deadline < 1 day OR extremely urgent (8+)
                return (deadline && diffDays < 1) || t.calculated_urgency >= 8;
            }
            if (timeFilter === 'week') {
                // Week: Deadline < 7 days OR urgent (6+)
                return (deadline && diffDays < 7) || t.calculated_urgency >= 6;
            }
            if (timeFilter === 'month') {
                // Month: Deadline < 30 days
                return (deadline && diffDays < 30) || t.calculated_urgency >= 4;
            }

            return true;
        });
    }

    _getQuadrant(u, i) {
        if (u >= 5 && i >= 5) return 'Q1'; // Urgent/Important
        if (u < 5 && i >= 5) return 'Q2';  // Not Urgent/Important
        if (u >= 5 && i < 5) return 'Q3';  // Urgent/Not Important
        return 'Q4';                      // Neither
    }

    /**
     * Ensure storage directory exists
     */
    ensureStorageDir() {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    /**
     * Load data from storage
     */
    load() {
        if (fs.existsSync(this.dataFile)) {
            try {
                const raw = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
                this.data = {
                    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
                    contexts: Array.isArray(raw.contexts) ? raw.contexts : [],
                    graph: raw.graph && typeof raw.graph === 'object' ? raw.graph : { nodes: [], edges: [] },
                    preferences: raw.preferences || {}
                };
            } catch (e) {
                console.error('[BrainStorage] Load failed:', e.message);
                // Keep default empty structure
            }
        }
    }

    /**
     * Save data to storage
     */
    save() {
        try {
            this.ensureStorageDir();
            fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
            return true;
        } catch (e) {
            console.error('[BrainStorage] Save failed:', e.message);
            return false;
        }
    }

    /**
     * Store a structured task or information
     */
    async storeItem(type, item) {
        const entry = {
            id: item.id || this.generateId(),
            ...item,
            timestamp: new Date().toISOString()
        };

        if (type === 'task') {
            // Auto-detect type if not provided
            if (!entry.type) {
                entry.type = this._autoDetectType(entry);
            }
            // Set defaults
            if (!entry.status) entry.status = 'open';
            if (!entry.priority) entry.priority = 'medium';

            this.data.tasks.push(entry);
            this.save();

            // Optional: Store in vector store for semantic search
            if (this.vectorStore && entry.description) {
                await this._indexInVectorStore(entry, 'task');
            }
        } else if (type === 'context') {
            this.data.contexts.push(entry);
            this.save();

            // Optional: Store in vector store
            if (this.vectorStore && entry.content) {
                await this._indexInVectorStore(entry, 'context');
            }
        } else if (type === 'preference') {
            if (!this.data.preferences) this.data.preferences = {};
            this.data.preferences[item.key] = {
                value: item.value,
                learned_at: new Date().toISOString(),
                confidence: item.confidence || 0.5
            };
            this.save();
            return { id: item.key, ...this.data.preferences[item.key] };
        }

        return entry;
    }

    /**
     * Get all behavioral preferences
     */
    getPreferences() {
        const prefs = [];
        for (const [key, val] of Object.entries(this.data.preferences || {})) {
            if (typeof val === 'object' && val.value) {
                prefs.push(`${key}: ${val.value}`);
            } else if (typeof val === 'string') {
                prefs.push(`${key}: ${val}`);
            }
        }
        return prefs;
    }

    /**
     * Add a task (Convenience wrapper)
     */
    async addTask(task) {
        return this.storeItem('task', task);
    }

    /**
     * Update an existing item
     */
    async updateItem(type, id, updates) {
        const list = type === 'task' ? this.data.tasks : this.data.contexts;
        const idx = list.findIndex(i => i.id === id);
        if (idx === -1) return false;

        list[idx] = { ...list[idx], ...updates, updated_at: new Date().toISOString() };
        this.save();

        // Optional: Update vector store
        if (this.vectorStore) {
            await this._indexInVectorStore(list[idx], type);
        }

        return true;
    }

    /**
     * Delete an item
     */
    async deleteItem(type, id) {
        const initialLen = type === 'task' ? this.data.tasks.length : this.data.contexts.length;

        if (type === 'task') {
            this.data.tasks = this.data.tasks.filter(i => i.id !== id);
        } else {
            this.data.contexts = this.data.contexts.filter(i => i.id !== id);
        }

        const success = (type === 'task' ? this.data.tasks.length : this.data.contexts.length) < initialLen;
        if (success) {
            this.save();
            // Optional: Remove from vector store
            if (this.vectorStore) {
                // Note: Vector store deletion would need to be implemented
                // This is a placeholder for future enhancement
            }
        }

        return success;
    }

    /**
     * Get all tasks with filters
     */
    getTasks(filters = {}) {
        return this.data.tasks.filter(t => {
            if (filters.category && filters.category !== 'all' && t.category !== filters.category) return false;
            if (filters.status && filters.status !== 'all' && t.status !== filters.status) return false;
            if (filters.priority && filters.priority !== 'all' && t.priority !== filters.priority) return false;
            return true;
        });
    }

    /**
     * Get all contexts
     */
    getContexts(filters = {}) {
        let contexts = [...this.data.contexts];

        if (filters.tags && filters.tags.length > 0) {
            contexts = contexts.filter(c =>
                c.tags && c.tags.some(tag => filters.tags.includes(tag))
            );
        }

        return contexts;
    }

    /**
     * Semantic search (requires vector store)
     */
    async query(query, options = {}) {
        if (!this.vectorStore) {
            // Fallback to simple text search
            return this._simpleTextSearch(query, options);
        }

        try {
            const results = await this.vectorStore.search(query, {
                targetPartitions: ['brain'],
                limit: options.limit || 5,
                threshold: options.threshold || 0.4
            });
            return results;
        } catch (e) {
            console.warn('[BrainStorage] Vector search failed, falling back to text search:', e.message);
            return this._simpleTextSearch(query, options);
        }
    }

    /**
     * Simple text-based search fallback
     */
    _simpleTextSearch(query, options = {}) {
        const searchTerm = query.toLowerCase();
        const results = [];

        // Search in tasks
        this.data.tasks.forEach(task => {
            const text = `${task.title || ''} ${task.description || ''}`.toLowerCase();
            if (text.includes(searchTerm)) {
                results.push({
                    text: `${task.title}: ${task.description}`,
                    score: 0.5,
                    timestamp: task.timestamp,
                    type: 'task',
                    id: task.id
                });
            }
        });

        // Search in contexts
        this.data.contexts.forEach(context => {
            const text = (context.content || '').toLowerCase();
            if (text.includes(searchTerm)) {
                results.push({
                    text: context.content,
                    score: 0.5,
                    timestamp: context.timestamp,
                    type: 'context',
                    id: context.id
                });
            }
        });

        return results.slice(0, options.limit || 10);
    }

    /**
     * Refresh urgency based on process_at
     */
    refreshUrgency() {
        const now = new Date().getTime();
        let changed = false;

        this.data.tasks.forEach(task => {
            if (task.status === 'completed') return;
            if (!task.process_at) return;

            const processTime = new Date(task.process_at).getTime();
            if (now >= processTime) {
                if (task.priority !== 'urgent' && task.priority !== 'high') {
                    task.priority = 'urgent';
                    changed = true;
                }
            }
        });

        if (changed) {
            this.save();
        }

        return changed;
    }

    /**
     * Get user preferences
     */
    getUserPreferences() {
        return this.data.preferences || {};
    }

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substring(7);
    }

    /**
     * Auto-detect task type
     */
    _autoDetectType(task) {
        if (task.termin_at) return 'termin';
        if (task.event_at) return 'event';

        const totalMinutes = (task.duration_h || 0) * 60 + (task.duration_m || 0);
        if (totalMinutes > 0 && totalMinutes < 10) return 'todo';
        if (totalMinutes >= 10) return 'aufgabe';

        return 'aufgabe';
    }

    /**
     * Index item in vector store (optional)
     */
    async _indexInVectorStore(item, type) {
        if (!this.vectorStore) return;

        try {
            const text = type === 'task'
                ? `${item.title || ''} ${item.description || ''}`.trim()
                : (item.content || '').trim();

            if (!text) return;

            await this.vectorStore.addMemory(text, {
                type: `brain_${type}`,
                brainId: item.id,
                timestamp: item.timestamp
            }, 'brain');
        } catch (e) {
            console.warn('[BrainStorage] Vector indexing failed:', e.message);
        }
    }
}


export default BrainStorage;
