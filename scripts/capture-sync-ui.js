import { chromium } from 'playwright-chromium';
import path from 'path';

async function captureSyncUI() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 1000 }
    });
    const artifactPath = 'C:/Users/thoma/.gemini/antigravity/brain/6129ff63-c712-4835-8ecb-601c1c7efd63/sonia_sync_briefing.png';

    try {
        console.log('Navigating to http://localhost:3001...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });

        console.log('Injecting Mock Sonia Response...');
        await page.evaluate(() => {
            const mockPayload = {
                ui_type: 'routine_briefing',
                title: '🌅 Dein Morgen-Briefing',
                sections: [
                    {
                        title: 'Anstehende Termine',
                        type: 'calendar',
                        data: [
                            { subject: 'Projekt Meeting', start: new Date().toISOString() },
                            { subject: 'Status Call', start: new Date(Date.now() + 3600000).toISOString() }
                        ]
                    },
                    {
                        title: 'Deine Aufgaben',
                        type: 'tasks',
                        data: [
                            { title: 'Rechnung prüfen', status: 'notStarted' },
                            { title: 'E-Mail an Thomas', status: 'notStarted' }
                        ]
                    },
                    {
                        title: 'Neue Nachrichten',
                        type: 'mails',
                        data: [
                            { from: 'Kunde X', subject: 'Dringende Anfrage', source: 'gmail' },
                            { from: 'HR Portal', subject: 'Gehaltsabrechnung verfügbar', source: 'outlook' }
                        ]
                    }
                ],
                footer: 'Einen erfolgreichen Tag wünscht dir Sonia! 🦾'
            };

            window.addMessage("Guten Morgen! Hier ist dein aktueller Überblick für heute:\n\nIch habe deine Mails analysiert: Kunde X hat eine dringende Anfrage geschickt, die wir priorisieren sollten. Außerdem gibt es Neuigkeiten im HR Portal.", 'bot', mockPayload);
        });

        // Small delay for rendering
        await page.waitForTimeout(1000);

        console.log('Capturing Screenshot...');
        // Focus on the chat container
        const chatElement = await page.$('#chat-history');
        if (chatElement) {
            await chatElement.screenshot({ path: artifactPath });
        } else {
            await page.screenshot({ path: artifactPath, fullPage: true });
        }

        console.log(`Screenshot saved to: ${artifactPath}`);
    } catch (e) {
        console.error('Capture failed:', e);
    } finally {
        await browser.close();
    }
}

captureSyncUI();
