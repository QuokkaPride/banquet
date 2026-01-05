# 2026-01-06_02_types-interfaces.md
# Step 02: Type Definitions

## Metadata
- **Order**: 02 of 11
- **Estimated Time**: 10 minutes
- **Dependencies**: None
- **Creates**: `src/types/orderingTypes.ts`

## Purpose
Define all TypeScript interfaces BEFORE implementation. This enables type checking throughout development.

---

## Prompt for LLM
```
Read the Prisma schema to understand existing types (Patient, Recipe, TrayOrder, DietOrder, MealTime).

Create `src/types/orderingTypes.ts` with the following interfaces:

1. SELECTION FACTOR TYPES (for modular filtering/scoring):

SelectionFactor interface:
- name: string
- enabled: boolean
- filter: (recipes: Recipe[], context: SelectionContext) => Recipe[]
- score: (recipe: Recipe, context: SelectionContext) => number
- requiresReview: (context: SelectionContext) => boolean

SelectionContext interface:
- patientId: string
- mealTime: MealTime
- calorieRange: CalorieRange
- Add commented-out future fields: allergies?, textureRequirement?, religiousRestriction?, rejectedRecipeIds?
- Include TODO comments explaining what schema changes are needed

FactorEvaluationResult interface:
- factorName: string
- applied: boolean
- reason: string
- flagForReview: boolean

2. CALORIE TYPES:

CalorieSource type: 'DIET_ORDER' | 'SYSTEM_DEFAULT'

CalorieRange interface:
- minimum: number
- maximum: number
- source: CalorieSource

3. MEAL COMPOSITION TYPES:

ComposedMeal interface:
- recipes: Recipe[]
- totalCalories: number
- meetsConstraints: boolean
- factorResults: FactorEvaluationResult[]

4. ORDER OUTCOME TYPES:

ReviewReason type (union of string literals):
- 'DEFAULT_CALORIE_CONSTRAINTS'
- 'MISSING_ALLERGY_DATA'
- 'MISSING_TEXTURE_REQUIREMENT'
- 'MISSING_DIETARY_PREFERENCES'
- 'MEAL_CONSTRAINT_NOT_MET'
- 'NEW_PATIENT_NO_ASSESSMENT'

MealOrderOutcome interface:
- patientId, patientName, mealTime, scheduledFor
- success: boolean
- orderId?: string
- totalCalories?: number
- calorieSource: CalorieSource
- reviewReasons: ReviewReason[]
- requiresStaffReview: boolean
- appliedFactors: string[]
- failureReason?: string

OrderingRunSummary interface:
- executedAt: Date
- targetDate: Date
- mealsProcessed: MealTime[]
- ordersCreated, ordersFailed, ordersRequiringReview: number
- reviewReasonCounts: Record<ReviewReason, number>
- outcomes: MealOrderOutcome[]

5. Add commented-out STAFF NOTIFICATION TYPES as TODO for future implementation.

Include comprehensive JSDoc comments explaining each interface's purpose.
Use Prisma types (Recipe, MealTime, etc.) - import from @prisma/client.
```

---

## Validation Checklist
- [ ] File created at `src/types/orderingTypes.ts`
- [ ] All interfaces have JSDoc comments
- [ ] Imports Recipe, MealTime from @prisma/client
- [ ] Future fields are commented with TODO explanations
- [ ] No TypeScript errors: `npx tsc --noEmit`
