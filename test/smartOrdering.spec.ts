import { db } from '../src/db';
import triggerSmartOrderSystem from '../src/smartOrder';

/**
 * Smart Ordering System - Comprehensive Tests
 *
 * Test Patients:
 * - Mark Corrigan: Regular diet (1500-2500 cal), has BREAKFAST + LUNCH
 * - Sophie Chapman: NO diet order, has NO orders
 * - Alan Johnson: High Calorie diet (2000-2500 cal), has BREAKFAST (10 cal only)
 *
 * All tests use target date: 2025-08-24
 */

// Patient IDs (must match seed data)
const MARK = '7ea4e6ec-f359-485b-ac99-e0b44c3e18b9';
const SOPHIE = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ALAN = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

// Target date for all tests
const TARGET_DATE = new Date('2025-08-24');

// Helper to get date range for queries
const getDayRange = (date: Date) => ({
  gte: new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0),
  lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0),
});

describe('Smart Ordering System', () => {

  // ============================================================
  // TEST GROUP 1: Creates Missing Orders
  // ============================================================
  describe('Creates missing orders', () => {

    it('creates DINNER for Mark (already has BREAKFAST + LUNCH)', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      const dinnerOrder = await db.trayOrder.findFirst({
        where: {
          patientId: MARK,
          mealTime: 'DINNER',
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      expect(dinnerOrder).not.toBeNull();
      expect(dinnerOrder!.recipes.length).toBeGreaterThan(0);
    });

    it('creates BREAKFAST, LUNCH, DINNER for Sophie (has no orders)', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      const sophieOrders = await db.trayOrder.findMany({
        where: {
          patientId: SOPHIE,
          scheduledFor: getDayRange(TARGET_DATE),
        },
      });

      const mealTimes = sophieOrders.map(o => o.mealTime);
      expect(mealTimes).toContain('BREAKFAST');
      expect(mealTimes).toContain('LUNCH');
      expect(mealTimes).toContain('DINNER');
      expect(sophieOrders.length).toBe(3);
    });

    it('creates LUNCH and DINNER for Alan (only has BREAKFAST)', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      const alanOrders = await db.trayOrder.findMany({
        where: {
          patientId: ALAN,
          scheduledFor: getDayRange(TARGET_DATE),
        },
      });

      const mealTimes = alanOrders.map(o => o.mealTime);
      expect(mealTimes).toContain('BREAKFAST'); // Already existed
      expect(mealTimes).toContain('LUNCH');     // Created
      expect(mealTimes).toContain('DINNER');    // Created
      expect(alanOrders.length).toBe(3);
    });
  });

  // ============================================================
  // TEST GROUP 2: No Duplicate Orders
  // ============================================================
  describe('No duplicate orders', () => {

    it('does NOT create duplicate orders when run twice', async () => {
      // First run
      await triggerSmartOrderSystem(TARGET_DATE);
      const countAfterFirst = await db.trayOrder.count();

      // Second run
      await triggerSmartOrderSystem(TARGET_DATE);
      const countAfterSecond = await db.trayOrder.count();

      expect(countAfterSecond).toBe(countAfterFirst);
    });

    it('does NOT duplicate Mark existing BREAKFAST order', async () => {
      const beforeCount = await db.trayOrder.count({
        where: {
          patientId: MARK,
          mealTime: 'BREAKFAST',
          scheduledFor: getDayRange(TARGET_DATE),
        },
      });

      await triggerSmartOrderSystem(TARGET_DATE);

      const afterCount = await db.trayOrder.count({
        where: {
          patientId: MARK,
          mealTime: 'BREAKFAST',
          scheduledFor: getDayRange(TARGET_DATE),
        },
      });

      expect(afterCount).toBe(beforeCount);
      expect(afterCount).toBe(1);
    });
  });

  // ============================================================
  // TEST GROUP 3: No SNACK Orders
  // ============================================================
  describe('No SNACK orders', () => {

    it('never creates SNACK orders for any patient', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      const snackOrders = await db.trayOrder.count({
        where: { mealTime: 'SNACK' },
      });

      expect(snackOrders).toBe(0);
    });
  });

  // ============================================================
  // TEST GROUP 4: Default Calories (No Diet Order)
  // ============================================================
  describe('Default calorie handling', () => {

    it('creates meals for Sophie even without a diet order', async () => {
      // Verify Sophie has no diet order
      const sophieDietOrder = await db.patientDietOrder.findFirst({
        where: { patientId: SOPHIE },
      });
      expect(sophieDietOrder).toBeNull();

      // Run system
      await triggerSmartOrderSystem(TARGET_DATE);

      // Sophie should still get meals
      const sophieOrders = await db.trayOrder.findMany({
        where: {
          patientId: SOPHIE,
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      expect(sophieOrders.length).toBe(3);

      // Each meal should have food
      for (const order of sophieOrders) {
        expect(order.recipes.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================
  // TEST GROUP 5: Calorie Compliance
  // ============================================================
  describe('Calorie compliance', () => {

    it('keeps Mark total daily calories within Regular diet (1500-2500)', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      const markOrders = await db.trayOrder.findMany({
        where: {
          patientId: MARK,
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      let totalCalories = 0;
      for (const order of markOrders) {
        for (const tr of order.recipes) {
          totalCalories += tr.recipe.calories;
        }
      }

      // Mark: Regular diet 1500-2500 cal
      // Already consumed: 500 (breakfast) + 500 (lunch) = 1000
      // Need: 500-1500 more from dinner
      expect(totalCalories).toBeGreaterThanOrEqual(1500);
      expect(totalCalories).toBeLessThanOrEqual(2500);
    });

    it('gives Alan enough calories to meet High Calorie diet (2000-2500)', async () => {
      // Alan's situation:
      // - High Calorie diet: 2000-2500 daily
      // - Existing breakfast: Coffee only = 10 calories
      // - Needs: 1990-2490 more across LUNCH and DINNER

      await triggerSmartOrderSystem(TARGET_DATE);

      const alanOrders = await db.trayOrder.findMany({
        where: {
          patientId: ALAN,
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      let totalCalories = 0;
      for (const order of alanOrders) {
        for (const tr of order.recipes) {
          totalCalories += tr.recipe.calories;
        }
      }

      // Must hit at least 2000 for High Calorie diet
      expect(totalCalories).toBeGreaterThanOrEqual(2000);
      expect(totalCalories).toBeLessThanOrEqual(2500);
    });
  });

  // ============================================================
  // TEST GROUP 6: Meal Composition
  // ============================================================
  describe('Meal composition', () => {

    it('includes at least one entree in each created meal', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      // Get all orders created by the system (exclude pre-existing)
      const allOrders = await db.trayOrder.findMany({
        where: {
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      for (const order of allOrders) {
        if (order.recipes.length > 0) {
          const hasEntree = order.recipes.some(r => r.recipe.category === 'Entrees');
          expect(hasEntree).toBe(true);
        }
      }
    });
  });

  // ============================================================
  // TEST GROUP 7: Meal Time Appropriate Recipes (Optional Enhancement)
  // ============================================================
  describe('Meal time appropriate recipes', () => {

    it('does not serve breakfast-only items for DINNER', async () => {
      const breakfastOnlyRecipes = ['Pancakes', 'Bacon', 'Hash Browns',
                                    'Chocolate Ensure', 'Vanilla Ensure'];

      await triggerSmartOrderSystem(TARGET_DATE);

      const dinnerOrders = await db.trayOrder.findMany({
        where: {
          mealTime: 'DINNER',
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      for (const order of dinnerOrders) {
        for (const tr of order.recipes) {
          expect(breakfastOnlyRecipes).not.toContain(tr.recipe.name);
        }
      }
    });

    it('does not serve Coffee for DINNER', async () => {
      await triggerSmartOrderSystem(TARGET_DATE);

      const dinnerOrders = await db.trayOrder.findMany({
        where: {
          mealTime: 'DINNER',
          scheduledFor: getDayRange(TARGET_DATE),
        },
        include: { recipes: { include: { recipe: true } } },
      });

      for (const order of dinnerOrders) {
        const hasCoffee = order.recipes.some(r => r.recipe.name === 'Coffee');
        expect(hasCoffee).toBe(false);
      }
    });
  });
});
