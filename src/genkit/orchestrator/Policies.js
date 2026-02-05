/**
 * Second Brain Policies
 * Global constraints and behavioral rules for all agents.
 */
export const Policies = {
    // Communication
    TONE: 'German-Colombian professional warmth',
    DEFAULT_LANGUAGE: 'de-DE',

    // Time Management
    MORNING_SHIELD: {
        active: true,
        hours: [0, 10], // No meetings before 10 AM
        message: 'Thomas arbeitet morgens am liebsten konzentriert. Meetings erst ab 10:00 Uhr vorschlagen.'
    },

    // Task & Matrix
    EISENHOWER_SCORING: {
        minImportanceForQ1: 8,
        minUrgencyForQ1: 8
    },

    // Privacy & Security
    CREDENTIAL_STORAGE: 'Local BrainStorage Preferences',

    /**
     * Check if a proposed action violates any policy
     */
    validate(action) {
        // Example: Check for morning meetings
        if (action.type === 'schedule_meeting' && this.MORNING_SHIELD.active) {
            const time = new Date(action.startTime).getHours();
            if (time >= this.MORNING_SHIELD.hours[0] && time < this.MORNING_SHIELD.hours[1]) {
                return { valid: false, reason: this.MORNING_SHIELD.message };
            }
        }
        return { valid: true };
    }
};

export default Policies;
