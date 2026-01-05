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
 * Finds patients who need meal orders for a specific meal on a specific date.
 * Excludes patients who already have an order for that meal/date.
 */
export async function findPatientsRequiringMealOrder(
  targetDate: Date,
  mealTime: MealTime
): Promise<Patient[]> {
  const dayStart = getStartOfDay(targetDate);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  logger.info('Finding patients requiring meal orders', {
    targetDate: targetDate.toISOString(),
    mealTime,
    dayStart: dayStart.toISOString(),
    dayEnd: dayEnd.toISOString(),
  });

  // TODO: [INTEGRATION] Add filter for NPO, discharged, scheduled procedures
  const allPatients = await db.patient.findMany();

  // Get existing orders for this meal/date
  const existingOrders = await db.trayOrder.findMany({
    where: {
      mealTime,
      scheduledFor: {
        gte: dayStart,
        lt: dayEnd,
      },
    },
    select: {
      patientId: true,
    },
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
 * Resolves calorie constraints for a patient.
 * Uses DietOrder if available, otherwise falls back to system defaults.
 */
export async function resolveCalorieConstraints(patientId: string): Promise<CalorieRange> {
  logger.info('Resolving calorie constraints', { patientId });

  const patientDietOrder = await db.patientDietOrder.findFirst({
    where: { patientId },
    include: { dietOrder: true },
  });

  if (
    patientDietOrder?.dietOrder &&
    patientDietOrder.dietOrder.minimumCalories != null &&
    patientDietOrder.dietOrder.maximumCalories != null
  ) {
    // DietOrder calories are daily limits - divide by 3 meals to get per-meal targets
    const MEALS_PER_DAY = 3;
    const perMealMin = Math.round(patientDietOrder.dietOrder.minimumCalories / MEALS_PER_DAY);
    const perMealMax = Math.round(patientDietOrder.dietOrder.maximumCalories / MEALS_PER_DAY);

    logger.info('Using physician-ordered diet constraints', {
      patientId,
      dietOrderName: patientDietOrder.dietOrder.name,
      dailyMinimum: patientDietOrder.dietOrder.minimumCalories,
      dailyMaximum: patientDietOrder.dietOrder.maximumCalories,
      perMealMinimum: perMealMin,
      perMealMaximum: perMealMax,
    });

    return {
      minimum: perMealMin,
      maximum: perMealMax,
      source: 'DIET_ORDER',
    };
  }

  logger.warn('No diet order - using defaults. ORDER REQUIRES STAFF REVIEW.', {
    patientId,
    defaults: DEFAULT_CALORIE_RANGE,
  });

  return DEFAULT_CALORIE_RANGE;
}

/**
 * Builds the selection context for recipe filtering/scoring.
 */
export async function buildSelectionContext(
  patientId: string,
  mealTime: MealTime
): Promise<SelectionContext> {
  const calorieRange = await resolveCalorieConstraints(patientId);

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
