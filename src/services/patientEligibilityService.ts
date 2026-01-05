/**
 * Patient Eligibility Service
 *
 * Determines which patients need orders and resolves their dietary constraints.
 *
 * TODO: [SAFETY] Check NPO status before including patient
 * TODO: [SAFETY] Verify no procedure-related fasting
 * TODO: [INTEGRATION] Check admission status (still in facility?)
 * TODO: [INTEGRATION] Verify not discharged/transferred
 */

import { MealTime, Patient } from '@prisma/client';
import { db } from '../db';
import { CalorieRange, SelectionContext, ReviewReason } from '../types/orderingTypes';
import { DEFAULT_CALORIE_RANGE } from '../config/orderingConfig';
import { createLogger } from '../utils/logger';
import { getStartOfDay } from '../utils/dateTimeUtils';

const logger = createLogger('PatientEligibilityService');

/**
 * Finds patients who need meal orders for a specific meal.
 * Excludes patients who already have an order for that meal type.
 *
 * NOTE: Simplified to ignore date - just checks if patient has this meal type.
 * In production, would filter by date/scheduling window.
 */
export async function findPatientsRequiringMealOrder(
  mealTime: MealTime
): Promise<Patient[]> {
  logger.info('Finding patients requiring meal orders', { mealTime });

  // TODO: [INTEGRATION] Add filter for NPO, discharged, scheduled procedures
  const allPatients = await db.patient.findMany();

  // Get existing orders for this meal type (simplified - ignores date)
  const existingOrders = await db.trayOrder.findMany({
    where: { mealTime },
    select: { patientId: true },
  });

  const patientsWithOrders = new Set(existingOrders.map((o) => o.patientId));

  // Filter to patients without orders
  const patientsNeedingOrders = allPatients.filter((p) => !patientsWithOrders.has(p.id));

  logger.info('Patient eligibility results', {
    totalPatients: allPatients.length,
    withExistingOrders: patientsWithOrders.size,
    needingOrders: patientsNeedingOrders.length,
  });

  return patientsNeedingOrders;
}

/**
 * Resolves calorie constraints for a patient, accounting for calories already consumed.
 * If we gave them a low-calorie meal earlier, we catch up in later meals.
 */
export async function resolveCalorieConstraints(
  patientId: string,
  currentMealTime: MealTime
): Promise<CalorieRange> {
  logger.info('Resolving calorie constraints', { patientId, currentMealTime });

  const patientDietOrder = await db.patientDietOrder.findFirst({
    where: { patientId },
    include: { dietOrder: true },
  });

  // Get daily limits
  let dailyMin = DEFAULT_CALORIE_RANGE.minimum * 3;
  let dailyMax = DEFAULT_CALORIE_RANGE.maximum * 3;
  let source: 'DIET_ORDER' | 'SYSTEM_DEFAULT' = 'SYSTEM_DEFAULT';

  if (
    patientDietOrder?.dietOrder &&
    patientDietOrder.dietOrder.minimumCalories != null &&
    patientDietOrder.dietOrder.maximumCalories != null
  ) {
    dailyMin = patientDietOrder.dietOrder.minimumCalories;
    dailyMax = patientDietOrder.dietOrder.maximumCalories;
    source = 'DIET_ORDER';
  }

  // Get calories already consumed from orders WE created
  const existingOrders = await db.trayOrder.findMany({
    where: { patientId },
    include: { recipes: { include: { recipe: true } } },
  });

  let caloriesConsumed = 0;
  const mealsAlreadyOrdered: MealTime[] = [];

  for (const order of existingOrders) {
    mealsAlreadyOrdered.push(order.mealTime);
    for (const tr of order.recipes) {
      caloriesConsumed += tr.recipe.calories;
    }
  }

  // Count remaining meals (including current one)
  const allMeals: MealTime[] = ['BREAKFAST', 'LUNCH', 'DINNER'];
  const remainingMeals = allMeals.filter(
    (m) => !mealsAlreadyOrdered.includes(m) || m === currentMealTime
  );
  const mealsLeft = remainingMeals.length;

  // Calculate per-meal targets based on remaining budget
  const remainingMin = Math.max(0, dailyMin - caloriesConsumed);
  const remainingMax = Math.max(0, dailyMax - caloriesConsumed);

  const perMealMin = mealsLeft > 0 ? Math.round(remainingMin / mealsLeft) : 0;
  const perMealMax = mealsLeft > 0 ? Math.round(remainingMax / mealsLeft) : dailyMax;

  logger.info('Calorie calculation with catch-up', {
    patientId,
    dailyMin,
    dailyMax,
    caloriesConsumed,
    mealsLeft,
    perMealMin,
    perMealMax,
    source,
  });

  if (source === 'SYSTEM_DEFAULT') {
    logger.warn('No diet order - using defaults. ORDER REQUIRES STAFF REVIEW.', {
      patientId,
    });
  }

  return { minimum: perMealMin, maximum: perMealMax, source };
}

/**
 * Builds the selection context for recipe filtering/scoring.
 */
export async function buildSelectionContext(
  patientId: string,
  mealTime: MealTime
): Promise<SelectionContext> {
  const calorieRange = await resolveCalorieConstraints(patientId, mealTime);

  // TODO: [SCHEMA] Load allergies when Patient.allergies exists
  // TODO: [SCHEMA] Load texture requirement when Patient.textureRequirement exists
  // TODO: [SCHEMA] Load dietary restrictions when Patient.dietaryRestriction exists
  // TODO: [SCHEMA] Load rejection history when tracking exists

  return {
    patientId,
    mealTime,
    calorieRange,
  };
}

/**
 * Determines reasons why an order might require staff review.
 */
export async function determineReviewReasons(
  patientId: string,
  context: SelectionContext
): Promise<ReviewReason[]> {
  const reasons: ReviewReason[] = [];

  // Check if using system defaults
  if (context.calorieRange.source === 'SYSTEM_DEFAULT') {
    reasons.push('DEFAULT_CALORIE_CONSTRAINTS');
  }

  // Always add these since schema doesn't support checking them
  reasons.push('MISSING_ALLERGY_DATA');
  reasons.push('MISSING_TEXTURE_REQUIREMENT');
  reasons.push('MISSING_DIETARY_PREFERENCES');

  // TODO: [SCHEMA] Check if new patient without dietary assessment
  // const patient = await db.patient.findUnique({ where: { id: patientId } });
  // if (patient?.isNew && !patient?.hasCompletedAssessment) {
  //   reasons.push('NEW_PATIENT_NO_ASSESSMENT');
  // }

  return reasons;
}
