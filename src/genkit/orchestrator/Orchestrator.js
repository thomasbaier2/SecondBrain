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
            let msAction = 'get_calendar';
            if (analysis.isSyncRequest) msAction = 'basic_review';
            else if (analysis.intents.tasks) msAction = 'get_tasks';
            else if (analysis.intents.mail) msAction = 'get_mails';

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
        if (intents.calendar || intents.tasks || msg.includes('ms') || msg.includes('microsoft') || msg.includes('sync')) domains.push('ms_graph');

        return {
            domains,
            intents,
            isSyncRequest: msg.includes('sync') || msg.includes('routine') || msg.includes('morgen') || msg.includes('review')
        };
    }

    async _synthesizeResponse(input, results, session) {
        let text = "";
        let ui_payload = null;

        // 1. Check for Auth Requirement (Prioritize this!)
        for (const domain in results) {
            const res = results[domain];
            if (res.auth_required) {
                return {
                    text: res.error || `Sonia braucht Zugriff auf dein ${domain}-Konto. Bitte klicke hier zum Anmelden:`,
                    ui_payload: {
                        ui_type: 'auth_redirect',
                        url: domain === 'gmail' ? '/api/brain/auth/google/login' : '/api/brain/auth/microsoft/login',
                        button_text: 'Jetzt anmelden',
                        text: res.error || 'Authentifizierung erforderlich'
                    }
                };
            }
        }

        // 2. Aggregate Mails (Gmail + Outlook)
        const allMails = [];
        const mailResults = [];
        if (results.gmail?.success && results.gmail.data?.mails) mailResults.push(...results.gmail.data.mails);
        if (results.ms_graph?.success && results.ms_graph.data?.mails) mailResults.push(...results.ms_graph.data.mails);

        // Also check for legacy or direct access for backward compatibility during transition
        if (results.gmail?.mails) allMails.push(...results.gmail.mails);
        if (results.ms_graph?.mails) allMails.push(...results.ms_graph.mails);
        allMails.push(...mailResults);

        if (allMails.length > 0) {
            allMails.sort((a, b) => new Date(b.date) - new Date(a.date));
            text += `Ich habe ${allMails.length} neue Nachrichten gefunden. `;
            ui_payload = {
                ui_type: 'mail_list',
                title: '📧 Nachrichten-Übersicht',
                count: allMails.length,
                mails: allMails
            };
        }

        // 4. Special Case: Sync/Routine Request (Morning Briefing)
        if (input.message.toLowerCase().includes('sync') || input.message.toLowerCase().includes('morgen') || input.message.toLowerCase().includes('routine')) {
            const sections = [];

            // MS Graph Data (Calendar & Tasks)
            const ms = results.ms_graph || {};
            const calendarEvents = ms.calendar?.events || ms.events;
            const msTasks = ms.tasks?.tasks || ms.tasks;

            if (calendarEvents?.length) {
                sections.push({ title: 'Anstehende Termine', type: 'calendar', data: calendarEvents });
            }
            if (msTasks?.length) {
                sections.push({ title: 'Deine Aufgaben', type: 'tasks', data: msTasks });
            }
            if (allMails.length > 0) {
                sections.push({ title: 'Neue Nachrichten', type: 'mails', data: allMails });
            }

            if (sections.length > 0) {
                text = "Guten Morgen! Hier ist dein aktueller Überblick für heute:";
                ui_payload = {
                    ui_type: 'routine_briefing',
                    title: '🌅 Dein Morgen-Briefing',
                    sections,
                    footer: 'Einen erfolgreichen Tag wünscht dir Sonia! 🦾'
                };
            }
        }

        // 3. Fallback Synthesize (if not a routine sync)
        if (results.ms_graph && (!ui_payload || ui_payload.ui_type !== 'routine_briefing')) {
            const ms = results.ms_graph;
            const events = ms.calendar?.events || ms.events;
            const tasks = ms.tasks?.tasks || ms.tasks;

            if (events) {
                text += `Du hast ${events.length} anstehende Termine. `;
                if (!ui_payload) {
                    ui_payload = {
                        ui_type: 'calendar_list',
                        title: '📅 Kalender (Anstehend)',
                        events: events
                    };
                }
            }
            if (tasks) {
                text += `Es gibt ${tasks.length} offene Aufgaben. `;
                if (!ui_payload) {
                    ui_payload = {
                        ui_type: 'task_list_v2',
                        title: '✅ Offene Aufgaben',
                        data: tasks
                    };
                }
            }
            if (ms.summary && !allMails.length && !events && !tasks) {
                text += ms.summary;
            }
        }

        if (!text) {
            text = "Ich habe die Analyse abgeschlossen und die entsprechenden Ergebnisse für dich zusammengestellt.";
        }

        // 4. Merge UI components into text for frontend parsing
        let finalOutput = text.trim();
        if (ui_payload) {
            finalOutput += `\n\n\`\`\`json\n${JSON.stringify(ui_payload, null, 2)}\n\`\`\``;
        }

        return {
            text: finalOutput,
            details: results
        };
    }
}

export default Orchestrator;
