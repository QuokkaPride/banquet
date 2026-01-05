/**
 * Selection Factor Registry
 *
 * Add new factors here. Order matters: safety-critical factors are processed first.
 */

import { SelectionFactor, SelectionContext } from './types';
import { allergyFactor } from './allergyFactor';
import { textureFactor } from './textureFactor';
import { calorieConstraintFactor } from './calorieConstraintFactor';
import { religiousDietaryFactor } from './religiousDietaryFactor';

/**
 * All available selection factors in processing order.
 * Safety-critical factors are listed first.
 */
export const ALL_SELECTION_FACTORS: SelectionFactor[] = [
  allergyFactor,           // Safety-critical: allergens are life-threatening
  textureFactor,           // Safety-critical: aspiration risk
  calorieConstraintFactor, // Active: the only enabled factor currently
  religiousDietaryFactor,  // Important for patient dignity
];

/**
 * Returns only enabled selection factors.
 */
export function getActiveSelectionFactors(): SelectionFactor[] {
  return ALL_SELECTION_FACTORS.filter((factor) => factor.enabled);
}

/**
 * Returns factors that require staff review based on current context.
 */
export function getReviewRequiringFactors(
  factors: SelectionFactor[],
  context: SelectionContext
): SelectionFactor[] {
  return factors.filter((factor) => factor.requiresReview(context));
}

// Re-export individual factors for direct access
export { allergyFactor } from './allergyFactor';
export { textureFactor } from './textureFactor';
export { calorieConstraintFactor } from './calorieConstraintFactor';
export { religiousDietaryFactor } from './religiousDietaryFactor';

// Re-export types
export { SelectionFactor, SelectionContext, FactorEvaluationResult } from './types';
