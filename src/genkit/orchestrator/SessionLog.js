/**
 * SessionLog - Second Brain 2.0
 * Tracks execution steps across multiple agents in a single interaction.
 */
export class SessionLog {
    constructor(sessionId = Date.now().toString()) {
        this.sessionId = sessionId;
        this.steps = [];
        this.startTime = new Date();
    }

    addStep(agentName, action, data = null) {
        const step = {
            timestamp: new Date().toISOString(),
            agent: agentName,
            action,
            data
        };
        this.steps.push(step);
        console.log(`[Session:${this.sessionId}] [${agentName}] ${action}`);
        return step;
    }

    complete(finalResonse) {
        this.endTime = new Date();
        this.duration = this.endTime - this.startTime;
        this.finalResonse = finalResonse;
        return this;
    }

    getSummary() {
        return {
            sessionId: this.sessionId,
            steps: this.steps.length,
            duration: `${this.duration}ms`,
            agentsUsed: [...new Set(this.steps.map(s => s.agent))]
        };
    }
}

export default SessionLog;
