import { ai } from '../config.js';
import { vectorStore } from '../rag/simpleVectorStore.js';
import { z } from 'zod';

/**
 * Flow to retrieve relevant documents from memory
 */
export const retrieveContext = ai.defineFlow({
    name: 'retrieveContext',
    inputSchema: z.object({
        query: z.string(),
        limit: z.number().optional()
    }),
    outputSchema: z.object({
        results: z.array(z.object({
            text: z.string(),
            score: z.number().optional()
        }))
    })
}, async (input) => {
    const results = await vectorStore.search(input.query, input.limit || 3);

    // Map results to schema (results are already flat objects in SimpleStore)
    const mapped = results.map(r => ({
        text: r.text,
        score: r.score
    }));

    return { results: mapped };
});
