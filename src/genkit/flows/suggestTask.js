import { ai } from '../config.js';
import { z } from 'zod';

/**
 * Suggest Task Flow
 * Analyzes unstructured text and extracts structured task data.
 */
export const suggestTask = ai.defineFlow({
    name: 'suggestTask',
    inputSchema: z.string(),
    outputSchema: z.object({
        title: z.string().describe('Short, clear title for the task'),
        description: z.string().describe('Detailed description'),
        task_type: z.enum(['todo', 'task', 'event']).describe('Type of the item. todo: <15m, task: >=15m, event: fixed time'),
        importance_score: z.number().min(1).max(10).describe('Importance score (1-10) for Eisenhower Matrix Y-axis'),
        urgency_score: z.number().min(1).max(10).describe('Urgency score (1-10) for Eisenhower Matrix X-axis'),
        estimated_effort_m: z.number().describe('Estimated duration in minutes'),
        is_calendar_event: z.boolean().describe('True if this has a specific time/date (event)'),
        deadline_at: z.string().optional().describe('ISO Date string for the task deadline'),
        dependency_id: z.string().optional().describe('ID of a task or event this depends on'),
        project: z.string().optional().describe('Project name if applicable'),
        work_load_type: z.enum(['light', 'heavy', 'annoying']).describe('Nature of work (light: easy, heavy: deep focus, annoying: blockers)'),
        needs_clarification: z.boolean().describe('True if Sonia should ask the user for more details (e.g. priority or duration)')
    }),
}, async (text) => {

    const { output } = await ai.generate({
        prompt: `
            Analyze the following text and extract a highly structured task object.
            Act as Sonia, a proactive and intelligent AI Secretary.
            
            USER INPUT: "${text}"
            
            GUIDELINES:
            1. CLASSIFICATION:
               - 'todo': Effort < 15min, no dependencies.
               - 'task': Effort >= 15min, complex projects.
               - 'event': Fixed date/time in the future.
            
            2. EISENHOWER SCORING (1-10):
               - importance_score: How much value does this add? (1: low, 10: critical)
               - urgency_score: How soon must it be done? (1: anytime, 10: NOW)
            
            3. WORKLOAD TYPE:
               - 'light': Quick wins, non-draining.
               - 'heavy': Needs deep work/concentration.
               - 'annoying': Administrative burden, 2h blockers.
            
            4. DEPENDENCIES:
               - If the input mentions "preparation for [event name]" or "finish before [event]", try to identify the dependency.
            
            5. CLARIFICATION:
               - If vital info (like Importance or Urgency) is missing and you cannot infer it confidently, set needs_clarification to true. Sonia will ask the user.
            
            Rules:
            - Use German for title/description if the input is German.
            - Ensure estimated_effort_m is a realistic number based on the task description.
        `
    });

    return output;
});
