import { google } from 'googleapis';
import AgentBase from './AgentBase.js';

/**
 * GmailAgent - Second Brain 2.0
 * Cluster for handling Google Mail integration.
 */
export class GmailAgent extends AgentBase {
    constructor(storage) {
        super('gmail', storage);
    }

    /**
     * Get the active auth client (OAuth2 for personal accounts)
     */
    async getAuth() {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const tokens = this.storage.data.preferences?.gmail_tokens?.value;
        if (tokens) {
            oauth2Client.setCredentials(tokens);
            return oauth2Client;
        }

        return null;
    }

    /**
     * Main execution entry
     */
    async run(task) {
        this._log('run_start', task);

        if (task.action === 'get_auth_url') {
            return this.getAuthUrl();
        }

        const auth = await this.getAuth();
        if (!auth) {
            throw new Error('Gmail not authenticated. Please visit /api/auth/google/login');
        }

        switch (task.action) {
            case 'sync_eisenhauer':
                return this.syncEisenhauerMails(auth);
            default:
                throw new Error(`Unknown action: ${task.action}`);
        }
    }

    /**
     * Generate the OAuth login URL
     */
    getAuthUrl() {
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            process.env.GOOGLE_REDIRECT_URI
        );

        const scopes = [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify'
        ];

        const url = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: scopes,
            prompt: 'consent'
        });

        this._log('get_auth_url', url);
        return { url };
    }

    /**
     * Handle the callback and exchange code for tokens
     */
    async handleCallback(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);

        // Save tokens to storage
        await this.storage.storeItem('preference', {
            key: 'gmail_tokens',
            value: tokens
        });

        this._log('auth_success', tokens);
        return tokens;
    }

    /**
     * Sync logic for "Eisenhauer" mails
     */
    async syncEisenhauerMails(auth) {
        const gmail = google.gmail({ version: 'v1', auth });

        // 1. Find the label "Eisenhauer"
        const labelsRes = await gmail.users.labels.list({ userId: 'me' });
        const label = labelsRes.data.labels.find(l => l.name.toLowerCase() === 'eisenhauer');

        if (!label) {
            this._log('sync_skipped', 'Label "Eisenhauer" not found in Gmail');
            return { count: 0, message: 'Label "Eisenhauer" existiert nicht.' };
        }

        // 2. List messages with this label
        const res = await gmail.users.messages.list({
            userId: 'me',
            labelIds: [label.id],
            q: 'is:unread' // Only sync unread ones? Or all? Let's go with unread for now.
        });

        const messages = res.data.messages || [];
        const tasksAdded = [];

        for (const msgInfo of messages) {
            const msg = await gmail.users.messages.get({ userId: 'me', id: msgInfo.id });
            const subject = msg.data.payload.headers.find(h => h.name === 'Subject')?.value || 'Kein Betreff';
            const from = msg.data.payload.headers.find(h => h.name === 'From')?.value || 'Unbekannt';
            const snippet = msg.data.snippet;

            // Simple Task Extraction (could be improved by calling an LLM cluster here)
            const task = {
                title: `Mail: ${subject}`,
                description: `Von: ${from}\n\n${snippet}`,
                importance_score: 7,
                urgency_score: 5,
                source: 'gmail',
                external_id: msgInfo.id
            };

            await this.storage.addTask(task);

            // Mark as read or remove label if desired? 
            // For now, let's keep it simple.
            tasksAdded.push(task);
        }

        this._log('sync_complete', { count: tasksAdded.length });
        return { count: tasksAdded.length, tasks: tasksAdded };
    }
}

export default GmailAgent;
