import { ai } from '../config.js';
import { z } from 'zod';
import SessionLog from './SessionLog.js';
import Policies from './Policies.js';

/**
 * Orchestrator - The Brain of Second Brain 2.0
 * Routes intents to specialized agents.
 */
export class Orchestrator {
    constructor(storage) {
        this.storage = storage;
        this.agents = new Map();
    }

    registerAgent(name, agentInstance) {
        this.agents.set(name, agentInstance);
    }

    /**
     * Principal entry point for user requests
     */
    async processRequest(input) {
        const session = new SessionLog();
        session.addStep('Orchestrator', 'intent_start', { text: input.message });

        // 1. Intent Analysis
        const analysis = await this._analyzeIntent(input.message);
        session.addStep('Orchestrator', 'intent_analyzed', analysis);

        const results = {};

        // 2. Parallel Agent Execution (Clustering)
        const agentTasks = [];

        if (analysis.domains.includes('gmail')) {
            agentTasks.push(this._runAgent('gmail', { action: 'sync_eisenhauer' }, session, results));
        }
        if (analysis.domains.includes('salesforce')) {
            agentTasks.push(this._runAgent('salesforce', { action: 'sync_opportunities' }, session, results));
        }
        if (analysis.domains.includes('ms_graph')) {
            agentTasks.push(this._runAgent('ms_graph', { action: 'sync_calendar' }, session, results));
        }

        await Promise.all(agentTasks);

        // 3. Final Synthesis (Sonia Persona)
        const finalResponse = await this._synthesizeResponse(input, results, session);

        session.complete(finalResponse);
        return {
            ...finalResponse,
            _session: session.getSummary()
        };
    }

    async _runAgent(domain, task, session, results) {
        const agent = this.agents.get(domain);
        if (!agent) {
            session.addStep('Orchestrator', `warning_agent_missing`, { domain });
            return;
        }

        session.addStep(domain, `executing_${task.action}`);
        try {
            const result = await agent.run(task);

            // Policy Verification
            const policyCheck = Policies.validate({ type: task.action, ...result });
            if (!policyCheck.valid) {
                session.addStep(domain, 'policy_violation', policyCheck.reason);
                results[domain] = { error: policyCheck.reason, data: result };
            } else {
                results[domain] = result;
                session.addStep(domain, 'result_ready');
            }
        } catch (e) {
            session.addStep(domain, 'error', e.message);
            results[domain] = { error: e.message };
        }
    }

    async _analyzeIntent(text) {
        const msg = text.toLowerCase();
        const domains = [];

        if (msg.includes('mail') || msg.includes('gmail') || msg.includes('sync') || msg.includes('eisenhauer')) domains.push('gmail');
        if (msg.includes('salesforce') || msg.includes('sf') || msg.includes('opp')) domains.push('salesforce');
        if (msg.includes('termin') || msg.includes('kalender') || msg.includes('ms') || msg.includes('microsoft')) domains.push('ms_graph');

        return {
            domains,
            isSyncRequest: msg.includes('sync') || msg.includes('routine') || msg.includes('morgen')
        };
    }

    async _synthesizeResponse(input, results, session) {
        // This will eventually call the Sonia Persona flow with aggregated results
        // For now, return a placeholder
        return {
            text: "Ich habe die Analyse abgeschlossen und die entsprechenden Cluster abgefragt.",
            details: results
        };
    }
}

export default Orchestrator;
