import { expect } from 'chai';
import { classifyEisenhower, prioritizeItems } from '../src/genkit/eisenhower.js';

describe('Eisenhower Matrix Logic', () => {

    describe('classifyEisenhower', () => {
        it('should classify urgent + important item as Quadrant 1 (Do First)', () => {
            const item = {
                title: 'Urgent contract review',
                body: 'CEO needs this ASAP',
                labels: ['legal'],
                timestamp: '2026-02-06T10:00:00Z'
            };
            const result = classifyEisenhower(item);
            expect(result).to.deep.include({
                quadrant: 1,
                urgent: true,
                important: true
            });
        });

        it('should classify important but not urgent item as Quadrant 2 (Schedule)', () => {
            const item = {
                title: 'Review security protocol',
                body: 'Annual review due next month',
                labels: ['compliance'],
                timestamp: '2026-02-06T10:00:00Z'
            };
            const result = classifyEisenhower(item);
            expect(result).to.deep.include({
                quadrant: 2,
                urgent: false,
                important: true
            });
        });

        it('should classify urgent but not important item as Quadrant 3 (Delegate)', () => {
            const item = {
                title: 'Submit workshop feedback ASAP',
                body: 'Please fill out survey today',
                labels: ['admin'],
                timestamp: '2026-02-06T10:00:00Z'
            };
            const result = classifyEisenhower(item);
            expect(result).to.deep.include({
                quadrant: 3,
                urgent: true,
                important: false
            });
        });

        it('should classify neither urgent nor important item as Quadrant 4 (Dont Do)', () => {
            const item = {
                title: 'Team lunch poll',
                body: 'Vote for pizza toppings',
                labels: ['fun'],
                timestamp: '2026-02-06T10:00:00Z'
            };
            const result = classifyEisenhower(item);
            expect(result).to.deep.include({
                quadrant: 4,
                urgent: false,
                important: false
            });
        });
    });

    describe('prioritizeItems', () => {
        it('should sort items by Quadrant ASC then Timestamp DESC', () => {
            const items = [
                { id: '1', title: 'Low priority', timestamp: '2026-02-01T10:00:00Z' }, // Q4 (old)
                { id: '2', title: 'URGENT CEO Request', timestamp: '2026-02-05T10:00:00Z' }, // Q1 (new)
                { id: '3', title: 'URGENT blocking issue', timestamp: '2026-02-04T10:00:00Z' }, // Q1 (old)
                { id: '4', title: 'Strategic plan', labels: ['production'], timestamp: '2026-02-06T10:00:00Z' }, // Q2 (newest)
            ];

            const sorted = prioritizeItems(items);

            // Expected order:
            // 1. Q1 (id: 2) "URGENT CEO Request" (Urgent + Important)
            // 2. Q2 (id: 4) "Strategic plan" (Important: "production")
            // 3. Q3 (id: 3) "URGENT blocking issue" (Urgent, but not Important keyword)
            // 4. Q4 (id: 1) "Low priority"

            expect(sorted[0].id).to.equal('2');
            expect(sorted[1].id).to.equal('4');
            expect(sorted[2].id).to.equal('3');
            expect(sorted[3].id).to.equal('1');

            const class0 = classifyEisenhower(sorted[0]);
            const class1 = classifyEisenhower(sorted[1]);
            expect(class0.quadrant).to.equal(1);
            expect(class1.quadrant).to.equal(2);
        });
    });
});
