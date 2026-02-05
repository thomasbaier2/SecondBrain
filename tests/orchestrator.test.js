import { expect } from 'chai';
import Orchestrator from '../src/genkit/orchestrator/Orchestrator.js';

// Mock Agent
class MockAgent {
    constructor(domain) {
        this.domain = domain;
    }
    async run(task) {
        if (task.action === 'error') return { success: false, error: 'Mock Error', auth_required: false };
        if (task.action === 'auth') return { success: false, error: 'Auth required', auth_required: true };
        return { success: true, data: { mails: [] }, auth_required: false };
    }
}

// Mock Session
class MockSession {
    constructor() {
        this.steps = [];
    }
    addStep(agent, status, details) {
        this.steps.push({ agent, status, details });
    }
    getSummary() {
        return "Mock Summary";
    }
}

describe('Orchestrator Unit Tests', () => {
    let orchestrator;
    let session;

    beforeEach(() => {
        orchestrator = new Orchestrator();
        orchestrator.registerAgent('gmail', new MockAgent('gmail'));
        orchestrator.registerAgent('ms_graph', new MockAgent('ms_graph'));
        session = new MockSession();
    });

    describe('Intent Analysis', () => {
        it('should correctly identify gmail domain for "sync" request', async () => {
            const analysis = await orchestrator._analyzeIntent('bitte sync machen');
            expect(analysis.domains).to.include('gmail');
            expect(analysis.isSyncRequest).to.be.true;
        });

        it('should identify ms_graph for calendar requests', async () => {
            const analysis = await orchestrator._analyzeIntent('was steht im kalender?');
            expect(analysis.domains).to.include('ms_graph');
        });
    });

    describe('Response Synthesis', () => {
        it('should return auth_redirect when ms_graph is not authenticated', async () => {
            const results = {
                ms_graph: { success: false, auth_required: true, error: 'Auth required' }
            };
            const synthesis = await orchestrator._synthesizeResponse({ message: 'test' }, results, session);
            expect(synthesis.ui_payload.ui_type).to.equal('auth_redirect');
        });

        it('should provide fallback text if no agents return data', async () => {
            const results = {};
            const synthesis = await orchestrator._synthesizeResponse({ message: 'hallo' }, results, session);
            expect(synthesis.text).to.contain('Analyse abgeschlossen');
        });
    });
});
