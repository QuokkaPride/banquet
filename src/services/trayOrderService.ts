/**
 * Tray Order Service
 *
 * Service for creating tray orders. Uses transactions for atomicity.
 */

import { MealTime, Recipe, TrayOrder } from '@prisma/client';
import { db } from '../db';
import { createLogger } from '../utils/logger';

const logger = createLogger('TrayOrderService');

/**
 * Creates a tray order with associated recipes in a single transaction.
 *
 * @param patientId - The patient ID
 * @param mealTime - The meal time (BREAKFAST, LUNCH, DINNER)
 * @param scheduledFor - When the meal is scheduled
 * @param recipes - The recipes to include in the order
 * @returns The created TrayOrder
 */
export async function createTrayOrderWithRecipes(
  patientId: string,
  mealTime: MealTime,
  scheduledFor: Date,
  recipes: Recipe[]
): Promise<TrayOrder> {
  logger.info('Creating tray order', {
    patientId,
    mealTime,
    scheduledFor: scheduledFor.toISOString(),
    recipeCount: recipes.length,
    recipes: recipes.map((r) => ({ id: r.id, name: r.name, calories: r.calories })),
  });

  const result = await db.$transaction(async (tx) => {
    // Create the tray order
    const trayOrder = await tx.trayOrder.create({
      data: {
        patientId,
        mealTime,
        scheduledFor,
      },
    });

    // Create tray order recipe associations
    for (const recipe of recipes) {
      await tx.trayOrderRecipe.create({
        data: {
          trayOrderId: trayOrder.id,
          recipeId: recipe.id,
        },
      });
    }

    return trayOrder;
  });

  logger.info('Tray order created successfully', {
    orderId: result.id,
    patientId,
    mealTime,
  });

  return result;
}
