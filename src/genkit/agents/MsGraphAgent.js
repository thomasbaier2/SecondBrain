import * as msal from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import AgentBase from './AgentBase.js';
import fs from 'fs';
import path from 'path';

const DELEGATED_SCOPES = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "Tasks.ReadWrite", "Mail.Read"];
const TOKEN_FILE = './data/brain/ms_graph_token.json';

/**
 * MsGraphAgent - Second Brain 2.0
 * Cluster for handling Microsoft Graph integration (Calendar, To-Do).
 */
export class MsGraphAgent extends AgentBase {
    constructor(storage) {
        super('ms_graph', storage);

        const tenantId = (process.env.AZURE_TENANT_ID || '').trim();
        this.config = {
            auth: {
                clientId: (process.env.AZURE_CLIENT_ID || '').trim(),
                authority: `https://login.microsoftonline.com/${tenantId || 'common'}`,
                clientSecret: (process.env.AZURE_CLIENT_SECRET || '').trim(),
            }
        };

        console.log('[MsGraph] Agent Context:', {
            hasClientId: !!this.config.auth.clientId,
            clientIdMask: this.config.auth.clientId ? (this.config.auth.clientId.substring(0, 5) + '...') : 'N/A',
            authority: this.config.auth.authority,
            hasClientSecret: !!this.config.auth.clientSecret
        });

        this.pca = new msal.PublicClientApplication({
            auth: {
                clientId: this.config.auth.clientId,
                authority: this.config.auth.authority,
            }
        });

        this.client = null;
    }

    /**
     * Get authenticated Graph client using cached token or Device Code Flow
     */
    async getAuth() {
        // 1. Try cached token
        const cached = this._loadToken();
        if (cached && cached.accessToken && cached.expiresOn > Date.now() / 1000) {
            return Client.init({
                authProvider: (done) => done(null, cached.accessToken),
            });
        }

        // 2. Try refresh token
        if (cached && cached.refreshToken) {
            const refreshed = await this._refreshToken(cached.refreshToken);
            if (refreshed) {
                this._saveToken(refreshed);
                return Client.init({
                    authProvider: (done) => done(null, refreshed.accessToken),
                });
            }
        }

        // 3. No valid token - return null (need Device Code login)
        return null;
    }

    /**
     * Main execution entry
     */
    async run(task) {
        this._log('run_start', task);

        try {
            if (task.action === 'get_auth_url') {
                const urlData = await this.startDeviceCodeFlow();
                return this.success(urlData);
            }

            const client = await this.getAuth();
            if (!client) {
                return this.authRequired('Sonia braucht Zugriff auf dein Microsoft-Konto für Kalender und Aufgaben.');
            }

            let resultData;
            switch (task.action) {
                case 'get_calendar':
                    resultData = await this.getCalendarEvents(client, task.days || 7);
                    break;
                case 'get_tasks':
                    resultData = await this.getToDoTasks(client);
                    break;
                case 'get_mails':
                    resultData = await this.getMails(client, task.days || 14);
                    break;
                case 'basic_review':
                    resultData = await this.basicReview(client, task.days || 14);
                    break;
                case 'create_event':
                    resultData = await this.createCalendarEvent(client, task.details);
                    break;
                default:
                    return this.error(`Unknown action: ${task.action}`);
            }
            return this.success(resultData);
        } catch (e) {
            this._log('run_error', e.message, 'error');
            return this.error(e.message);
        }
    }

    /**
     * Create a calendar event
     */
    async createCalendarEvent(client, details) {
        if (!details || !details.subject || !details.start) {
            throw new Error('Fehlende Details für die Terminerstellung (Betreff, Startzeit).');
        }

        const event = {
            subject: details.subject,
            body: {
                contentType: 'HTML',
                content: details.description || '',
            },
            start: {
                dateTime: details.start,
                timeZone: 'Europe/Berlin',
            },
            end: {
                dateTime: details.end || details.start, // Fallback to start if no end
                timeZone: 'Europe/Berlin',
            },
            location: {
                displayName: details.location || '',
            },
            isOnlineMeeting: details.isOnline || false,
        };

        const result = await client.api('/me/events').post(event);

        this._log('event_created', { id: result.id });
        return {
            success: true,
            event_id: result.id,
            webLink: result.webLink,
            summary: `Termin "${details.subject}" am ${new Date(details.start).toLocaleString()} wurde angelegt.`
        };
    }

    /**
     * Start Device Code Flow for user login
     */
    async startDeviceCodeFlow() {
        return new Promise((resolve, reject) => {
            const deviceCodeRequest = {
                deviceCodeCallback: (response) => {
                    console.log('[MsGraph] Device Code Raw Response:', JSON.stringify(response, null, 2));
                    this._log('device_code', { code: response.userCode, url: response.verificationUri || response.verificationUrl });
                    resolve({
                        code: response.userCode,
                        url: response.verificationUri || response.verificationUrl,
                        message: response.message,
                    });
                },
                scopes: [...DELEGATED_SCOPES, 'offline_access'],
            };

            console.log('[MsGraph] Invoking acquireTokenByDeviceCode...');
            this.pca.acquireTokenByDeviceCode(deviceCodeRequest)
                .then((response) => {
                    const tokenData = {
                        accessToken: response.accessToken,
                        refreshToken: response.refreshToken,
                        expiresOn: Math.floor(response.expiresOn.getTime() / 1000),
                        account: response.account?.username,
                    };
                    this._saveToken(tokenData);
                    this._log('auth_success', { account: tokenData.account });
                })
                .catch((err) => {
                    this._log('auth_error', err.message);
                });
        });
    }

