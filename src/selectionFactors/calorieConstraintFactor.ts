/**
 * Calorie Constraint Factor
 *
 * Status: ACTIVE
 * Data source: DietOrder via PatientDietOrder, or system default
 *
 * This is currently the ONLY active factor. It filters recipes that exceed
 * calorie limits and scores recipes based on how close they are to target
 * calorie proportions for their category.
 */

import { Recipe } from '@prisma/client';
import { SelectionFactor, SelectionContext } from './types';
import { RECIPE_CATEGORIES } from '../config/orderingConfig';
import { createLogger } from '../utils/logger';

const logger = createLogger('CalorieConstraintFactor');

/**
 * Target calorie percentages per category (approximate, for scoring)
 * - Entree: ~50% of meal calories
 * - Side: ~20% of meal calories
 * - Beverage: ~5% of meal calories
 * - Dessert: ~15% of meal calories
 */
const CATEGORY_CALORIE_TARGETS: Record<string, number> = {
  [RECIPE_CATEGORIES.ENTREES]: 0.50,
  [RECIPE_CATEGORIES.SIDES]: 0.20,
  [RECIPE_CATEGORIES.BEVERAGES]: 0.05,
  [RECIPE_CATEGORIES.DESSERTS]: 0.15,
};

export const calorieConstraintFactor: SelectionFactor = {
  name: 'CALORIE_CONSTRAINT',
  enabled: true,

  /**
   * Filters out recipes that exceed the maximum calorie limit.
   */
  filter(recipes: Recipe[], context: SelectionContext): Recipe[] {
    const { maximum } = context.calorieRange;
    const before = recipes.length;

    const filtered = recipes.filter((recipe) => recipe.calories <= maximum);

    logger.info('Filtered recipes by calorie maximum', {
      maximum,
      before,
      after: filtered.length,
      removed: before - filtered.length,
    });

    return filtered;
  },

  /**
   * Scores recipes based on how close they are to the target calorie
   * proportion for their category.
   *
   * @returns Score from 0-100 (higher = closer to target)
   */
  score(recipe: Recipe, context: SelectionContext): number {
    const targetProportion = CATEGORY_CALORIE_TARGETS[recipe.category] || 0.25;
    const targetCalories = context.calorieRange.maximum * targetProportion;

    // Calculate deviation from target (0 = perfect match)
    const deviation = Math.abs(recipe.calories - targetCalories);
    const maxDeviation = targetCalories; // Use target as max for normalization

    // Convert to 0-100 score (closer to target = higher score)
    const normalizedDeviation = Math.min(deviation / maxDeviation, 1);
    const score = Math.round((1 - normalizedDeviation) * 100);

    return score;
  },

  /**
   * Requires review if using system defaults (no physician-ordered diet).
   */
  requiresReview(context: SelectionContext): boolean {
    return context.calorieRange.source === 'SYSTEM_DEFAULT';
  },
};
