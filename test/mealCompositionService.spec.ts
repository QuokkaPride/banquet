import { composeMealWithinConstraints } from '../src/services/mealCompositionService';
import { SelectionContext } from '../src/types/orderingTypes';

describe('Meal Composition Service', () => {
  it('composes meal within calorie constraints', async () => {
    const context: SelectionContext = {
      patientId: 'test',
      mealTime: 'LUNCH',
      calorieRange: { minimum: 500, maximum: 800, source: 'DIET_ORDER' },
    };

    const meal = await composeMealWithinConstraints(context);

    expect(meal.totalCalories).toBeGreaterThanOrEqual(500);
    expect(meal.totalCalories).toBeLessThanOrEqual(800);
    expect(meal.meetsConstraints).toBe(true);
  });

  it('includes at least one entree', async () => {
    const context: SelectionContext = {
      patientId: 'test',
      mealTime: 'DINNER',
      calorieRange: { minimum: 400, maximum: 1000, source: 'DIET_ORDER' },
    };

    const meal = await composeMealWithinConstraints(context);
    const entrees = meal.recipes.filter((r) => r.category === 'Entrees');

    expect(entrees.length).toBeGreaterThanOrEqual(1);
  });

  it('handles tight constraints gracefully', async () => {
    const context: SelectionContext = {
      patientId: 'test',
      mealTime: 'BREAKFAST',
      calorieRange: { minimum: 100, maximum: 200, source: 'DIET_ORDER' },
    };

    const meal = await composeMealWithinConstraints(context);

    // Either succeeds within constraints or fails gracefully
    if (meal.meetsConstraints) {
      expect(meal.totalCalories).toBeLessThanOrEqual(200);
    } else {
      expect(meal.recipes.length).toBe(0);
    }
  });

  it('respects maximum calorie limit', async () => {
    const context: SelectionContext = {
      patientId: 'test',
      mealTime: 'LUNCH',
      calorieRange: { minimum: 300, maximum: 600, source: 'DIET_ORDER' },
    };

    const meal = await composeMealWithinConstraints(context);

    expect(meal.totalCalories).toBeLessThanOrEqual(600);
  });

  it('tracks factor results for transparency', async () => {
    const context: SelectionContext = {
      patientId: 'test',
      mealTime: 'DINNER',
      calorieRange: { minimum: 400, maximum: 1000, source: 'DIET_ORDER' },
    };

    const meal = await composeMealWithinConstraints(context);

    expect(meal.factorResults).toBeDefined();
    expect(Array.isArray(meal.factorResults)).toBe(true);

    // Should have factor results for each category
    const calorieFactorResults = meal.factorResults.filter(
      (r) => r.factorName === 'CALORIE_CONSTRAINT'
    );
    expect(calorieFactorResults.length).toBeGreaterThan(0);
  });
});
