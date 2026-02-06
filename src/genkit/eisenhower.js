/**
 * Eisenhower Matrix Classification Logic
 * Core logic for classifying and prioritizing tasks based on Urgency and Importance.
 */

const URGENT_KEYWORDS = ["urgent", "asap", "today", "deadline", "blocking"];
const IMPORTANT_KEYWORDS = ["ceo", "contract", "invoice", "security", "client", "production"];

/**
 * Checks if a string contains any of the keywords (case-insensitive)
 * @param {string} text 
 * @param {string[]} keywords 
 * @returns {boolean}
 */
function hasKeyword(text, keywords) {
    if (!text) return false;
    const lowerText = text.toLowerCase();
    return keywords.some(kw => lowerText.includes(kw));
}

/**
 * Classifies an item into an Eisenhower Quadrant.
 * @param {import('../connectors/ExecutiveMockData').InboxItem} item 
 * @returns {{ quadrant: 1|2|3|4, urgent: boolean, important: boolean }}
 */
export function classifyEisenhower(item) {
    // Collect all searchable text
    const textContent = [
        item.title,
        item.body,
        ...(item.labels || [])
    ].join(' ');

    const urgent = hasKeyword(textContent, URGENT_KEYWORDS);
    const important = hasKeyword(textContent, IMPORTANT_KEYWORDS);

    let quadrant = 4;
    if (urgent && important) {
        quadrant = 1; // Do First
    } else if (!urgent && important) {
        quadrant = 2; // Schedule
    } else if (urgent && !important) {
        quadrant = 3; // Delegate
    } else {
        quadrant = 4; // Don't Do
    }

    return { quadrant, urgent, important };
}

/**
 * Prioritizes items based on Eisenhower Quadrant and then Timestamp (descending).
 * Returns a NEW array, does not mutate original.
 * @param {import('../connectors/ExecutiveMockData').InboxItem[]} items 
 * @returns {import('../connectors/ExecutiveMockData').InboxItem[]}
 */
export function prioritizeItems(items) {
    // Clone and map to include classification for sorting, then act on original objects if needed, 
    // or just sort the clone. Here we'll sort a shallow copy.
    const sortedDetails = items.map(item => {
        const { quadrant } = classifyEisenhower(item);
        return { item, quadrant };
    });

    sortedDetails.sort((a, b) => {
        // 1. Sort by Quadrant ASC (1 is highest priority)
        if (a.quadrant !== b.quadrant) {
            return a.quadrant - b.quadrant;
        }
        // 2. Sort by Timestamp DESC (newest first)
        const timeA = new Date(a.item.timestamp).getTime();
        const timeB = new Date(b.item.timestamp).getTime();
        return timeB - timeA;
    });

    return sortedDetails.map(d => d.item);
}
