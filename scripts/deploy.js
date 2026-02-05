import { execSync } from 'child_process';
import fetch from 'node-fetch';
import crypto from 'crypto';
import 'dotenv/config';

/**
 * Autonomous Deploy Script
 * 1. Merges current branch to master
 * 2. Pushes to GitHub
 * 3. Triggers Webhook on IONOS
 */
async function deploy() {
    const secret = process.env.DEPLOY_SECRET;
    const targetUrl = 'https://tb-assistant.nunc-it.com/api/deploy';
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();

    console.log(`🚀 Starting Autonomous Deployment from ${currentBranch}...`);

    try {
        // 1. Merge to master
        console.log('📦 Merging to master...');
        execSync('git checkout master');
        execSync(`git merge ${currentBranch} --no-edit`);

        // 2. Push to origin
        console.log('📤 Pushing to GitHub...');
        execSync('git push origin master');

        // 3. Trigger Webhook
        if (secret) {
            console.log('⚡ Triggering IONOS Webhook...');
            const payload = { deployed_by: 'Antigravity (Sonia)', timestamp: new Date().toISOString() };
            const bodyString = JSON.stringify(payload);
            const hmac = crypto.createHmac('sha256', secret);
            const signature = 'sha256=' + hmac.update(bodyString).digest('hex');

            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hub-signature-256': signature
                },
                body: bodyString
            });

            if (response.ok) {
                console.log('✅ Deployment successful on IONOS!');
            } else {
                const err = await response.text();
                console.error('❌ Webhook failed:', err);
            }
        }

        // Return to feature branch
        execSync(`git checkout ${currentBranch}`);
        console.log('🦾 Deployment sequence complete.');

    } catch (e) {
        console.error('❌ Deployment failed:', e.message);
        // Ensure we revert to the original branch
        try { execSync(`git checkout ${currentBranch}`); } catch (err) { }
        process.exit(1);
    }
}

deploy();
