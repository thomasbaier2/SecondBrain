import 'dotenv/config';
import { Orchestrator } from '../src/genkit/orchestrator/Orchestrator.js';
import SessionLog from '../src/genkit/orchestrator/SessionLog.js';

async function simulateDaily() {
    const orchestrator = new Orchestrator({});
    const session = new SessionLog();

    // Simulate intent analysis step
    session.addStep('Orchestrator', 'intent_analyzed', { isSyncRequest: true });

    // Mocking EMPTY results to test the persona fallback fix
    const mockResults = {
        gmail: {
            success: true,
            data: { mails: [] }
        },
        ms_graph: {
            success: true,
            data: {
                calendar: { events: [] },
                tasks: [],
                mails: { mails: [] }
            }
        }
    };

    console.log('--- SIMULATING WEEKLY REVIEW REQUEST ---');
    const input = { message: 'zeig mir die ganze woche' };

    const analysis = await orchestrator._analyzeIntent(input.message);
    console.log('Analysis isSyncRequest:', analysis.isSyncRequest);

    // We bypass the actual execution and go straight to synthesis for the demo
    const response = await orchestrator._synthesizeResponse(input, mockResults, session);

    console.log('\nSONIAS ANTWORT:\n');
    console.log(response.text);
    console.log('\n--- END OF SIMULATION ---');
}

simulateDaily();
