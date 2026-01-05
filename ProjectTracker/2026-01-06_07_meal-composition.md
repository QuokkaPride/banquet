# 2026-01-06_07_meal-composition.md
# Step 07: Meal Composition Service

## Metadata
- **Order**: 07 of 11
- **Estimated Time**: 20 minutes
- **Dependencies**: Steps 02-06
- **Creates**: `src/services/mealCompositionService.ts`

## Purpose
Build valid meals using the modular selection factor system.

---

## Prompt for LLM
```
Create `src/services/mealCompositionService.ts`.

Header comment:
DESIGN DECISIONS:
1. Selection factors applied in order (safety first)
2. Each factor filters and/or scores recipes
3. Final selection uses combined scores
4. All factor evaluations tracked for transparency

OPERATIONAL TODOs:
- TODO: [OPTIMIZATION] Factor in prep complexity for kitchen efficiency
- TODO: [INTEGRATION] Consider ingredient availability/inventory
- TODO: [OPTIMIZATION] Cost optimization within constraints
- TODO: [OPTIMIZATION] Batch similar meals for kitchen efficiency

Import:
- Recipe, MealTime from @prisma/client
- db from ../db
- SelectionContext, ComposedMeal, FactorEvaluationResult from ../types/orderingTypes
- MEAL_COMPOSITION_RULES, RECIPE_CATEGORIES from ../config/orderingConfig
- getActiveSelectionFactors, getReviewRequiringFactors from ../selectionFactors
- createLogger

Create logger: createLogger('MealCompositionService')

### Helper Interface: ScoredRecipe
{ recipe: Recipe, totalScore: number, factorScores: Record<string, number> }

### Helper Interface: RecipesByCategory
{ entrees: Recipe[], sides: Recipe[], beverages: Recipe[], desserts: Recipe[] }

### Helper Function: fetchRecipesByCategory
async (): Promise<RecipesByCategory>
- Get all recipes from db
- Group by category using RECIPE_CATEGORIES constants

### Helper Function: applyFactorFilters
(recipes: Recipe[], context: SelectionContext): { filtered: Recipe[], results: FactorEvaluationResult[] }
- Get active factors
- For each factor, apply filter and track before/after counts
- Build FactorEvaluationResult for each
- Log each factor application

### Helper Function: scoreRecipes
(recipes: Recipe[], context: SelectionContext): ScoredRecipe[]
- For each recipe, get score from each active factor
- Sum scores into totalScore
- Track individual factorScores

### Helper Function: selectBestItems
(scored: ScoredRecipe[], maxItems: number, remainingCalories: number): Recipe[]
- Sort by totalScore descending
- Select items that fit within calorie budget
- Return selected recipes

### Main Function: composeMealWithinConstraints
export async (context: SelectionContext): Promise<ComposedMeal>

Implementation:
1. Log "Composing meal" with context details
2. Fetch all recipes by category
3. Apply filters to each category, collect all factorResults
4. Score filtered recipes in each category
5. Composition algorithm:
   a. Select entree (use 60% of max calories as budget)
   b. If no viable entree, return failure with factorResults
   c. Log selected entree
   d. Select sides (remaining - 100 for beverage reserve)
   e. Select beverages (remaining - 50 for dessert reserve)
   f. Select desserts if maxDesserts > 0
6. Calculate totalCalories
7. Determine meetsConstraints (within min/max)
8. Log completion with totals
9. Return ComposedMeal

Handle edge case: No viable entrees - return empty meal with meetsConstraints: false
```

---

## Validation Checklist
- [ ] File created at `src/services/mealCompositionService.ts`
- [ ] Uses selection factors from index
- [ ] Tracks factorResults for transparency
- [ ] Algorithm handles no-viable-entree case
- [ ] Comprehensive logging
- [ ] No TypeScript errors