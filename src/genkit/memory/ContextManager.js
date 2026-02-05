import { ai } from '../config.js';

/**
 * ContextManager - Second Brain 2.0
 * Handles context window thresholds and state summarization (Handover Notes).
 */
export class ContextManager {
    constructor(options = {}) {
        this.threshold = options.threshold || 0.8; // 80% limit
        this.storage = options.storage;
    }

    /**
     * Checks if a history/context is too large.
     * If so, generates a "Handover Note" and returns it as the new starting point.
     */
    async manage(history) {
        const estimatedTokens = JSON.stringify(history).length / 4; // Very rough estimate
        const currentLimit = 120000; // Example for Gemini Flash

        if (estimatedTokens > currentLimit * this.threshold) {
            console.log('⚠️ Context limit reached. Summarizing for handover...');
            return await this._generateHandover(history);
        }

        return history;
    }

    async _generateHandover(history) {
        const { text } = await ai.generate({
            prompt: `
                The current conversation context is getting too long. 
                Analyze the history below and create a "Handover Note" for yourself (the next LLM call).
                
                INCLUDE:
                - What did the user just ask?
                - What facts have were established?
                - What tasks are currently in progress?
                - What is the user's current mood?
                
                KEE-IT: Concise and purely factual.
                
                HISTORY:
                ${JSON.stringify(history.slice(-10))}
            `
        });

        return [
            { role: 'user', content: `[SYSTEM HANDOVER NOTE]: ${text}` }
        ];
    }
}

export default ContextManager;