    /**
     * Handle callback after Device Code login (store token)
     */
    async handleCallback(tokenData) {
        this._saveToken(tokenData);
        return tokenData;
    }

    /**
     * Get calendar events for the next N days
     */
    async getCalendarEvents(client, days = 7) {
        const now = new Date();
        const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        const result = await client.api('/me/calendarView')
            .query({
                startDateTime: now.toISOString(),
                endDateTime: end.toISOString(),
            })
            .select('subject,start,end,location,isOnlineMeeting')
            .orderby('start/dateTime')
            .top(20)
            .get();

        const events = (result.value || []).map(e => ({
            id: e.id,
            subject: e.subject,
            start: e.start?.dateTime,
            end: e.end?.dateTime,
            location: e.location?.displayName,
            isOnline: e.isOnlineMeeting,
        }));

        this._log('calendar_fetched', { count: events.length });
        return { count: events.length, events };
    }

    /**
     * Get To-Do tasks
     */
    async getToDoTasks(client) {
        // Get all lists
        const listsRes = await client.api('/me/todo/lists').get();
        const lists = listsRes.value || [];

        // Strategy: 1. wellKnownName default, 2. DisplayName match, 3. Non-empty list, 4. First list
        let targetList = lists.find(l => l.wellKnownName === 'defaultList');

        if (!targetList) {
            targetList = lists.find(l => l.displayName === 'Aufgaben' || l.displayName === 'Tasks');
        }

        if (!targetList) {
            targetList = lists[0];
        }

        if (!targetList) {
            return { count: 0, tasks: [], message: 'Keine To-Do Liste gefunden.' };
        }

        if (!targetList.id) {
            console.error('[MsGraph] FEHLER: Gewählte Liste hat keine ID!', targetList);
            return { count: 0, tasks: [], message: 'Fehler: Liste ohne ID.' };
        }

        console.log(`[MsGraph] Lade Aufgaben aus Liste: "${targetList.displayName}" (ID: ${targetList.id})`);
        this._log('tasks_list_selected', { name: targetList.displayName, id: targetList.id });

        const tasksRes = await client.api(`/me/todo/lists/${targetList.id}/tasks`)
            .filter("status ne 'completed'")
            .select('title,status,dueDateTime,importance')
            .top(20)
            .get();

        const tasks = (tasksRes.value || []).map(t => ({
            id: t.id,
            title: t.title,
            status: t.status,
            dueDate: t.dueDateTime?.dateTime,
            importance: t.importance,
        }));

        this._log('tasks_fetched', { count: tasks.length });
        return { count: tasks.length, tasks };
    }

    /**
     * Get Mails for the last N days
     */
    async getMails(client, days = 14) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        const dateString = date.toISOString();

        const result = await client.api('/me/messages')
            .filter(`receivedDateTime ge ${dateString}`)
            .select('id,subject,from,receivedDateTime,bodyPreview')
            .orderby('receivedDateTime desc')
            .top(20)
            .get();

        const mails = (result.value || []).map(m => ({
            id: m.id,
            subject: m.subject,
            from: m.from?.emailAddress?.name || m.from?.emailAddress?.address || 'Unbekannt',
            date: m.receivedDateTime,
            snippet: m.bodyPreview,
            source: 'outlook'
        }));

        this._log('mails_fetched', { count: mails.length });
        return { count: mails.length, mails };
    }

    /**
     * Basic review: Calendar + Tasks + Mails combined
     */
    async basicReview(client, days = 14) {
        const calendar = await this.getCalendarEvents(client, days);
        const tasks = await this.getToDoTasks(client);
        const mails = await this.getMails(client, days);

        return {
            summary: `📅 ${calendar.count} Termine | ✅ ${tasks.count} Aufgaben | 📧 ${mails.count} Outlook Mails`,
            calendar,
            tasks,
            mails,
        };
    }

    // Token persistence helpers
    _loadToken() {
        try {
            if (fs.existsSync(TOKEN_FILE)) {
                return JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
            }
        } catch (e) { }
        return null;
    }

    _saveToken(data) {
        try {
            const dir = path.dirname(TOKEN_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(TOKEN_FILE, JSON.stringify(data, null, 2));
        } catch (e) {
            this._log('token_save_error', e.message);
        }
    }

    async _refreshToken(refreshToken) {
        const url = `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
        const body = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: process.env.AZURE_CLIENT_ID,
            refresh_token: refreshToken,
            scope: [...DELEGATED_SCOPES, 'offline_access'].join(' '),
        });

        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: body.toString(),
            });

            if (!res.ok) return null;

            const json = await res.json();
            return {
                accessToken: json.access_token,
                refreshToken: json.refresh_token || refreshToken,
                expiresOn: Math.floor(Date.now() / 1000) + (json.expires_in || 3600),
            };
        } catch (e) {
            return null;
        }
    }
}

export default MsGraphAgent;
