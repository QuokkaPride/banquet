import { db } from '../src/db';
import triggerSmartOrderSystem from '../src/smartOrder';

/**
 * Smart Ordering System - Tests
 *
 * Seed Data State:
 * - Mark: has BREAKFAST + LUNCH (should only get DINNER)
 * - Sophie: has NO orders (should get all 3)
 * - Alan: has BREAKFAST only (should get LUNCH + DINNER)
 */

const MARK = '7ea4e6ec-f359-485b-ac99-e0b44c3e18b9';
const SOPHIE = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const ALAN = 'c3d4e5f6-a7b8-9012-cdef-123456789012';

describe('Smart Ordering System', () => {

  describe('Creates only missing orders', () => {

    it('Mark ends up with exactly 3 orders (existing 2 + new DINNER)', async () => {
      await triggerSmartOrderSystem();

      const markOrders = await db.trayOrder.findMany({
        where: { patientId: MARK },
      });

      expect(markOrders.length).toBe(3);

      const mealTimes = markOrders.map(o => o.mealTime);
      expect(mealTimes).toContain('BREAKFAST');
      expect(mealTimes).toContain('LUNCH');
      expect(mealTimes).toContain('DINNER');
    });

    it('Sophie ends up with exactly 3 orders (all new)', async () => {
      await triggerSmartOrderSystem();

      const sophieOrders = await db.trayOrder.findMany({
        where: { patientId: SOPHIE },
      });

      expect(sophieOrders.length).toBe(3);
    });

    it('Alan ends up with exactly 3 orders (existing 1 + new 2)', async () => {
      await triggerSmartOrderSystem();

      const alanOrders = await db.trayOrder.findMany({
        where: { patientId: ALAN },
      });

      expect(alanOrders.length).toBe(3);
    });
  });

  describe('No duplicate orders', () => {

    it('running twice does not create duplicates', async () => {
      await triggerSmartOrderSystem();
      const countAfterFirst = await db.trayOrder.count();

      await triggerSmartOrderSystem();
      const countAfterSecond = await db.trayOrder.count();

      expect(countAfterSecond).toBe(countAfterFirst);
    });

    it('no patient has more than one of any meal type', async () => {
      await triggerSmartOrderSystem();

      for (const patientId of [MARK, SOPHIE, ALAN]) {
        for (const mealTime of ['BREAKFAST', 'LUNCH', 'DINNER']) {
          const count = await db.trayOrder.count({
            where: { patientId, mealTime: mealTime as any },
          });
          expect(count).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('No SNACK orders', () => {

    it('never creates SNACK orders', async () => {
      await triggerSmartOrderSystem();

      const snackCount = await db.trayOrder.count({
        where: { mealTime: 'SNACK' },
      });

      expect(snackCount).toBe(0);
    });
  });

  describe('Handles patients without diet orders', () => {

    it('Sophie gets meals even without a diet order', async () => {
      const dietOrder = await db.patientDietOrder.findFirst({
        where: { patientId: SOPHIE },
      });
      expect(dietOrder).toBeNull();

      await triggerSmartOrderSystem();

      const orders = await db.trayOrder.findMany({
        where: { patientId: SOPHIE },
        include: { recipes: true },
      });

      expect(orders.length).toBe(3);
      for (const order of orders) {
        expect(order.recipes.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Calorie compliance', () => {

    it('Mark total calories within 1500-2500 range', async () => {
      await triggerSmartOrderSystem();

      const orders = await db.trayOrder.findMany({
        where: { patientId: MARK },
        include: { recipes: { include: { recipe: true } } },
      });

      let total = 0;
      for (const order of orders) {
        for (const tr of order.recipes) {
          total += tr.recipe.calories;
        }
      }

      expect(total).toBeGreaterThanOrEqual(1500);
      expect(total).toBeLessThanOrEqual(2500);
    });

    it('Alan total calories within 2000-2500 range', async () => {
      await triggerSmartOrderSystem();

      const orders = await db.trayOrder.findMany({
        where: { patientId: ALAN },
        include: { recipes: { include: { recipe: true } } },
      });

      let total = 0;
      for (const order of orders) {
        for (const tr of order.recipes) {
          total += tr.recipe.calories;
        }
      }

      expect(total).toBeGreaterThanOrEqual(2000);
      expect(total).toBeLessThanOrEqual(2500);
    });
  });

  describe('Meal composition', () => {

    it('each system-created meal includes an entree', async () => {
      await triggerSmartOrderSystem();

      const orders = await db.trayOrder.findMany({
        include: { recipes: { include: { recipe: true } } },
      });

      for (const order of orders) {
        // Skip orders with only beverages (pre-existing incomplete orders)
        const hasNonBeverage = order.recipes.some(r => r.recipe.category !== 'Beverages');
        if (hasNonBeverage) {
          const hasEntree = order.recipes.some(r => r.recipe.category === 'Entrees');
          expect(hasEntree).toBe(true);
        }
      }
    });

    it('dinner does not include breakfast-only items', async () => {
      const breakfastOnly = ['Pancakes', 'Bacon', 'Hash Browns', 'Chocolate Ensure', 'Vanilla Ensure'];

      await triggerSmartOrderSystem();

      const dinners = await db.trayOrder.findMany({
        where: { mealTime: 'DINNER' },
        include: { recipes: { include: { recipe: true } } },
      });

      for (const order of dinners) {
        for (const tr of order.recipes) {
          expect(breakfastOnly).not.toContain(tr.recipe.name);
        }
      }
    });
  });
});
