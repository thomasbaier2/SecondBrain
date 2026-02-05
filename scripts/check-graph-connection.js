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
        try {
            console.log('📅 Rufe Kalender ab...');
            const now = new Date();
            const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Test 7 days
            console.log(`   Query: ${now.toISOString()} - ${end.toISOString()}`);
            const calendar = await agent.getCalendarEvents(client, 7);
            console.log(`   Erfolg: ${calendar.count} Termine gefunden.`);
        } catch (calErr) {
            console.error('❌ Fehler in Kalender-API:', calErr.message);
        }

        // Test Tasks
        try {
            console.log('\n✅ Rufe To-dos ab...');
            const listsRes = await client.api('/me/todo/lists').get();
            const lists = listsRes.value || [];
            console.log(`   Verfügbare Listen (${lists.length}): ${lists.map(l => l.displayName).join(', ')}`);

            console.log('   >>> Starte getToDoTasks...');
            const tasks = await agent.getToDoTasks(client);
            console.log(`   >>> getToDoTasks fertig. Ergebnis-Typ: ${typeof tasks}`);
            console.log(`   Erfolg: ${tasks.count} Aufgaben gefunden in Standard-Liste.`);
        } catch (taskErr) {
            console.error('❌ Fehler in To-do-API:', taskErr.message);
            console.error(taskErr);
        }

        // Test Mail
        try {
            console.log('\n📧 Rufe Outlook-Mails ab...');
            const mailDate = new Date();
            mailDate.setDate(mailDate.getDate() - 7);
            console.log(`   Query: newer than ${mailDate.toISOString()}`);
            const mails = await agent.getMails(client, 7);
            console.log(`   Erfolg: ${mails.count} Mails gefunden.`);
        } catch (mailErr) {
            console.error('❌ Fehler in Mail-API:', mailErr.message);
        }

        console.log('\n✨ Diagnose abgeschlossen.');
    } catch (e) {
        console.error('\n❌ ALLGEMEINER API-FEHLER:');
        console.error(e.message);
        if (e.body) console.error('Response Body:', e.body);
    }
}

checkConnection();
