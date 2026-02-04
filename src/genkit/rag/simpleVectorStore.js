import fs from 'fs';
import path from 'path';
import { ai } from '../config.js';

/**
 * Simple Vector Store
 * A file-based, in-memory vector store for RAG.
 * Stores vectors in a JSON file. Use for datasets < 10k items.
 */
export class SimpleVectorStore {
    constructor() {
        this.filePath = path.join(process.cwd(), 'data', 'memory.json');
        this.data = [];
        this.load();
    }

    load() {
        if (fs.existsSync(this.filePath)) {
            try {
                this.data = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
                console.log(`[Memory] Loaded ${this.data.length} memories.`);
            } catch (e) {
                console.error('[Memory] Failed to load memory:', e);
                this.data = [];
            }
        } else {
            // Ensure directory exists
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        }
    }

    save() {
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }

    async indexDocument(text, metadata = {}) {
        // Embed
        const embedResponse = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: text
        });

        // Genkit returns an array of results, each with an embedding
        const embedding = embedResponse[0].embedding;

        console.log(`[Memory] Indexing. Vector Length: ${embedding?.length || 'N/A'}`);

        // Store
        this.data.push({
            embedding: Array.from(embedding),
            text,
            ...metadata,
            timestamp: Date.now()
        });

        this.save();
    }

    async search(query, limit = 3) {
        // Embed Query
        const embedResponse = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: query
        });

        const queryVectorRaw = embedResponse[0]?.embedding || embedResponse.embedding || embedResponse;

        console.log(`[Memory] Search query embedding extraction. Type: ${typeof queryVectorRaw}, IsArray: ${Array.isArray(queryVectorRaw)}`);

        let queryVector = queryVectorRaw;
        // If it's still an array of length 1, look deeper
        if (Array.isArray(queryVector) && queryVector.length === 1 && typeof queryVector[0] === 'object') {
            console.log(`[Memory] Deep nesting detected. Keys: ${Object.keys(queryVector[0])}`);
            queryVector = queryVector[0].embedding || queryVector[0].values || queryVector[0];
        }

        console.log(`[Memory] Search query embedding. Final Length: ${queryVector?.length || 'N/A'}`);

        if (!queryVector || !queryVector.length) {
            console.error('[Memory] No query vector generated!');
            return [];
        }

        // Cosine Similarity
        const results = this.data.map(doc => {
            return {
                ...doc,
                score: cosineSimilarity(queryVector, doc.embedding)
            };
        });

        // Sort and Limit
        return results
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, limit);
    }
}

// Math Helper
function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;
    return dotProduct / magnitude;
}

export const vectorStore = new SimpleVectorStore();
