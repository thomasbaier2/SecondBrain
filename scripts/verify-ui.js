import { chromium } from 'playwright-chromium';
import path from 'path';

async function verifyUI() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const artifactPath = 'C:/Users/thoma/.gemini/antigravity/brain/6129ff63-c712-4835-8ecb-601c1c7efd63/live_ui_audit.png';

    try {
        console.log('Navigating to http://localhost:3001...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

        console.log('Opening Dashboard...');
        await page.click('button[title="Dashboard"]');
        await page.waitForSelector('#matrix-container', { visible: true });

        // Add a small delay for animations
        await page.waitForTimeout(1000);

        console.log('Capturing Screenshot...');
        await page.screenshot({ path: artifactPath, fullPage: true });

        console.log(`Screenshot saved to: ${artifactPath}`);
    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        await browser.close();
    }
}

verifyUI();
