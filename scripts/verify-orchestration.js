import 'dotenv/config';
import { BrainStorage } from '../src/storage/BrainStorage.js';
import Orchestrator from '../src/genkit/orchestrator/Orchestrator.js';
import AgentBase from '../src/genkit/agents/AgentBase.js';

async function verifyOrchestration() {
    console.log('🧪 Starting Orchestration Verification...');

    const storage = new BrainStorage({ storagePath: './data/test_brain' });
    const orchestrator = new Orchestrator(storage);

    // Mock Agent
    class MockAgent extends AgentBase {
        async run(task) {
            return { success: true, mocked: true, action: task.action };
        }
    }

    const mockGmail = new MockAgent('gmail', storage);
    orchestrator.registerAgent('gmail', mockGmail);

    console.log('👉 Processing request: "sync my mails"');
    const result = await orchestrator.processRequest({ message: 'sync my mails' });

    console.log('✅ Result:', JSON.stringify(result, null, 2));

    if (result.details.gmail && result.details.gmail.mocked) {
        console.log('🌟 PASS: Orchestrator successfully dispatched to Gmail Agent.');
    } else {
        console.error('❌ FAIL: Orchestrator failed to dispatch.');
    }
}

verifyOrchestration().catch(console.error);
