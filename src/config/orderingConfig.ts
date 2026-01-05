/**
 * Configuration for the Smart Ordering System
 *
 * HEALTHCARE SAFETY PRINCIPLES:
 * - When in doubt, flag for review
 * - Use conservative defaults
 * - Alert care team for any uncertainties
 *
 * DEFAULT MEAL PHILOSOPHY:
 * Research shows hospitals use "Regular Diet" as default. We don't over-restrict
 * (GF, vegan, etc.) because overly restrictive diets risk malnutrition.
 * Our pattern: Standard meal + Flag for review.
 */

import { MealTime } from '@prisma/client';
import { CalorieRange, ReviewReason } from '../types/orderingTypes';

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

/** Hours before meal service to place orders (gives kitchen prep time) */
export const ADVANCE_ORDER_HOURS = 3;

/** Service times for each meal (24-hour format) */
export const MEAL_SERVICE_TIMES: Record<Exclude<MealTime, 'SNACK'>, number> = {
  BREAKFAST: 8,
  LUNCH: 12,
  DINNER: 18,
  // SNACK intentionally omitted - not auto-ordered per requirements
};

// ============================================================================
// CALORIE CONFIGURATION
// ============================================================================

/**
 * Default calorie range per meal when no DietOrder exists.
 *
 * IMPORTANT: This is a conservative default. Using defaults ALWAYS triggers
 * staff review. NOT calculated from demographics (requires clinical assessment).
 * In production, this triggers alerts to nursing station and dietitian queue.
 *
 * Values are per-meal (not daily): ~500-667 cal/meal for typical 1500-2000 daily.
 */
export const DEFAULT_CALORIE_RANGE: CalorieRange = {
  minimum: 500,
  maximum: 700,
  source: 'SYSTEM_DEFAULT',
};

// ============================================================================
// MEAL COMPOSITION RULES
// ============================================================================

/**
 * Rules for composing a meal.
 *
 * INTERPRETATION NOTE (Snack vs Dessert):
 * - SNACK (MealTime enum) = Between-meal occasion -> NOT auto-ordered
 * - Desserts (Recipe category) = Food type -> CAN be included in meals
 * If interpretation is wrong, set maxDesserts to 0.
 * 
 */
export const MEAL_COMPOSITION_RULES = {
  minEntrees: 1,
  maxEntrees: 1,
  minSides: 1,
  maxSides: 2,
  minBeverages: 1,
  maxBeverages: 1,
  minDesserts: 1,
  maxDesserts: 1, // Dessert is a food type, not snack occasion
};

// ============================================================================
// RECIPE CATEGORIES
// ============================================================================

/** Recipe categories matching database values exactly */
export const RECIPE_CATEGORIES = {
  ENTREES: 'Entrees',
  SIDES: 'Sides',
  BEVERAGES: 'Beverages',
  DESSERTS: 'Desserts',
} as const;

// ============================================================================
// SELECTION FACTORS CONFIGURATION
// ============================================================================

/** Configuration for each selection factor */
export const SELECTION_FACTORS_CONFIG = {
  CALORIE_CONSTRAINT: {
    enabled: true,
    weight: 100,
    description: 'Filters and scores recipes based on calorie targets',
  },
  ALLERGY_SAFETY: {
    enabled: false,
    weight: 1000, // Safety-critical: highest weight when enabled
    description: 'Filters recipes containing patient allergens',
    schemaRequired: 'Patient.allergies: string[], Recipe.allergens: string[]',
    reviewReasonIfMissing: 'MISSING_ALLERGY_DATA' as ReviewReason,
  },
  TEXTURE_MODIFICATION: {
    enabled: false,
    weight: 500, // Safety-critical: dysphagia risk
    description: 'Filters recipes by IDDSI texture level',
    schemaRequired: 'Patient.textureRequirement: string, Recipe.textureLevel: string',
    reviewReasonIfMissing: 'MISSING_TEXTURE_REQUIREMENT' as ReviewReason,
  },
  RELIGIOUS_DIETARY: {
    enabled: false,
    weight: 200,
    description: 'Filters for religious/cultural dietary requirements',
    schemaRequired: 'Patient.dietaryRestriction: string, Recipe.suitableFor: string[]',
    reviewReasonIfMissing: 'MISSING_DIETARY_PREFERENCES' as ReviewReason,
  },
  CULTURAL_PREFERENCE: {
    enabled: false,
    weight: 50,
    description: 'Scores recipes based on cultural preferences',
    schemaRequired: 'Patient.culturalPreferences: string[]',
  },
  REJECTION_HISTORY: {
    enabled: false,
    weight: 75,
    description: 'Deprioritizes previously rejected meals',
    schemaRequired: 'MealRejection tracking table',
  },
  COST_OPTIMIZATION: {
    enabled: false,
    weight: 25,
    description: 'Prefers lower-cost recipes within constraints',
    schemaRequired: 'Recipe.cost: number',
  },
  KITCHEN_EFFICIENCY: {
    enabled: false,
    weight: 25,
    description: 'Batches similar meals for kitchen efficiency',
    schemaRequired: 'Recipe.prepComplexity: number',
  },
  INGREDIENT_AVAILABILITY: {
    enabled: false,
    weight: 150,
    description: 'Filters based on ingredient inventory',
    schemaRequired: 'Inventory tracking system integration',
  },
} as const;

// ============================================================================
// MANDATORY REVIEW TRIGGERS
// ============================================================================

/** Review reasons that always require staff attention */
export const MANDATORY_REVIEW_TRIGGERS: ReviewReason[] = [
  'DEFAULT_CALORIE_CONSTRAINTS',
  'MISSING_ALLERGY_DATA',
  'MISSING_TEXTURE_REQUIREMENT',
];
