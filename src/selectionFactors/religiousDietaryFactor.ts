/**
 * Religious/Dietary Restriction Factor
 *
 * Status: TODO - Not implemented
 *
 * Important for patient dignity and cultural competence.
 *
 * Common restrictions to support:
 * - KOSHER: Jewish dietary laws (no pork, no mixing meat/dairy, etc.)
 * - HALAL: Islamic dietary laws (no pork, halal-slaughtered meat)
 * - VEGETARIAN: No meat or fish
 * - VEGAN: No animal products
 * - HINDU: Often vegetarian, no beef
 * - PESCATARIAN: Vegetarian plus fish
 * - LACTOSE_FREE: No dairy
 * - GLUTEN_FREE: No gluten-containing grains
 *
 * Required schema changes:
 * - Patient.dietaryRestriction: string - Primary dietary restriction
 * - Recipe.suitableFor: string[] - List of restrictions this recipe satisfies
 */

import { Recipe } from '@prisma/client';
import { SelectionFactor, SelectionContext } from './types';
import { createLogger } from '../utils/logger';

const logger = createLogger('ReligiousDietaryFactor');

export const religiousDietaryFactor: SelectionFactor = {
  name: 'RELIGIOUS_DIETARY',
  enabled: false,

  /**
   * Would filter recipes that don't match patient's dietary restrictions.
   * Currently returns all recipes unchanged since schema doesn't support this data.
   */
  filter(recipes: Recipe[], context: SelectionContext): Recipe[] {
    logger.info('Religious/dietary factor not active - schema missing restriction data', {
      patientId: context.patientId,
    });

    // TODO: [SCHEMA] When Patient.dietaryRestriction and Recipe.suitableFor exist:
    // const restriction = context.religiousRestriction;
    // if (!restriction) return recipes;
    // return recipes.filter(recipe => {
    //   const suitableFor = recipe.suitableFor || [];
    //   return suitableFor.includes(restriction);
    // });

    return recipes;
  },

  /**
   * Religious/dietary compliance is pass/fail, not scored.
   */
  score(_recipe: Recipe, _context: SelectionContext): number {
    return 0;
  },

  /**
   * Always requires review since we cannot verify dietary compliance.
   */
  requiresReview(_context: SelectionContext): boolean {
    return true;
  },
};
