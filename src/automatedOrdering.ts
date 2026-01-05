/**
 * Automated Meal Ordering System
 *
 * ============================================================================
 * DESIGN DECISIONS
 * ============================================================================
 *
 * 1. TIMING STRATEGY
 *    - Orders placed ADVANCE_ORDER_HOURS before meal service
 *    - Gives kitchen adequate preparation time
 *    - Configurable in orderingConfig.ts
 *
 * 2. CALORIE CONSTRAINT RESOLUTION
 *    - First: Check for physician-ordered DietOrder
 *    - Fallback: Use system defaults (REQUIRES STAFF REVIEW)
 *    - NEVER guess based on demographics (requires clinical assessment)
 *
 * 3. MEAL COMPOSITION
 *    - Uses modular SelectionFactor system
 *    - Currently only CALORIE_CONSTRAINT active
 *    - Other factors (allergy, texture, etc.) ready for schema additions
 *
 * 4. SNACK vs DESSERT INTERPRETATION
 *    - SNACK (MealTime) = Between-meal occasion -> NOT auto-ordered
 *    - Desserts (Recipe category) = Food type -> CAN be included
 *
 * ============================================================================
 * HEALTHCARE SAFETY NOTES
 * ============================================================================
 *
 * Orders using DEFAULT constraints are flagged requiresStaffReview: true.
 * In production, this triggers:
 * - Alert to nursing station
 * - Flag on printed meal ticket
 * - Entry in dietitian review queue
 *
 * ============================================================================
 * FUTURE ENHANCEMENTS (documented TODOs in code)
 * ============================================================================
 *
 * PATIENT SAFETY:
 * - Check NPO status, allergies, texture requirements
 * - Religious/cultural preferences
 * - Meal rejection history
 *
 * OPERATIONAL:
 * - Kitchen prep time optimization
 * - Ingredient availability
 * - Cost optimization
 * - Batch similar meals
 */

import { MealTime } from '@prisma/client';
import {
  MealOrderOutcome,
  OrderingRunSummary,
  ReviewReason,
} from './types/orderingTypes';
import {
  findPatientsRequiringMealOrder,
  buildSelectionContext,
  determineReviewReasons,
} from './services/patientEligibilityService';
import { composeMealWithinConstraints } from './services/mealCompositionService';
import { createTrayOrderWithRecipes } from './services/trayOrderService';
import { notifyStaffOfReviewRequired } from './services/staffNotificationService';
import { getStartOfDay, getMealDateTime, getMealsRequiringOrders } from './utils/dateTimeUtils';
import { createLogger } from './utils/logger';

const logger = createLogger('AutomatedOrdering');

export interface OrderingOptions {
  /** Simulate ordering at a specific time (for testing) */
  simulatedTime?: Date;
  /** Force processing specific meal times (for testing) */
  forceMealTimes?: MealTime[];
}

/**
 * Main entry point for automated meal ordering.
 *
 * @param options - Optional configuration for simulation/testing
 * @returns Summary of the ordering run
 */
