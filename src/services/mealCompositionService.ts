/**
 * Meal Composition Service
 *
 * Builds valid meals using the modular selection factor system.
 *
 * DESIGN DECISIONS:
 * 1. Selection factors applied in order (safety first)
 * 2. Each factor filters and/or scores recipes
 * 3. Final selection uses combined scores
 * 4. All factor evaluations tracked for transparency
 *
 * TODO: [OPTIMIZATION] Factor in prep complexity for kitchen efficiency
 * TODO: [INTEGRATION] Consider ingredient availability/inventory
 * TODO: [OPTIMIZATION] Cost optimization within constraints
 * TODO: [OPTIMIZATION] Batch similar meals for kitchen efficiency
 */

import { Recipe } from '@prisma/client';
import { db } from '../db';
import { SelectionContext, ComposedMeal, FactorEvaluationResult } from '../types/orderingTypes';
import { MEAL_COMPOSITION_RULES, RECIPE_CATEGORIES } from '../config/orderingConfig';
import { getActiveSelectionFactors } from '../selectionFactors';
import { createLogger } from '../utils/logger';

const logger = createLogger('MealCompositionService');

/** Recipe with scoring information */
interface ScoredRecipe {
  recipe: Recipe;
  totalScore: number;
  factorScores: Record<string, number>;
}

/** Recipes organized by category */
interface RecipesByCategory {
  entrees: Recipe[];
  sides: Recipe[];
  beverages: Recipe[];
  desserts: Recipe[];
}

/**
 * Fetches all recipes from the database, grouped by category.
 */
async function fetchRecipesByCategory(): Promise<RecipesByCategory> {
  const allRecipes = await db.recipe.findMany();

  return {
    entrees: allRecipes.filter((r) => r.category === RECIPE_CATEGORIES.ENTREES),
    sides: allRecipes.filter((r) => r.category === RECIPE_CATEGORIES.SIDES),
    beverages: allRecipes.filter((r) => r.category === RECIPE_CATEGORIES.BEVERAGES),
    desserts: allRecipes.filter((r) => r.category === RECIPE_CATEGORIES.DESSERTS),
  };
}

/**
 * Applies all active selection factors to filter recipes.
 */
function applyFactorFilters(
  recipes: Recipe[],
  context: SelectionContext
): { filtered: Recipe[]; results: FactorEvaluationResult[] } {
  const activeFactors = getActiveSelectionFactors();
  const results: FactorEvaluationResult[] = [];
  let filtered = [...recipes];

  for (const factor of activeFactors) {
    const before = filtered.length;
    filtered = factor.filter(filtered, context);
    const after = filtered.length;

    results.push({
      factorName: factor.name,
      applied: true,
      reason: `Filtered from ${before} to ${after} recipes`,
      flagForReview: factor.requiresReview(context),
    });

    logger.info('Applied filter', {
      factor: factor.name,
      before,
      after,
      removed: before - after,
    });
  }

  return { filtered, results };
}

/**
 * Scores recipes using all active selection factors.
 */
function scoreRecipes(recipes: Recipe[], context: SelectionContext): ScoredRecipe[] {
  const activeFactors = getActiveSelectionFactors();

  return recipes.map((recipe) => {
    const factorScores: Record<string, number> = {};
    let totalScore = 0;

    for (const factor of activeFactors) {
      const score = factor.score(recipe, context);
      factorScores[factor.name] = score;
      totalScore += score;
    }

    return { recipe, totalScore, factorScores };
  });
}

/**
 * Selects the best items from scored recipes within a calorie budget.
 */
function selectBestItems(
  scored: ScoredRecipe[],
  maxItems: number,
  remainingCalories: number
): Recipe[] {
  if (maxItems === 0) return [];

  // Sort by score descending
  const sorted = [...scored].sort((a, b) => b.totalScore - a.totalScore);

  const selected: Recipe[] = [];
  for (const item of sorted) {
    if (selected.length >= maxItems) break;
    if (item.recipe.calories <= remainingCalories) {
      selected.push(item.recipe);
    }
  }

  return selected;
}

/**
 * Composes a meal within the given constraints.
 *
 * @param context - Selection context with calorie range and patient info
 * @returns ComposedMeal with recipes, calories, and factor results
 */
