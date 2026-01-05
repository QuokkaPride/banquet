# 2026-01-06_09_orchestrator.md
# Step 09: Main Orchestrator & Entry Point

## Metadata
- **Order**: 09 of 11
- **Estimated Time**: 15 minutes
- **Dependencies**: Steps 02-08
- **Creates**:
  - `src/automatedOrdering.ts`
  - `src/entrypoint.ts` (update if exists)

## Purpose
Tie everything together into the main execution flow.

---

## Prompt for LLM
```
Create the main orchestrator and update the entry point.

### 1. Create `src/automatedOrdering.ts`:

Header documentation block (this is important for reviewers):

"""
Automated Meal Ordering System

============================================================================
DESIGN DECISIONS
============================================================================

1. TIMING STRATEGY
   - Orders placed ADVANCE_ORDER_HOURS before meal service
   - Gives kitchen adequate preparation time
   - Configurable in orderingConfig.ts

2. CALORIE CONSTRAINT RESOLUTION
   - First: Check for physician-ordered DietOrder
   - Fallback: Use system defaults (REQUIRES STAFF REVIEW)
   - NEVER guess based on demographics (requires clinical assessment)

3. MEAL COMPOSITION
   - Uses modular SelectionFactor system
   - Currently only CALORIE_CONSTRAINT active
   - Other factors (allergy, texture, etc.) ready for schema

4. SNACK vs DESSERT INTERPRETATION
   - SNACK (MealTime) = Between-meal occasion → NOT auto-ordered
   - Desserts (Recipe category) = Food type → CAN be included

============================================================================
HEALTHCARE SAFETY NOTES
============================================================================

Orders using DEFAULT constraints are flagged requiresStaffReview: true.
In production, this triggers:
- Alert to nursing station
- Flag on printed meal ticket
- Entry in dietitian review queue

============================================================================
FUTURE ENHANCEMENTS (documented TODOs in code)
============================================================================

PATIENT SAFETY:
- Check NPO status, allergies, texture requirements
- Religious/cultural preferences
- Meal rejection history

OPERATIONAL:
- Kitchen prep time optimization
- Ingredient availability
- Cost optimization
- Batch similar meals
"""

Import all services, types, utilities.

### Main Function: executeAutomatedMealOrdering
export async (options?: {
  simulatedTime?: Date;
  forceMealTimes?: MealTime[];
}): Promise<OrderingRunSummary>

Implementation:
1. Get currentTime (options.simulatedTime or new Date())
2. Get targetDate using getStartOfDay
3. Log "=== AUTOMATED MEAL ORDERING STARTED ===" with context
4. Determine mealsToProcess (options.forceMealTimes or getMealsRequiringOrders)
5. If no meals, log and return empty summary
6. Log meals to process
7. Initialize outcomes array
8. For each mealTime:
   a. Log "--- Processing {mealTime} ---"
   b. Get mealDateTime
   c. Get patientsNeedingOrders
   d. If none, log and continue
   e. For each patient:
      - Log "Processing patient: {name}"
      - Try:
        * buildSelectionContext
        * determineReviewReasons
        * composeMealWithinConstraints
        * If !meetsConstraints, push failure outcome, continue
        * createTrayOrderWithRecipes
        * Push success outcome
        * notifyStaffOfReviewRequired if needed
        * Log success
      - Catch:
        * Log error
        * Push failure outcome
9. Build OrderingRunSummary:
   - Calculate reviewReasonCounts from outcomes
   - Aggregate counts
10. Log "=== AUTOMATED MEAL ORDERING COMPLETE ===" with summary
11. Return summary

Export default executeAutomatedMealOrdering

### 2. Update `src/entrypoint.ts`:

Import:
- executeAutomatedMealOrdering from ./automatedOrdering
- createLogger

Create logger: createLogger('Entrypoint')

Main function:
1. Log "Starting automated meal ordering system"
2. Try:
   - Run executeAutomatedMealOrdering()
   - Log completion with summary counts
   - For each outcome, log success (✓) or failure (✗) with details
3. Catch:
   - Log fatal error
   - process.exit(1)

Call main()
```

---

## Validation Checklist
- [ ] `src/automatedOrdering.ts` created with full documentation header
- [ ] `src/entrypoint.ts` updated
- [ ] All imports resolve
- [ ] `npm start` executes without errors
- [ ] Logs show expected output format
- [ ] No TypeScript errors