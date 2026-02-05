import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const REQUIRED_VARS = [
    'GOOGLE_GENAI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'AZURE_CLIENT_ID',
    'AZURE_CLIENT_SECRET',
    'AZURE_TENANT_ID'
];

function checkEnv() {
    console.log('\n🔍 SONIA ENVIRONMENT INTEGRITY CHECK\n');
    console.log('------------------------------------');

    let missing = 0;
    const report = [];

    REQUIRED_VARS.forEach(v => {
        const val = process.env[v];
        if (!val || val.includes('PLACEHOLDER') || val.length < 5) {
            report.push(`❌ MISSING: ${v}`);
            missing++;
        } else {
            const masked = val.substring(0, 5) + '...';
            report.push(`✅ PRESENT: ${v} (${masked})`);
        }
    });

    report.forEach(line => console.log(line));

    console.log('------------------------------------');
    if (missing === 0) {
        console.log('\n✨ ALL GOOD! Sonia is ready for action. ✨\n');
        process.exit(0);
    } else {
        console.log(`\n⚠️  WARNING: ${missing} variables are invalid or missing! ⚠️`);
        console.log('Please check your .env file before running the server.');
        process.exit(1);
    }
}

checkEnv();
