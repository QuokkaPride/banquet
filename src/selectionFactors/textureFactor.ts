/**
 * Texture Modification Factor
 *
 * Status: TODO - Not implemented
 *
 * HEALTHCARE CRITICAL: Wrong texture for dysphagia patients = aspiration pneumonia risk
 *
 * IDDSI Framework Texture Levels (International Dysphagia Diet Standardisation Initiative):
 * Level 0: Thin - Normal fluids
 * Level 1: Slightly Thick
 * Level 2: Mildly Thick
 * Level 3: Moderately Thick / Liquidised
 * Level 4: Extremely Thick / Pureed
 * Level 5: Minced & Moist
 * Level 6: Soft & Bite-Sized
 * Level 7: Regular - Normal texture
 *
 * Required schema changes:
 * - Patient.textureRequirement: string - IDDSI level (e.g., 'LEVEL_4_PUREED')
 * - Recipe.textureLevel: string - What texture this recipe is suitable for
 */

import { Recipe } from '@prisma/client';
import { SelectionFactor, SelectionContext } from './types';
import { createLogger } from '../utils/logger';

const logger = createLogger('TextureFactor');

export const textureFactor: SelectionFactor = {
  name: 'TEXTURE_MODIFICATION',
  enabled: false,

  /**
   * Would filter recipes that don't match patient's texture requirements.
   * Currently returns all recipes unchanged since schema doesn't support texture data.
   */
  filter(recipes: Recipe[], context: SelectionContext): Recipe[] {
    logger.info('Texture factor not active - schema missing texture data', {
      patientId: context.patientId,
    });

    // TODO: [SCHEMA] When Patient.textureRequirement and Recipe.textureLevel exist:
    // const requiredLevel = context.textureRequirement;
    // if (!requiredLevel || requiredLevel === 'LEVEL_7_REGULAR') {
    //   return recipes; // No restriction
    // }
    // return recipes.filter(recipe => {
    //   return recipe.textureLevel <= requiredLevel;
    // });

    return recipes;
  },

  /**
   * Texture is a pass/fail check, not scored.
   */
  score(_recipe: Recipe, _context: SelectionContext): number {
    return 0;
  },

  /**
   * Always requires review since we cannot verify texture safety.
   */
  requiresReview(_context: SelectionContext): boolean {
    return true;
  },
};
