import { ai } from '../config.js';
import { vectorStore } from '../rag/simpleVectorStore.js';
import { z } from 'zod';

/**
 * Flow to index a document into the Brain's memory
 */
export const indexDocument = ai.defineFlow({
    name: 'indexDocument',
    inputSchema: z.object({
        text: z.string(),
        source: z.string().optional()
    }),
    outputSchema: z.object({
        success: z.boolean()
    })
}, async (input) => {
    await vectorStore.indexDocument(input.text, { source: input.source || 'user' });
    return { success: true };
});
