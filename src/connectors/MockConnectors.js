/**
 * Mock Connectors for Sonia
 * Simulates external business tool integrations.
 */
export const MockConnectors = {
    /**
     * Gmail Sync: Fetch emails marked with Eisenhower-Label or Star
     */
    async syncGmail() {
        console.log('[Mock] Gmail Syncing...');
        return [
            { id: 'gm1', sender: 'Investment Bank', subject: 'Budget approval required', date: '2026-02-03', importance: 9 },
            { id: 'gm2', sender: 'HR Dept', subject: 'New Hire Onboarding', date: '2026-02-04', importance: 5 }
        ];
    },

    /**
     * Salesforce Sync: Fetch high-value Opportunities
     */
    async syncSalesforce() {
        console.log('[Mock] Salesforce Syncing...');
        return [
            { id: 'sf1', account: 'Solar Tech AG', value: '250.000€', stage: 'Negotiation', probability: '80%' },
            { id: 'sf2', account: 'Wind Power Corp', value: '110.000€', stage: 'Closing', probability: '60%' }
        ];
    },

    /**
     * Microsoft Sync: Fetch Outstandings Tasks/Events
     */
    async syncMicrosoft() {
        console.log('[Mock] Microsoft Syncing...');
        return [
            { id: 'ms1', source: 'Teams', task: 'Review Project Delta Docs', due: '2026-02-04 18:00' },
            { id: 'ms2', source: 'Outlook', task: 'Reply to CEO message', due: '2026-02-05' }
        ];
    }
};

export default MockConnectors;
