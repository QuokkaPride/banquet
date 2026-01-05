/**
 * Staff Notification Service
 *
 * Status: TODO - Interface defined, implementation pending
 *
 * This service handles alerting clinical staff when:
 * 1. Orders created using default constraints
 * 2. Patient dietary information incomplete
 * 3. Orders require clinical review
 *
 * In production, would integrate with:
 * - Hospital notification systems
 * - Nursing station alerts
 * - Dietitian review queues
 * - EMR task systems
 */

import { MealOrderOutcome, ReviewReason } from '../types/orderingTypes';
import { createLogger } from '../utils/logger';

const logger = createLogger('StaffNotificationService');

/** Human-readable messages for each review reason */
const REVIEW_REASON_MESSAGES: Record<ReviewReason, string> = {
  DEFAULT_CALORIE_CONSTRAINTS: 'Order used system defaults - no physician diet order on file',
  MISSING_ALLERGY_DATA: 'CRITICAL: Patient allergy information not available in system',
  MISSING_TEXTURE_REQUIREMENT: 'CRITICAL: Patient texture/dysphagia requirements unknown',
  MISSING_DIETARY_PREFERENCES: 'Patient dietary preferences not documented',
  MEAL_CONSTRAINT_NOT_MET: 'Meal could not fully meet calorie constraints',
  NEW_PATIENT_NO_ASSESSMENT: 'New patient - dietary assessment not completed',
};

/** Review reasons that are considered urgent */
const URGENT_REASONS: ReviewReason[] = ['MISSING_ALLERGY_DATA', 'MISSING_TEXTURE_REQUIREMENT'];

/**
 * Notifies staff when an order requires review.
 * Currently logs notifications; in production would send to hospital systems.
 */
export async function notifyStaffOfReviewRequired(outcome: MealOrderOutcome): Promise<void> {
  if (!outcome.requiresStaffReview) {
    return;
  }

  // Determine priority based on review reasons
  const hasUrgentReason = outcome.reviewReasons.some((r) => URGENT_REASONS.includes(r));
  const priority = hasUrgentReason ? 'URGENT' : 'ROUTINE';

  // Build human-readable message
  const messages = outcome.reviewReasons.map((r) => REVIEW_REASON_MESSAGES[r]);
  const message = messages.join('; ');

  // TODO: [INTEGRATION] Actually send notification when infrastructure exists
  logger.warn('STAFF NOTIFICATION REQUIRED', {
    priority,
    patientId: outcome.patientId,
    patientName: outcome.patientName,
    orderId: outcome.orderId,
    mealTime: outcome.mealTime,
    reviewReasons: outcome.reviewReasons,
    message,
    notificationSent: false,
    notificationMethod: 'LOGGING_ONLY',
  });
}

/**
 * Creates an alert to update patient dietary profile.
 * Currently logs the alert; in production would create EMR task.
 */
export async function alertToUpdatePatientDietaryProfile(
  patientId: string,
  patientName: string,
  missingData: ReviewReason[]
): Promise<void> {
  // TODO: [INTEGRATION] Create task in EMR or nursing workflow system

  logger.warn('DIETARY ASSESSMENT NEEDED', {
    patientId,
    patientName,
    missingData,
    action:
      'Please update patient dietary profile with: allergies, texture requirements, dietary restrictions',
    taskCreated: false,
    taskSystem: 'NOT_IMPLEMENTED',
  });
}