export async function composeMealWithinConstraints(
  context: SelectionContext
): Promise<ComposedMeal> {
  logger.info('Composing meal', {
    patientId: context.patientId,
    mealTime: context.mealTime,
    calorieRange: context.calorieRange,
  });

  const recipesByCategory = await fetchRecipesByCategory();
  const allFactorResults: FactorEvaluationResult[] = [];
  const selectedRecipes: Recipe[] = [];

  // Apply filters to each category
  const { filtered: filteredEntrees, results: entreeResults } = applyFactorFilters(
    recipesByCategory.entrees,
    context
  );
  allFactorResults.push(...entreeResults);

  const { filtered: filteredSides, results: sideResults } = applyFactorFilters(
    recipesByCategory.sides,
    context
  );
  allFactorResults.push(...sideResults);

  const { filtered: filteredBeverages, results: beverageResults } = applyFactorFilters(
    recipesByCategory.beverages,
    context
  );
  allFactorResults.push(...beverageResults);

  const { filtered: filteredDesserts, results: dessertResults } = applyFactorFilters(
    recipesByCategory.desserts,
    context
  );
  allFactorResults.push(...dessertResults);

  // Score all filtered recipes
  const scoredEntrees = scoreRecipes(filteredEntrees, context);
  const scoredSides = scoreRecipes(filteredSides, context);
  const scoredBeverages = scoreRecipes(filteredBeverages, context);
  const scoredDesserts = scoreRecipes(filteredDesserts, context);

  // Composition algorithm
  const maxCalories = context.calorieRange.maximum;
  let remainingCalories = maxCalories;

  // 1. Select entree (use 60% of max as initial budget)
  const entreeBudget = maxCalories * 0.6;
  const entreeSelection = selectBestItems(scoredEntrees, MEAL_COMPOSITION_RULES.maxEntrees, entreeBudget);

  if (entreeSelection.length === 0) {
    logger.warn('No viable entree found within constraints', {
      patientId: context.patientId,
      maxCalories,
      availableEntrees: scoredEntrees.length,
    });

    return {
      recipes: [],
      totalCalories: 0,
      meetsConstraints: false,
      factorResults: allFactorResults,
    };
  }

  selectedRecipes.push(...entreeSelection);
  remainingCalories -= entreeSelection.reduce((sum, r) => sum + r.calories, 0);

  logger.info('Selected entree', {
    entree: entreeSelection[0].name,
    calories: entreeSelection[0].calories,
    remainingBudget: remainingCalories,
  });

  // 2. Select sides (reserve 100 for beverage, 50 for dessert)
  const sidesSelection = selectBestItems(
    scoredSides,
    MEAL_COMPOSITION_RULES.maxSides,
    remainingCalories - 150
  );
  selectedRecipes.push(...sidesSelection);
  remainingCalories -= sidesSelection.reduce((sum, r) => sum + r.calories, 0);

  // 3. Select beverages (reserve 50 for dessert)
  const beverageSelection = selectBestItems(
    scoredBeverages,
    MEAL_COMPOSITION_RULES.maxBeverages,
    remainingCalories - 50
  );
  selectedRecipes.push(...beverageSelection);
  remainingCalories -= beverageSelection.reduce((sum, r) => sum + r.calories, 0);

  // 4. Select desserts if allowed
  if (MEAL_COMPOSITION_RULES.maxDesserts > 0) {
    const dessertSelection = selectBestItems(
      scoredDesserts,
      MEAL_COMPOSITION_RULES.maxDesserts,
      remainingCalories
    );
    selectedRecipes.push(...dessertSelection);
    remainingCalories -= dessertSelection.reduce((sum, r) => sum + r.calories, 0);
  }

  // Calculate totals
  const totalCalories = selectedRecipes.reduce((sum, r) => sum + r.calories, 0);
  const meetsConstraints =
    totalCalories >= context.calorieRange.minimum &&
    totalCalories <= context.calorieRange.maximum;

  logger.info('Meal composition complete', {
    patientId: context.patientId,
    recipeCount: selectedRecipes.length,
    totalCalories,
    meetsConstraints,
    calorieRange: context.calorieRange,
  });

  return {
    recipes: selectedRecipes,
    totalCalories,
    meetsConstraints,
    factorResults: allFactorResults,
  };
}
