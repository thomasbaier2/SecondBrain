import crypto from 'crypto';
import 'dotenv/config';

// Use standard fetch if available (Node 18+), else polyfill
const fetch = globalThis.fetch;

async function debugDeploy() {
    const secret = process.env.DEPLOY_SECRET;
    const targetUrl = 'https://tb-assistant.nunc-it.com/api/deploy';

    console.log('⚡ Triggering IONOS Webhook for Debugging...');

    const payload = { deployed_by: 'Antigravity Debugger', timestamp: new Date().toISOString() };
    const bodyString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    const signature = 'sha256=' + hmac.update(bodyString).digest('hex');

    try {
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-hub-signature-256': signature
            },
            body: bodyString
        });

        const data = await response.json();
        console.log('\n--- SERVER RESPONSE ---');
        console.log('Status Code:', response.status);
        console.log('Body:', JSON.stringify(data, null, 2));
        console.log('-----------------------\n');

        if (data.success) {
            console.log('✅ Remote server claims success!');
        } else {
            console.error('❌ Remote server reported an error.');
        }
    } catch (e) {
        console.error('❌ Failed to connect to server:', e.message);
    }
}

debugDeploy();
