import 'dotenv/config';
import { Orchestrator } from '../src/genkit/orchestrator/Orchestrator.js';
import { expect } from 'chai';

describe('Orchestrator Appointment Extraction', function () {
    this.timeout(30000);
    let orchestrator;

    before(() => {
        orchestrator = new Orchestrator({}); // Mock storage
    });

    it('should extract details from a German appointment request', async () => {
        const text = "Lege für morgen um 14 Uhr einen Termin für das Projekt-Meeting an";
        const details = await orchestrator._extractAppointmentDetails(text);

        console.log('Extracted Details:', details);

        expect(details).to.have.property('subject');
        expect(details.subject.toLowerCase()).to.contain('projekt');
        expect(details).to.have.property('start');
        // Robust ISO check: ensure it can be parsed and matches the year
        const date = new Date(details.start);
        expect(date.getTime()).to.not.be.NaN;
        expect(date.getFullYear()).to.equal(2026);
    });

    it('should detect creation intent in _analyzeIntent', async () => {
        const text = "Neuer Termin am Montag um 10:00: Kaffeetrinken mit Thomas";
        const analysis = await orchestrator._analyzeIntent(text);

        expect(analysis.intents.calendar).to.be.true;
        expect(analysis.intents.create).to.be.true;
        expect(analysis.appointmentDetails).to.not.be.null;
        expect(analysis.appointmentDetails.subject).to.contain('Kaffeetrinken');
    });
});
