import { MealTime } from '@prisma/client';
import { executeAutomatedMealOrdering } from './automatedOrdering';
import { OrderingRunSummary } from './types/orderingTypes';

/**
 * Triggers the smart order system for a specific date.
 *
 * @param targetDate - The date to process orders for (defaults to current date)
 * @param forceMealTimes - Optional array of specific meal times to process
 * @returns Summary of the ordering run
 */
export const triggerSmartOrderSystem = async (
  targetDate?: Date,
  forceMealTimes?: MealTime[]
): Promise<OrderingRunSummary> => {
  // If no forceMealTimes specified, process all main meals
  const mealsToProcess = forceMealTimes || ['BREAKFAST', 'LUNCH', 'DINNER'] as MealTime[];

  return executeAutomatedMealOrdering({
    simulatedTime: targetDate,
    forceMealTimes: mealsToProcess,
  });
};

export default triggerSmartOrderSystem;