export async function executeAutomatedMealOrdering(
  options?: OrderingOptions
): Promise<OrderingRunSummary> {
  const currentTime = options?.simulatedTime || new Date();
  const targetDate = getStartOfDay(currentTime);

  logger.info('=== AUTOMATED MEAL ORDERING STARTED ===', {
    currentTime: currentTime.toISOString(),
    targetDate: targetDate.toISOString(),
    isSimulated: !!options?.simulatedTime,
  });

  // Determine which meals to process
  const mealsToProcess = options?.forceMealTimes || getMealsRequiringOrders(currentTime);

  if (mealsToProcess.length === 0) {
    logger.info('No meals require ordering at this time');
    return {
      executedAt: new Date(),
      targetDate,
      mealsProcessed: [],
      ordersCreated: 0,
      ordersFailed: 0,
      ordersRequiringReview: 0,
      reviewReasonCounts: {},
      outcomes: [],
    };
  }

  logger.info('Meals to process', { meals: mealsToProcess });

  const outcomes: MealOrderOutcome[] = [];

  for (const mealTime of mealsToProcess) {
    logger.info(`--- Processing ${mealTime} ---`);

    const mealDateTime = getMealDateTime(targetDate, mealTime);
    const patientsNeedingOrders = await findPatientsRequiringMealOrder(mealTime);

    if (patientsNeedingOrders.length === 0) {
      logger.info(`No patients need ${mealTime} orders`);
      continue;
    }

    for (const patient of patientsNeedingOrders) {
      logger.info(`Processing patient: ${patient.name}`, { patientId: patient.id });

      try {
        // Build context and determine review reasons
        const context = await buildSelectionContext(patient.id, mealTime);
        const reviewReasons = await determineReviewReasons(patient.id, context);
        const requiresStaffReview = reviewReasons.length > 0;

        // Compose the meal
        const composedMeal = await composeMealWithinConstraints(context);

        // Check if meal meets constraints
        if (!composedMeal.meetsConstraints) {
          const failureOutcome: MealOrderOutcome = {
            patientId: patient.id,
            patientName: patient.name,
            mealTime,
            scheduledFor: mealDateTime,
            success: false,
            calorieSource: context.calorieRange.source,
            reviewReasons: [...reviewReasons, 'MEAL_CONSTRAINT_NOT_MET'],
            requiresStaffReview: true,
            appliedFactors: composedMeal.factorResults.map((r) => r.factorName),
            failureReason: 'Could not compose meal within calorie constraints',
          };
          outcomes.push(failureOutcome);
          continue;
        }

        // Create the order
        const trayOrder = await createTrayOrderWithRecipes(
          patient.id,
          mealTime,
          mealDateTime,
          composedMeal.recipes
        );

        // Build success outcome
        const successOutcome: MealOrderOutcome = {
          patientId: patient.id,
          patientName: patient.name,
          mealTime,
          scheduledFor: mealDateTime,
          success: true,
          orderId: trayOrder.id,
          totalCalories: composedMeal.totalCalories,
          calorieSource: context.calorieRange.source,
          reviewReasons,
          requiresStaffReview,
          appliedFactors: composedMeal.factorResults.map((r) => r.factorName),
        };

        outcomes.push(successOutcome);

        // Notify staff if needed
        if (requiresStaffReview) {
          await notifyStaffOfReviewRequired(successOutcome);
        }

        logger.info('Order created successfully', {
          patientId: patient.id,
          orderId: trayOrder.id,
          totalCalories: composedMeal.totalCalories,
          requiresStaffReview,
        });
      } catch (error) {
        logger.error('Failed to process patient', {
          patientId: patient.id,
          error: error instanceof Error ? error.message : String(error),
        });

        outcomes.push({
          patientId: patient.id,
          patientName: patient.name,
          mealTime,
          scheduledFor: mealDateTime,
          success: false,
          calorieSource: 'SYSTEM_DEFAULT',
          reviewReasons: [],
          requiresStaffReview: true,
          appliedFactors: [],
          failureReason: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  // Build summary
  const reviewReasonCounts: Partial<Record<ReviewReason, number>> = {};
  for (const outcome of outcomes) {
    for (const reason of outcome.reviewReasons) {
      reviewReasonCounts[reason] = (reviewReasonCounts[reason] || 0) + 1;
    }
  }

  const summary: OrderingRunSummary = {
    executedAt: new Date(),
    targetDate,
    mealsProcessed: mealsToProcess,
    ordersCreated: outcomes.filter((o) => o.success).length,
    ordersFailed: outcomes.filter((o) => !o.success).length,
    ordersRequiringReview: outcomes.filter((o) => o.requiresStaffReview).length,
    reviewReasonCounts,
    outcomes,
  };

  logger.info('=== AUTOMATED MEAL ORDERING COMPLETE ===', {
    ordersCreated: summary.ordersCreated,
    ordersFailed: summary.ordersFailed,
    ordersRequiringReview: summary.ordersRequiringReview,
    reviewReasonCounts: summary.reviewReasonCounts,
  });

  return summary;
}

export default executeAutomatedMealOrdering;
