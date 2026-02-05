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
            const gmailAction = analysis.isSyncRequest ? 'sync_eisenhauer' : 'basic_review';
            agentTasks.push(this._runAgent('gmail', { action: gmailAction, days: 14 }, session, results));
        }
        if (analysis.domains.includes('salesforce')) {
            agentTasks.push(this._runAgent('salesforce', { action: 'sync_opportunities' }, session, results));
        }
        if (analysis.domains.includes('ms_graph')) {
            const msAction = analysis.isSyncRequest ? 'basic_review' : (analysis.intents.calendar ? 'get_calendar' : 'get_tasks');
            agentTasks.push(this._runAgent('ms_graph', { action: msAction, days: 7 }, session, results));
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
        const intents = {
            calendar: msg.includes('termin') || msg.includes('kalender') || msg.includes('meeting'),
            tasks: msg.includes('aufgabe') || msg.includes('todo') || msg.includes('tasks'),
            mail: msg.includes('mail') || msg.includes('gmail') || msg.includes('email')
        };

        if (intents.mail || msg.includes('sync') || msg.includes('eisenhauer')) domains.push('gmail');
        if (msg.includes('salesforce') || msg.includes('sf') || msg.includes('opp')) domains.push('salesforce');
        if (intents.calendar || intents.tasks || msg.includes('ms') || msg.includes('microsoft')) domains.push('ms_graph');

        return {
            domains,
            intents,
            isSyncRequest: msg.includes('sync') || msg.includes('routine') || msg.includes('morgen') || msg.includes('review')
        };
    }

    async _synthesizeResponse(input, results, session) {
        let text = "";
        let ui_payload = null;

        // 1. Check for MS Graph Auth Error (Device Code login needed)
        if (results.ms_graph && results.ms_graph.error && results.ms_graph.error.includes('MS Graph not authenticated')) {
            return {
                text: "Ich brauche Zugriff auf dein Microsoft-Konto für Kalender und Aufgaben. Bitte melde dich hier an:",
                ui_type: 'auth_redirect',
                url: '/api/brain/auth/microsoft/login',
                button_text: 'Mit Microsoft anmelden'
            };
        }

        // 2. Synthesize Gmail results
        if (results.gmail && results.gmail.mails) {
            text += results.gmail.summary || `Ich habe ${results.gmail.count} Mails gefunden. `;
            ui_payload = {
                ui_type: 'mail_list',
                title: '📧 Mail Review',
                count: results.gmail.count,
                mails: results.gmail.mails
            };
        }

        // 3. Synthesize MS Graph results
        if (results.ms_graph) {
            if (results.ms_graph.events) {
                text += `Du hast ${results.ms_graph.count} anstehende Termine. `;
            }
            if (results.ms_graph.tasks) {
                text += `Es gibt ${results.ms_graph.count} offene Aufgaben in MS To-Do. `;
            }
            if (results.ms_graph.summary) {
                text += results.ms_graph.summary;
            }
        }

        if (!text) {
            text = "Ich habe die Analyse abgeschlossen und die entsprechenden Cluster abgefragt.";
        }

        return {
            text: text.trim(),
            ui: ui_payload,
            details: results
        };
    }
}

export default Orchestrator;
