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
     * Verification Guard
     * Checks if the result meets a basic quality/policy gate.
     */
    async verify(result) {
        // Base implementation: just check if result exists
        return !!result;
    }
}

export default AgentBase;
