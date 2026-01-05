import { db } from '../src/db';
import { executeAutomatedMealOrdering } from '../src/automatedOrdering';
import { MealTime } from '@prisma/client';

describe('Automated Meal Ordering System', () => {
  describe('Requirement 1: Auto-places orders for patients without orders', () => {
    it('creates orders for patients without existing orders', async () => {
      // Use seed data: Mark Corrigan has BREAKFAST, LUNCH for 2025-08-24
      // He should need DINNER
      const summary = await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T15:00:00'),
        forceMealTimes: ['DINNER'],
      });

      expect(summary.ordersCreated).toBeGreaterThanOrEqual(1);

      // Verify order exists
      const order = await db.trayOrder.findFirst({
        where: {
          patientId: '7ea4e6ec-f359-485b-ac99-e0b44c3e18b9',
          mealTime: 'DINNER',
        },
        include: { recipes: true },
      });

      expect(order).not.toBeNull();
      expect(order!.recipes.length).toBeGreaterThan(0);
    });

    it('does NOT create duplicate orders', async () => {
      // Mark already has BREAKFAST order
      const beforeCount = await db.trayOrder.count({
        where: {
          patientId: '7ea4e6ec-f359-485b-ac99-e0b44c3e18b9',
          mealTime: 'BREAKFAST',
        },
      });

      await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T05:00:00'),
        forceMealTimes: ['BREAKFAST'],
      });

      const afterCount = await db.trayOrder.count({
        where: {
          patientId: '7ea4e6ec-f359-485b-ac99-e0b44c3e18b9',
          mealTime: 'BREAKFAST',
        },
      });

      expect(afterCount).toBe(beforeCount);
    });

    it('does NOT create orders for SNACK meal time', async () => {
      const beforeCount = await db.trayOrder.count({ where: { mealTime: 'SNACK' } });

      await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T15:00:00'),
      });

      const afterCount = await db.trayOrder.count({ where: { mealTime: 'SNACK' } });
      expect(afterCount).toBe(beforeCount);
    });
  });

  describe('Requirement 2: Orders meet dietary constraints', () => {
    it('respects calorie limits from DietOrder', async () => {
      // Mark has "Regular" diet: 1500-2500 calories
      const summary = await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T15:00:00'),
        forceMealTimes: ['DINNER'],
      });

      const markOutcome = summary.outcomes.find(
        (o) => o.patientId === '7ea4e6ec-f359-485b-ac99-e0b44c3e18b9'
      );

      expect(markOutcome).toBeDefined();
      expect(markOutcome!.success).toBe(true);
      expect(markOutcome!.calorieSource).toBe('DIET_ORDER');
      expect(markOutcome!.totalCalories).toBeGreaterThanOrEqual(500);
      expect(markOutcome!.totalCalories).toBeLessThanOrEqual(2500);
    });

    it('uses defaults and flags for review when no DietOrder', async () => {
      // Create patient without diet order
      const newPatient = await db.patient.create({
        data: { id: 'test-no-diet', name: 'Test No Diet' },
      });

      const summary = await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T05:00:00'),
        forceMealTimes: ['BREAKFAST'],
      });

      const outcome = summary.outcomes.find((o) => o.patientId === newPatient.id);

      expect(outcome).toBeDefined();
      expect(outcome!.success).toBe(true);
      expect(outcome!.calorieSource).toBe('SYSTEM_DEFAULT');
      expect(outcome!.requiresStaffReview).toBe(true);
    });

    it('includes at least one entree in each meal', async () => {
      const summary = await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T15:00:00'),
        forceMealTimes: ['DINNER'],
      });

      for (const outcome of summary.outcomes.filter((o) => o.success)) {
        const order = await db.trayOrder.findUnique({
          where: { id: outcome.orderId },
          include: { recipes: { include: { recipe: true } } },
        });

        const hasEntree = order!.recipes.some((r) => r.recipe.category === 'Entrees');
        expect(hasEntree).toBe(true);
      }
    });
  });

  describe('Logging and return values', () => {
    it('returns comprehensive summary', async () => {
      const summary = await executeAutomatedMealOrdering({
        simulatedTime: new Date('2025-08-24T15:00:00'),
        forceMealTimes: ['DINNER'],
      });

      expect(summary.executedAt).toBeInstanceOf(Date);
      expect(summary.targetDate).toBeInstanceOf(Date);
      expect(Array.isArray(summary.mealsProcessed)).toBe(true);
      expect(typeof summary.ordersCreated).toBe('number');
      expect(typeof summary.ordersFailed).toBe('number');
      expect(typeof summary.ordersRequiringReview).toBe('number');

      for (const outcome of summary.outcomes) {
        expect(outcome.patientId).toBeDefined();
        expect(outcome.patientName).toBeDefined();
        expect(typeof outcome.requiresStaffReview).toBe('boolean');
      }
    });
  });
});
