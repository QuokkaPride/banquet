/**
 * Allergy Safety Factor
 *
 * Status: TODO - Not implemented
 *
 * HEALTHCARE CRITICAL: Highest weight when enabled (allergens = life-threatening)
 *
 * Required schema changes:
 * - Patient.allergies: string[] - List of patient allergens
 * - Recipe.allergens: string[] - List of allergens in recipe
 *
 * FDA Top 9 Allergens (for reference):
 * - Milk, Eggs, Fish, Shellfish, Tree nuts, Peanuts, Wheat, Soybeans, Sesame
 */

import { Recipe } from '@prisma/client';
import { SelectionFactor, SelectionContext } from './types';
import { createLogger } from '../utils/logger';

const logger = createLogger('AllergyFactor');

// const ALLERGEN_CATEGORIES = [
//   'MILK',
//   'EGGS',
//   'FISH',
//   'SHELLFISH',
//   'TREE_NUTS',
//   'PEANUTS',
//   'WHEAT',
//   'SOYBEANS',
//   'SESAME',
// ];

export const allergyFactor: SelectionFactor = {
  name: 'ALLERGY_SAFETY',
  enabled: false,

  /**
   * Would filter recipes containing patient allergens.
   * Currently returns all recipes unchanged since schema doesn't support allergens.
   */
  filter(recipes: Recipe[], context: SelectionContext): Recipe[] {
    logger.info('Allergy factor not active - schema missing allergy data', {
      patientId: context.patientId,
    });

    // TODO: [SCHEMA] When Patient.allergies and Recipe.allergens exist:
    // const patientAllergens = context.allergies || [];
    // return recipes.filter(recipe => {
    //   const recipeAllergens = recipe.allergens || [];
    //   return !recipeAllergens.some(a => patientAllergens.includes(a));
    // });

    return recipes;
  },

  /**
   * Allergies are binary (safe/unsafe), not scored.
   * Returns 0 since this is a pass/fail check.
   */
  score(_recipe: Recipe, _context: SelectionContext): number {
    return 0;
  },

  /**
   * Always requires review since we cannot verify allergy safety.
   */
  requiresReview(_context: SelectionContext): boolean {
    return true;
  },
};
