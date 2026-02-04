import { ai } from '../config.js';
import { vectorStore } from '../rag/simpleVectorStore.js';
import { Persona } from '../persona.js';
import { z } from 'zod';

/**
 * Chat Flow
 * The main interface for talking to "Sonia".
 */
export const chatWithSecretary = ai.defineFlow({
    name: 'chatWithSecretary',
    inputSchema: z.object({
        message: z.string(),
        mood: z.enum(['neutral', 'happy', 'annoyed', 'stressed']).optional(),
        history: z.array(z.any()).optional() // Chat history
    }),
    outputSchema: z.any()
}, async (input) => {

    // 1. RAG Lookup
    const memories = await vectorStore.search(input.message, 3);
    const contextText = memories.map(m => `- ${m.text}`).join('\n');

    // 2. Real-time Task Context & Preferences
    const { BrainStorage } = await import('../../storage/BrainStorage.js');
    const storage = new BrainStorage({ storagePath: './data/brain' });
    const currentTasks = storage.getEisenhowerMatrix({ timeFilter: 'today' });
    const userPrefs = storage.getPreferences();

    // 3. Optional: Sync External Data (Morning Routine)
    let externalSyncData = '';
    const msg = input.message.toLowerCase();
    const isSyncRequest = msg.includes('sync') || msg.includes('routine') || msg.includes('morgen');

    // Check if we already synced today
    const lastSync = storage.data.preferences?.last_sync_date?.value;
    const todayStr = new Date().toLocaleDateString('de-DE');
    const alreadySyncedToday = lastSync === todayStr;

    if (isSyncRequest) {
        const { MockConnectors } = await import('../../connectors/MockConnectors.js');
        const [gmail, sf, ms] = await Promise.all([
            MockConnectors.syncGmail(),
            MockConnectors.syncSalesforce(),
            MockConnectors.syncMicrosoft()
        ]);

        // Save the fact that we synced today
        await storage.storeItem('preference', { key: 'last_sync_date', value: todayStr });

        externalSyncData = `
            FRESH EXTERNAL SYNC DATA:
            - GMAIL: ${JSON.stringify(gmail)}
            - SALESFORCE: ${JSON.stringify(sf)}
            - MICROSOFT: ${JSON.stringify(ms)}
        `;
    }

    const taskContext = currentTasks.map((t, i) => {
        const deadline = t.deadline_at ? new Date(t.deadline_at) : null;
        const dStr = deadline ? deadline.toLocaleDateString('de-DE') : 'Kein Datum';
        const tStr = deadline ? deadline.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : 'Keine Zeit';
        return `${i + 1}. [ID:${t.id}] ${t.title} (W:${t.importance_score}/D:${t.urgency_score}) - Termin: ${dStr} ${tStr}`;
    }).join('\n');

    // 4. Build Prompt
    const systemPrompt = Persona.getSystemPrompt({
        ragData: `${contextText}\n${externalSyncData}`,
        preferences: userPrefs,
        syncStatus: alreadySyncedToday ? `Du hast den Morning Sync heute am ${todayStr} bereits erfolgreich durchgeführt.` : 'Der Morning Sync wurde heute noch nicht durchgeführt.',
        goal: `Today's Tasks for A2UI:\n${taskContext || 'Keine Aufgaben für heute.'}`
    }, input.mood || 'neutral');

    // 5. Generate Response
    const response = await ai.generate({
        prompt: `
            ${systemPrompt}
            
            USER MESSAGE: "${input.message}"

            HINWEIS: Falls du Aufgaben nennst, nutze A2UI Karten. Falls du den Sync gemacht hast, nutze eine "routine_briefing" Tabelle.
        `,
        history: input.history,
    });

    let aiText = '';
    try {
        if (typeof response.text === 'function') {
            aiText = response.text();
        } else if (typeof response.text === 'string') {
            aiText = response.text;
        } else {
            aiText = response.output || response.content || JSON.stringify(response);
        }
    } catch (err) {
        console.error('[AI] Extraction error:', err.message);
        aiText = 'Fehler bei der Text-Extrahierung.';
    }

    return {
        text: aiText
    };
});
