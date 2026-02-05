import { expect } from 'chai';
import { Orchestrator } from '../src/genkit/orchestrator/Orchestrator.js';
import SessionLog from '../src/genkit/orchestrator/SessionLog.js';

describe('Orchestrator Wiring Audit 🕵️‍♂️', () => {
    let orchestrator;

    beforeEach(() => {
        orchestrator = new Orchestrator({});
    });

    it('should correctly extract and display Outlook Mails from MS Graph output', async () => {
        const session = new SessionLog();
        session.addStep('Orchestrator', 'intent_analyzed', { isSyncRequest: true });

        // Expected output from MsGraphAgent.basicReview (Wrapped results)
        const msGraphResult = {
            success: true,
            data: {
                summary: "📅 1 Termine | ✅ 1 Aufgaben | 📧 1 Outlook Mails",
                calendar: {
                    count: 1,
                    events: [{ subject: 'Test Event', start: '2026-02-05T10:00:00Z' }]
                },
                tasks: {
                    count: 1,
                    tasks: [{ title: 'Test Task', status: 'notStarted' }]
                },
                mails: {
                    count: 1,
                    mails: [{ from: 'Tester', subject: 'Outlook Mail Test', snippet: 'This is a test snippet' }]
                }
            }
        };

        const results = {
            ms_graph: msGraphResult,
            gmail: { success: true, data: { count: 0, mails: [] } }
        };

        const response = await orchestrator._synthesizeResponse(
            { message: 'sync' },
            results,
            session
        );

        // Check payload structure
        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
        const payload = JSON.parse(jsonMatch[1]);

        const mailSection = payload.sections.find(s => s.type === 'mails');
        const taskSection = payload.sections.find(s => s.type === 'tasks');

        expect(mailSection.data).to.have.lengthOf(1);
        expect(taskSection.data).to.have.lengthOf(1);
        expect(taskSection.data[0].title).to.equal('Test Task');
    });

    it('should handle Gmail results (array-style) correctly', async () => {
        const session = new SessionLog();
        session.addStep('Orchestrator', 'intent_analyzed', { isSyncRequest: true });

        const results = {
            gmail: {
                success: true,
                data: {
                    count: 1,
                    mails: [{ from: 'Google', subject: 'Gmail Test', snippet: 'Hello from Gmail' }]
                }
            }
        };

        const response = await orchestrator._synthesizeResponse(
            { message: 'sync' },
            results,
            session
        );

        const jsonMatch = response.text.match(/```json\n([\s\S]*?)\n```/);
        const payload = JSON.parse(jsonMatch[1]);
        const mailSection = payload.sections.find(s => s.type === 'mails');

        expect(mailSection.data).to.have.lengthOf(1);
        expect(mailSection.data[0].subject).to.equal('Gmail Test');
    });

    it('should report agent errors in the sync briefing instead of staying quiet', async () => {
        const session = new SessionLog();
        session.addStep('Orchestrator', 'intent_analyzed', { isSyncRequest: true });

        const results = {
            gmail: { success: true, data: { count: 0, mails: [] } },
            ms_graph: { success: false, error: 'API Timeout' }
        };

        const response = await orchestrator._synthesizeResponse(
            { message: 'sync' },
            results,
            session
        );

        expect(response.text).to.contain('Ich konnte heute leider nicht alle Daten abrufen');
        expect(response.text).to.contain('Fehler bei: ms_graph');
    });
});
