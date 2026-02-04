import ApiClient from './ApiClient.js';

/**
 * Second Brain Frontend Module - Standalone ES6 Module
 * 
 * Independent frontend component for Second Brain functionality.
 * Can be used in any web application that provides the API endpoints.
 */
export class SecondBrain {
    constructor(apiBase = '/api/brain') {
        this.data = {
            tasks: [],
            contexts: [],
            graph: { nodes: [], edges: [] }
        };
        this.api = new ApiClient(apiBase);
    }

    /**
     * Initialize the module
     */
    async init() {
        console.log('[SecondBrain] Initializing...');
        await this.loadData();
        this.setupEventListeners();
    }

    /**
     * Load brain data from API
     */
    async loadData() {
        try {
            const data = await this.api.get('/');
            this.data = {
                tasks: data.tasks || [],
                contexts: data.contexts || [],
                graph: data.graph || { nodes: [], edges: [] }
            };
            this.render();
        } catch (err) {
            console.error('[SecondBrain] Failed to load data:', err);
            this.showError('Fehler beim Laden der Daten.');
        }
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('brain-refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadData());
        }

        // Filters
        const statusFilter = document.getElementById('brain-filter-status');
        const priorityFilter = document.getElementById('brain-filter-priority');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.applyFilters());
        }
        if (priorityFilter) {
            priorityFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    /**
     * Apply filters and re-render
     */
    applyFilters() {
        const statusFilter = document.getElementById('brain-filter-status')?.value || 'all';
        const priorityFilter = document.getElementById('brain-filter-priority')?.value || 'all';

        const filtered = this.data.tasks.filter(t => {
            const statusMap = { 'open': 'offen', 'completed': 'completed', 'deferred': 'in_progress' };
            const taskStatus = statusMap[t.status] || t.status || 'offen';

            if (statusFilter !== 'all' && taskStatus !== statusFilter) return false;
            if (priorityFilter !== 'all' && (t.priority || 'medium') !== priorityFilter) return false;

            return true;
        });

        this.renderTasks(filtered);
        this.updateTaskCount(filtered.length, this.data.tasks.length);
    }

    /**
     * Render the entire component
     */
    render() {
        this.renderTasks(this.data.tasks);
        this.renderContexts(this.data.contexts);
        this.updateTaskCount(this.data.tasks.length, this.data.tasks.length);
        this.updateContextCount(this.data.contexts.length);
    }

    /**
     * Render tasks list
     */
    renderTasks(tasks) {
        const container = document.getElementById('brain-tasks-container');
        if (!container) return;

        if (!tasks.length) {
            container.innerHTML = `
                <div class="brain-empty-state">
                    <div class="brain-empty-icon">✅</div>
                    <p class="m-0">Noch keine Aufgaben.</p>
                    <p class="m-0 mt-8 text-12">Aufgaben werden hier angezeigt, sobald sie erstellt wurden.</p>
                </div>`;
            return;
        }

        container.innerHTML = tasks.map(t => this.renderTaskCard(t)).join('');
    }

    /**
     * Render a single task card
     */
    renderTaskCard(task) {
        const depsHtml = (task.dependencies && task.dependencies.length)
            ? `<div class="text-10 text-orange mt-4">🔗 Wartet auf: ${task.dependencies.join(', ')}</div>`
            : '';

        const proofHtml = task.proof
            ? `<div class="text-10 text-green mt-4">✅ Nachweis: ${task.proof}</div>`
            : '';

        const typeLabel = task.type || 'aufgabe';
        const durationText = (task.duration_h || task.duration_m)
            ? `${task.duration_h || 0}h ${task.duration_m || 0}m`
            : '';

        const timeInfo = [];
        if (task.deadline_at) timeInfo.push(`🏁 Deadline: ${new Date(task.deadline_at).toLocaleString()}`);
        if (task.event_at) timeInfo.push(`🎭 Event: ${new Date(task.event_at).toLocaleString()}`);
        if (task.termin_at) timeInfo.push(`📅 Termin: ${new Date(task.termin_at).toLocaleString()}`);
        if (task.process_at) timeInfo.push(`⚙️ Bearbeitung: ${new Date(task.process_at).toLocaleString()}`);

        const statusMap = { 'open': 'offen', 'completed': 'erledigt', 'deferred': 'in Bearbeitung' };
        const statusText = statusMap[task.status] || task.status || 'offen';

        return `
            <div class="brain-item priority-${task.priority || 'medium'}">
                <div class="flex justify-between items-start">
                    <div class="flex flex-col">
                        <div class="font-600 text-navy">${task.title || 'Aufgabe'}</div>
                        <div class="flex gap-4 mt-2">
                            <span class="type-badge type-${typeLabel}">${typeLabel}</span>
                            <span class="tag-brain">${task.category || 'Allgemein'}</span>
                        </div>
                    </div>
                    <div class="badge badge-active text-10">${statusText}</div>
                </div>
                <div class="text-11 mt-6">${task.description || ''}</div>
                ${depsHtml}
                ${proofHtml}
                <div class="brain-meta flex-col gap-2 mt-8">
                    ${durationText ? `<div class="text-muted">⏱️ Dauer: ${durationText}</div>` : ''}
                    ${timeInfo.map(info => `<div class="text-muted">${info}</div>`).join('')}
                    <div class="text-muted font-600 mt-2">Eisenhower: ${String(task.priority).toUpperCase()}</div>
                </div>
            </div>
        `;
    }

    /**
     * Render contexts list
     */
    renderContexts(contexts) {
        const container = document.getElementById('brain-contexts-container');
        if (!container) return;

        if (!contexts.length) {
            container.innerHTML = `
                <div class="brain-empty-state">
                    <div class="brain-empty-icon">💡</div>
                    <p class="m-0">Noch keine Kontext-Notizen.</p>
                    <p class="m-0 mt-8 text-12">Gedächtnis-Einträge erscheinen hier, sobald sie erstellt wurden.</p>
                </div>`;
            return;
        }

        container.innerHTML = contexts.map(c => `
            <div class="brain-item">
                <div class="text-12">${c.content}</div>
                <div class="brain-meta">
                    ${(c.tags || []).map(tag => `<span class="tag-brain">${tag}</span>`).join(' ')}
                    <span class="text-muted ml-auto">${new Date(c.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Update task count display
     */
    updateTaskCount(filtered, total) {
        const countEl = document.getElementById('brain-task-count');
        if (!countEl) return;

        if (filtered === total) {
            countEl.textContent = `${total} Aufgaben`;
        } else {
            countEl.textContent = `${filtered} von ${total} Aufgaben`;
        }
    }

    /**
     * Update context count display
     */
    updateContextCount(count) {
        const countEl = document.getElementById('brain-context-count');
        if (!countEl) return;

        countEl.textContent = `${count} Einträge`;
    }

    /**
     * Show error message
     */
    showError(message) {
        const taskContainer = document.getElementById('brain-tasks-container');
        const contextContainer = document.getElementById('brain-contexts-container');

        const errorHtml = `
            <div class="brain-empty-state">
                <div class="brain-empty-icon">⚠️</div>
                <p class="m-0">${message}</p>
            </div>`;

        if (taskContainer) taskContainer.innerHTML = errorHtml;
        if (contextContainer) contextContainer.innerHTML = errorHtml;
    }

    async askSecretary(text) {
        return this.api.post('/suggest', { text: text });
    }

    async addTask(task) {
        try {
            await this.api.post('/tasks', task);

            // Optional: Also add context?
            // await this.api.post('/contexts', { content: `Created task via AI: ${task.title}` });

            return true;
        } catch (e) {
            console.error(e);
            throw e;
        }
    }

    setApiBase(url) {
        this.api = new ApiClient(url);
    }
}

// Export singleton instance
export const secondBrain = new SecondBrain();
