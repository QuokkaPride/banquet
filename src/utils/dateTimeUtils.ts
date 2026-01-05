/**
 * Date/Time Utilities for Meal Scheduling
 */

import { MealTime } from '@prisma/client';
import { MEAL_SERVICE_TIMES, ADVANCE_ORDER_HOURS } from '../config/orderingConfig';

/**
 * Returns the start of the day (midnight) for a given date.
 *
 * @example
 * getStartOfDay(new Date('2025-08-24T15:30:00')) // -> 2025-08-24T00:00:00
 */
export function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Returns the DateTime for a specific meal on a specific date.
 *
 * @throws Error if mealTime is SNACK (not auto-ordered)
 *
 * @example
 * getMealDateTime(new Date('2025-08-24'), 'BREAKFAST') // -> 2025-08-24T08:00:00
 */
export function getMealDateTime(date: Date, mealTime: MealTime): Date {
  if (mealTime === 'SNACK') {
    throw new Error('SNACK is not auto-ordered and has no scheduled service time');
  }

  const result = getStartOfDay(date);
  result.setHours(MEAL_SERVICE_TIMES[mealTime]);
  return result;
}

/**
 * Returns meals that are within the ordering window at the given time.
 *
 * The ordering window is from ADVANCE_ORDER_HOURS before meal service
 * until the meal service time itself.
 *
 * @example
 * // At 5:30 AM with 3-hour advance window:
 * // - Breakfast at 8:00, window starts at 5:00 -> INCLUDE (5:30 > 5:00)
 * // - Lunch at 12:00, window starts at 9:00 -> EXCLUDE (5:30 < 9:00)
 * getMealsRequiringOrders(new Date('2025-08-24T05:30:00')) // -> ['BREAKFAST']
 *
 * @example
 * // At 3:00 PM (15:00) with 3-hour advance window:
 * // - Breakfast at 8:00, already passed -> EXCLUDE
 * // - Lunch at 12:00, already passed -> EXCLUDE
 * // - Dinner at 18:00, window starts at 15:00 -> INCLUDE
 * getMealsRequiringOrders(new Date('2025-08-24T15:00:00')) // -> ['DINNER']
 */
export function getMealsRequiringOrders(currentTime: Date): MealTime[] {
  const mealsToProcess: MealTime[] = [];
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const currentTimeInHours = currentHour + currentMinutes / 60;

  // Only process BREAKFAST, LUNCH, DINNER - never SNACK
  const mealTimes: Exclude<MealTime, 'SNACK'>[] = ['BREAKFAST', 'LUNCH', 'DINNER'];

  for (const mealTime of mealTimes) {
    const serviceHour = MEAL_SERVICE_TIMES[mealTime];
    const windowStart = serviceHour - ADVANCE_ORDER_HOURS;

    // Include if we're within the ordering window (after window start, before/at service time)
    if (currentTimeInHours >= windowStart && currentTimeInHours <= serviceHour) {
      mealsToProcess.push(mealTime);
    }
  }

  return mealsToProcess;
}

/**
 * Checks if two dates are on the same day.
 *
 * @example
 * isSameDay(new Date('2025-08-24T08:00'), new Date('2025-08-24T18:00')) // -> true
 * isSameDay(new Date('2025-08-24T08:00'), new Date('2025-08-25T08:00')) // -> false
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}
