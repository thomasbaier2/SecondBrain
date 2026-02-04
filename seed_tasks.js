import 'dotenv/config'; // Load env vars
import { BrainStorage } from './src/storage/BrainStorage.js';
import { vectorStore } from './src/genkit/rag/simpleVectorStore.js';

// Initialize Storage
const storage = new BrainStorage({ storagePath: './data/brain' });

const tasks = [
    {
        title: "Kundentermin am Montag",
        description: "Statusbesprechung Projekt X.",
        task_type: "event",
        importance_score: 9,
        urgency_score: 5,
        estimated_effort_m: 60,
        is_calendar_event: true,
        deadline_at: new Date(Date.now() + 86400000 * 5).toISOString() // Monday
    },
    {
        title: "Vorbereitung Kundentermin",
        description: "Präsentation und Datenanalyse.",
        task_type: "task",
        importance_score: 9,
        urgency_score: 2, // Starts low
        estimated_effort_m: 120,
        is_calendar_event: false,
        deadline_at: new Date(Date.now() + 86400000 * 2).toISOString(), // Friday
        work_load_type: 'heavy'
    },
    {
        title: "Fisch kaufen für Abendessen",
        description: "Wochenmarkt.",
        task_type: "todo",
        importance_score: 2,
        urgency_score: 8,
        estimated_effort_m: 10,
        is_calendar_event: false,
        work_load_type: 'light'
    },
    {
        title: "Rechnung an Client X",
        description: "Finanzen Q1.",
        task_type: "task",
        importance_score: 8,
        urgency_score: 4,
        estimated_effort_m: 30,
        is_calendar_event: false,
        work_load_type: 'annoying'
    },
    {
        title: "Deployment Ubuntu Server",
        description: "Sicherheits-Patches einspielen.",
        task_type: "task",
        importance_score: 7,
        urgency_score: 9,
        estimated_effort_m: 180,
        is_calendar_event: false,
        work_load_type: 'heavy'
    }
];

async function seed() {
    console.log('🌱 Seeding Advanced Tasks...');
    // Clear old tasks for a clean matrix demo
    storage.data.tasks = [];

    for (const task of tasks) {
        await storage.addTask(task);
    }

    storage.save();
    console.log('✅ Done! 5 Advanced Tasks added.');
}

seed().catch(console.error);
