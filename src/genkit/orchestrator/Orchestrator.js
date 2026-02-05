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
        let days = 14;
        const msgLow = input.message.toLowerCase();
        if (msgLow.includes('woche')) days = 7;
        else if (msgLow.includes('heute') || msgLow.includes('morgen')) days = 1;

        if (analysis.domains.includes('gmail')) {
            const gmailAction = analysis.isSyncRequest ? 'sync_eisenhauer' : 'basic_review';
            agentTasks.push(this._runAgent('gmail', { action: gmailAction, days: days }, session, results));
        }
        if (analysis.domains.includes('salesforce')) {
            agentTasks.push(this._runAgent('salesforce', { action: 'sync_opportunities' }, session, results));
        }
        if (analysis.domains.includes('ms_graph')) {
            let msAction = 'get_calendar';
            let details = null;

            if (analysis.intents.create && analysis.appointmentDetails) {
                msAction = 'create_event';
                details = analysis.appointmentDetails;
            } else if (analysis.isSyncRequest) {
                msAction = 'basic_review';
            } else if (analysis.intents.tasks) {
                msAction = 'get_tasks';
            } else if (analysis.intents.mail) {
                msAction = 'get_mails';
            }

            agentTasks.push(this._runAgent('ms_graph', { action: msAction, days: days, details }, session, results));
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
            mail: msg.includes('mail') || msg.includes('gmail') || msg.includes('email'),
            create: msg.includes('lege') || msg.includes('erstellen') || msg.includes('neu') || msg.includes('planen') || msg.includes('eintragen')
        };

        if (intents.mail || msg.includes('sync') || msg.includes('eisenhauer')) domains.push('gmail');
        if (msg.includes('salesforce') || msg.includes('sf') || msg.includes('opp')) domains.push('salesforce');
        if (intents.calendar || intents.tasks || msg.includes('ms') || msg.includes('microsoft') || msg.includes('sync')) domains.push('ms_graph');

        let appointmentDetails = null;
        if (intents.calendar && intents.create) {
            appointmentDetails = await this._extractAppointmentDetails(text);
        }

        return {
            domains,
            intents,
            appointmentDetails,
            isSyncRequest: msg.includes('sync') || msg.includes('routine') || msg.includes('morgen') || msg.includes('review') || msg.includes('woche') || msg.includes('heute') || msg.includes('zusammenfassung') || msg.includes('überblick')
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

        // Helper to extract mails from various agent result shapes
        const extractMails = (res) => {
            if (!res?.success || !res.data) return [];
            if (Array.isArray(res.data.mails)) return res.data.mails;
            if (res.data.mails && Array.isArray(res.data.mails.mails)) return res.data.mails.mails;
            return [];
        };

        allMails.push(...extractMails(results.gmail));
        allMails.push(...extractMails(results.ms_graph));

        console.log('[Orchestrator] Data Aggregation:', {
            gmailMails: extractMails(results.gmail).length,
            outlookMails: extractMails(results.ms_graph).length,
            hasMsGraph: !!results.ms_graph?.data,
            msGraphStatus: results.ms_graph?.success ? 'success' : (results.ms_graph?.error || 'failed')
        });

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
        const isSync = (session.steps || []).some(s => s.data?.isSyncRequest) ||
            input.message.toLowerCase().includes('sync') ||
            input.message.toLowerCase().includes('morgen') ||
            input.message.toLowerCase().includes('routine') ||
            input.message.toLowerCase().includes('woche') ||
            input.message.toLowerCase().includes('heute') ||
            input.message.toLowerCase().includes('zusammenfassung') ||
            input.message.toLowerCase().includes('überblick');

        if (isSync) {
            const sections = [];

            // MS Graph Data (Calendar & Tasks)
            const ms = results.ms_graph?.data || {};
            const calendarEvents = ms.calendar?.events || ms.events || [];
            const msTasks = ms.tasks?.tasks || ms.tasks || [];

            if (calendarEvents.length > 0) {
                sections.push({ title: 'Anstehende Termine', type: 'calendar', data: calendarEvents });
            }
            if (msTasks.length > 0) {
                sections.push({ title: 'Deine Aufgaben', type: 'tasks', data: msTasks });
            }
            if (allMails.length > 0) {
                sections.push({ title: 'Neue Nachrichten', type: 'mails', data: allMails });
            }

            // Always set a persona text for sync requests
            text = "Guten Morgen! Hier ist dein aktueller Überblick für heute:";

            if (sections.length > 0) {
                // Add LLM Analysis for the mails if they exist
                if (allMails.length > 0) {
                    const analysisText = await this._analyzeMailContent(allMails);
                    text += "\n\n" + analysisText;
                } else {
                    text += "\n\nIch habe deine Postfächer geprüft: Es gibt aktuell keine neuen ungelesenen Nachrichten für dich.";
                }
            } else {
                // Check if there was an error that caused empty results
                const hasError = Object.values(results).some(r => r.success === false && !r.auth_required);
                if (hasError) {
                    const errors = Object.keys(results).filter(k => results[k].success === false && !results[k].auth_required);
                    text += `\n\nIch konnte heute leider nicht alle Daten abrufen (Fehler bei: ${errors.join(', ')}). Bitte versuche es später noch einmal oder prüfe die Server-Logs. 🛡️`;
                } else {
                    text += "\n\nEs ist alles ruhig! Ich konnte keine anstehenden Termine, offenen Aufgaben oder neuen Mails finden. Genieß deinen entspannten Tag! 🦾";
                }
            }

            ui_payload = {
                ui_type: 'routine_briefing',
                title: '🌅 Dein Morgen-Briefing',
                sections: sections.length > 0 ? sections : [{ title: 'Alles Erledigt', type: 'tasks', data: [{ title: 'Keine anstehenden Aufgaben' }] }],
                footer: 'Einen erfolgreichen Tag wünscht dir Sonia! 🦾'
            };
        }

        // 3. Fallback Synthesize (if not a routine sync)
        if (results.ms_graph?.data && (!ui_payload || ui_payload.ui_type !== 'routine_briefing')) {
            const ms = results.ms_graph.data;
            const events = ms.calendar?.events || ms.events;
            const tasks = ms.tasks?.tasks || ms.tasks;

            if (events && Array.isArray(events)) {
                text += `Du hast ${events.length} anstehende Termine. `;
                if (!ui_payload) {
                    ui_payload = {
                        ui_type: 'calendar_list',
                        title: '📅 Kalender (Anstehend)',
                        events: events
                    };
                }
            }
            if (tasks && Array.isArray(tasks)) {
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

    /**
     * Internal helper to extract appointment details via LLM
     */
    async _extractAppointmentDetails(text) {
        try {
            const { output } = await ai.generate({
                prompt: `Extrahiere Termindetails aus dieser Nachricht: "${text}". 
                Heute ist der ${new Date().toISOString()}.
                Gib ein JSON Objekt zurück mit: subject (String), start (ISO String), end (ISO String, optional), location (String, optional), description (String, optional).
                Antworte NUR mit dem JSON Objekt.`,
                output: {
                    schema: z.object({
                        subject: z.string(),
                        start: z.string(),
                        end: z.string().optional(),
                        location: z.string().optional(),
                        description: z.string().optional()
                    })
                }
            });
            return output;
        } catch (e) {
            console.error('[Orchestrator] Extraction failed:', e);
            return null;
        }
    }

    /**
     * Internal helper to summarize mail content using LLM
     */
    async _analyzeMailContent(mails) {
        if (!mails || mails.length === 0) return "Keine neuen Nachrichten zur Analyse.";

        try {
            const mailSummaryInput = mails.slice(0, 10).map(m => `Von: ${m.from}\nBetreff: ${m.subject}\nInhalt: ${m.snippet}`).join('\n---\n');
            const { text } = await ai.generate({
                prompt: `Du bist Sonia, eine professionelle Assistentin. Analysiere diese Liste von E-Mails und fasse die wichtigsten 3-5 Punkte kurz zusammen. 
                Priorisiere Anfragen von Kunden oder dringende Termine. Antworte kurz und prägnant in Du-Form.
                
                E-Mails:
                ${mailSummaryInput}`,
            });
            return text;
        } catch (e) {
            console.error('[Orchestrator] Mail analysis failed:', e);
            return "Ich konnte die E-Mails zwar abrufen, aber die Zusammenfassung ist fehlgeschlagen.";
        }
    }
}

export default Orchestrator;
