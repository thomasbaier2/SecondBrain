/**
 * AgentBase - Second Brain 2.0
 * Base class for specialized domain agents.
 */
export class AgentBase {
    constructor(name, storage) {
        this.name = name;
        this.storage = storage;
        this.log = [];
    }

    /**
     * Internal logging for result control
     */
    _log(action, result, status = 'success') {
        this.log.push({
            timestamp: new Date().toISOString(),
            action,
            result,
            status
        });
    }

    /**
     * Main execution entry point (to be overridden)
     */
    async run(task) {
        throw new Error('AgentBase.run() must be implemented by subclass');
    }

    /**
     * Standard success result
     */
    success(data = null, ui_payload = null) {
        return { success: true, data, ui_payload, error: null, auth_required: false };
    }

    /**
     * Standard error result
     */
    error(message) {
        return { success: false, data: null, ui_payload: null, error: message, auth_required: false };
    }

    /**
     * Standard auth_required result
     */
    authRequired(message = 'Authentication required') {
        return { success: false, data: null, ui_payload: { ui_type: 'auth_redirect' }, error: message, auth_required: true };
    }

    /**
     * Verification Guard
     * Checks if the result meets the standard contract.
     */
    async verify(result) {
        if (!result || typeof result !== 'object') return false;
        return 'success' in result && 'auth_required' in result;
    }
}

export default AgentBase;
