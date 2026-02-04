import lancedb from 'vectordb'; // Using Node.js native client
import { ai } from '../config.js';
import path from 'path';
import fs from 'fs';

/**
 * Vector Store Service
 * Manages the connection to LanceDB and document indexing.
 */
export class VectorService {
    constructor() {
        this.dbDir = path.join(process.cwd(), 'data', 'lancedb');
        this.uri = this.dbDir;
        if (!fs.existsSync(this.dbDir)) {
            fs.mkdirSync(this.dbDir, { recursive: true });
        }
    }

    async connect() {
        if (this.db) return;
        this.db = await lancedb.connect(this.uri);

        // Define table schema implicitly by checking/creating
        try {
            this.table = await this.db.openTable('brain_memory');
        } catch (e) {
            // Create table if not exists
            this.table = await this.db.createTable('brain_memory', [
                { vec: Array(768).fill(0), text: 'Initial', source: 'system', timestamp: Date.now() }
            ]);
        }
    }

    /**
     * Index a single document
     */
    async indexDocument(text, metadata = {}) {
        await this.connect();

        // Generate embedding using Genkit
        const embedResponse = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: text
        });

        console.log('[RAG] Embed Response keys:', Object.keys(embedResponse));
        // console.log('[RAG] Embed Response:', JSON.stringify(embedResponse).substring(0, 200));

        const embedding = embedResponse.embedding || embedResponse; // Try fallback if structure differs

        console.log(`[RAG] Embedding generated. Length: ${embedding.length}, Type: ${typeof embedding}`);

        // Store in LanceDB (Ensure Float32Array to avoid crash)
        await this.table.add([{
            vec: new Float32Array(embedding),
            text,
            ...metadata,
            timestamp: Date.now()
        }]);

        console.log(`[RAG] Indexed: "${text.substring(0, 30)}..."`);
    }

    /**
     * Search relevant documents
     */
    async search(query, limit = 3) {
        await this.connect();

        // Embed query
        const embedResponse = await ai.embed({
            embedder: 'googleai/text-embedding-004',
            content: query
        });

        const embedding = embedResponse.embedding || embedResponse;

        console.log(`[RAG] Query embedding. Length: ${embedding.length}, IsArray: ${Array.isArray(embedding)}`);
        console.log(`[RAG] Sample: ${JSON.stringify(embedding).substring(0, 50)}...`);

        // Ensure plain array of numbers
        const cleanVector = Array.from(embedding);

        // Check row count
        const count = await this.table.countRows();
        console.log(`[RAG] Table row count: ${count}`);

        // Search
        // Note: lancedb JS client search() takes the vector directly.
        const results = await this.table.search(cleanVector).limit(limit).execute();
        return results;
    }
}

export const vectorService = new VectorService();
