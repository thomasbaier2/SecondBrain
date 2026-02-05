import 'dotenv/config';
import fs from 'fs';
import { MsGraphAgent } from '../src/genkit/agents/MsGraphAgent.js';

async function checkConnection() {
    console.log('🛡️  Sonia MS Graph Connection Audit\n');

    const TOKEN_FILE = './data/brain/ms_graph_token.json';

    // 1. Check Token File
    if (!fs.existsSync(TOKEN_FILE)) {
        console.error('❌ FEHLER: ms_graph_token.json fehlt im Verzeichnis ./data/brain/');
        console.log('👉 Bitte führe einen Login-Versuch über die UI durch.');
        return;
    }

    const token = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    console.log('✅ Token-Datei gefunden.');
    console.log(`👤 Account: ${token.account || 'Unbekannt'}`);
    console.log(`📅 Läuft ab: ${new Date(token.expiresOn * 1000).toLocaleString()}`);

    if (token.expiresOn < Date.now() / 1000) {
        console.warn('⚠️  Token ist abgelaufen. Versuche Refresh...');
    }

    // 2. Initialize Agent
    const agent = new MsGraphAgent({ data: { preferences: {} } });

    try {
        console.log('\n📡 Teste API-Verbindung...');
        const client = await agent.getAuth();

        if (!client) {
            console.error('❌ Auth-Client konnte nicht initialisiert werden.');
            return;
        }

        // Test Calendar
        console.log('📅 Rufe Kalender ab...');
        const calendar = await agent.getCalendarEvents(client, 1);
        console.log(`   Erfolg: ${calendar.count} Termine gefunden.`);

        // Test Tasks
        console.log('✅ Rufe To-dos ab...');
        const tasks = await agent.getToDoTasks(client);
        console.log(`   Erfolg: ${tasks.count} Aufgaben gefunden.`);

        // Test Mail
        console.log('📧 Rufe Outlook-Mails ab...');
        const mails = await agent.getMails(client, 1);
        console.log(`   Erfolg: ${mails.count} Mails gefunden.`);

        console.log('\n✨ Diagnose abgeschlossen. Die Brücke steht!');
    } catch (e) {
        console.error('\n❌ API-FEHLER während der Diagnose:');
        console.error(e.message);
        if (e.message.includes('403')) {
            console.log('👉 Berechtigungsfehler (Scopes). Prüfe die Azure App Registration.');
        }
    }
}

checkConnection();
