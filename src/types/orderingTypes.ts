/**
 * Type definitions for the Smart Ordering System
 */

import { Recipe, MealTime } from '@prisma/client';

// ============================================================================
// CALORIE TYPES
// ============================================================================

/** Source of calorie constraints */
export type CalorieSource = 'DIET_ORDER' | 'SYSTEM_DEFAULT';

/** Calorie range with source tracking */
export interface CalorieRange {
  minimum: number;
  maximum: number;
  source: CalorieSource;
}

// ============================================================================
// SELECTION FACTOR TYPES
// ============================================================================

/** Context passed to selection factors for filtering/scoring */
export interface SelectionContext {
  patientId: string;
  mealTime: MealTime;
  calorieRange: CalorieRange;
  // TODO: [SCHEMA] Add allergies?: string[] - requires Patient.allergies field
  // TODO: [SCHEMA] Add textureRequirement?: string - requires Patient.textureLevel field
  // TODO: [SCHEMA] Add religiousRestriction?: string - requires Patient.dietaryRestriction field
  // TODO: [SCHEMA] Add rejectedRecipeIds?: string[] - requires meal rejection tracking
}

/** Result of evaluating a selection factor */
export interface FactorEvaluationResult {
  factorName: string;
  applied: boolean;
  reason: string;
  flagForReview: boolean;
}

/** Interface for modular selection factors */
export interface SelectionFactor {
  name: string;
  enabled: boolean;
  filter: (recipes: Recipe[], context: SelectionContext) => Recipe[];
  score: (recipe: Recipe, context: SelectionContext) => number;
  requiresReview: (context: SelectionContext) => boolean;
}

// ============================================================================
// MEAL COMPOSITION TYPES
// ============================================================================

/** A composed meal with recipes and metadata */
export interface ComposedMeal {
  recipes: Recipe[];
  totalCalories: number;
  meetsConstraints: boolean;
  factorResults: FactorEvaluationResult[];
}

// ============================================================================
// ORDER OUTCOME TYPES
// ============================================================================

/** Reasons an order may require staff review */
export type ReviewReason =
  | 'DEFAULT_CALORIE_CONSTRAINTS'
  | 'MISSING_ALLERGY_DATA'
  | 'MISSING_TEXTURE_REQUIREMENT'
  | 'MISSING_DIETARY_PREFERENCES'
  | 'MEAL_CONSTRAINT_NOT_MET'
  | 'NEW_PATIENT_NO_ASSESSMENT';

/** Outcome of a single meal order attempt */
export interface MealOrderOutcome {
  patientId: string;
  patientName: string;
  mealTime: MealTime;
  scheduledFor: Date;
  success: boolean;
  orderId?: string;
  totalCalories?: number;
  calorieSource: CalorieSource;
  reviewReasons: ReviewReason[];
  requiresStaffReview: boolean;
  appliedFactors: string[];
  failureReason?: string;
}

/** Summary of an ordering run */
export interface OrderingRunSummary {
  executedAt: Date;
  targetDate: Date;
  mealsProcessed: MealTime[];
  ordersCreated: number;
  ordersFailed: number;
  ordersRequiringReview: number;
  reviewReasonCounts: Partial<Record<ReviewReason, number>>;
  outcomes: MealOrderOutcome[];
}

// ============================================================================
// STAFF NOTIFICATION TYPES (TODO)
// ============================================================================

// TODO: [INTEGRATION] Implement staff notification types when hospital systems are integrated
// export interface StaffNotification {
//   priority: 'URGENT' | 'ROUTINE';
//   patientId: string;
//   patientName: string;
//   orderId: string;
//   reviewReasons: ReviewReason[];
//   message: string;
//   sentAt?: Date;
//   acknowledgedAt?: Date;
// }
