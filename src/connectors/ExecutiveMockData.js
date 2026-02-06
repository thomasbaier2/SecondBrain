/**
 * @typedef {Object} InboxItem
 * @property {string} id
 * @property {"gmail" | "ms365" | "calendar" | "tasks"} source
 * @property {"email" | "meeting" | "task"} kind
 * @property {string} title
 * @property {string} body
 * @property {string} timestamp
 * @property {string} from
 * @property {string[]} to
 * @property {string[]} labels
 * @property {Object} meta
 */

/**
 * Returns a list of mock inbox items.
 * @returns {InboxItem[]}
 */
export function getMockInboxItems() {
    return [
        // Emails
        {
            id: 'email-001',
            source: 'gmail',
            kind: 'email',
            title: 'URGENT: Executive Board requires approval',
            body: 'Immediate attention required for Q1 budget approval. Deadline is EOD today.',
            timestamp: '2026-02-06T08:00:00Z',
            from: 'ceo@company.com',
            to: ['me@company.com'],
            labels: ['urgent', 'executive'],
            meta: { threadId: 'th-001' }
        },
        {
            id: 'email-002',
            source: 'ms365',
            kind: 'email',
            title: 'Weekly Newsletter Update',
            body: 'Just a summary of low priority interesting articles.',
            timestamp: '2026-02-06T09:30:00Z',
            from: 'newsletter@industry.com',
            to: ['me@company.com'],
            labels: ['newsletter', 'low-priority'],
            meta: {}
        },
        {
            id: 'email-003',
            source: 'gmail',
            kind: 'email',
            title: 'Project Alpha Sync',
            body: 'Let\'s catch up on the latest milestones next week.',
            timestamp: '2026-02-05T14:00:00Z',
            from: 'pm@company.com',
            to: ['me@company.com'],
            labels: ['project-alpha'],
            meta: { threadId: 'th-003' }
        },

        // Meetings
        {
            id: 'mtg-001',
            source: 'calendar',
            kind: 'meeting',
            title: 'Q1 Strategy Review',
            body: 'Reviewing the strategic roadmap for the quarter.',
            timestamp: '2026-02-10T10:00:00Z',
            from: 'cfo@company.com',
            to: ['me@company.com', 'leadership@company.com'],
            labels: ['strategy'],
            meta: { location: 'Boardroom A' }
        },
        {
            id: 'mtg-002',
            source: 'calendar',
            kind: 'meeting',
            title: 'Coffee Chat',
            body: 'Casual catch up.',
            timestamp: '2026-02-12T15:00:00Z',
            from: 'colleague@company.com',
            to: ['me@company.com'],
            labels: ['personal'],
            meta: { location: 'Cafeteria' }
        },

        // Tasks
        {
            id: 'task-001',
            source: 'tasks',
            kind: 'task',
            title: 'Prepare Board Deck',
            body: 'Finalize slides for the board meeting tomorrow.',
            timestamp: '2026-02-06T18:00:00Z',
            from: 'tasks-app',
            to: ['me@company.com'],
            labels: ['high-priority'],
            meta: { status: 'in-progress' }
        },
        {
            id: 'task-002',
            source: 'tasks',
            kind: 'task',
            title: 'Update Outlook Signature',
            body: 'Change title in email signature.',
            timestamp: '2026-02-20T17:00:00Z',
            from: 'tasks-app',
            to: ['me@company.com'],
            labels: ['admin'],
            meta: { status: 'todo' }
        },
        {
            id: 'task-003',
            source: 'tasks',
            kind: 'task',
            title: 'Order Team Lunch',
            body: 'Get pizza for Friday.',
            timestamp: '2026-02-07T11:00:00Z',
            from: 'tasks-app',
            to: ['me@company.com'],
            labels: ['team-joy'],
            meta: { status: 'todo' }
        }
    ];
}
