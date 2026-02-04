import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Configure Genkit
 * Initializes the framework with Google AI (Gemini)
 * Using 'gemini-1.5-flash' string identifier.
 */
export const ai = genkit({
    plugins: [
        googleAI({
            apiKey: process.env.GOOGLE_GENAI_API_KEY
        })
    ],
    // Log level
    logLevel: 'info',
    // Default model to use (passed as string)
    model: 'googleai/gemini-2.5-flash',
    // Default embedding model
    embedder: 'googleai/text-embedding-004'
});
