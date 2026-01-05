# 2026-01-06_06_patient-service.md
# Step 06: Patient Eligibility Service

## Metadata
- **Order**: 06 of 11
- **Estimated Time**: 15 minutes
- **Dependencies**: Steps 02, 03, 04
- **Creates**: `src/services/patientEligibilityService.ts`

## Purpose
Determine which patients need orders and resolve their dietary constraints.

---

## Prompt for LLM
```
Create `src/services/patientEligibilityService.ts`.

Header comment with HEALTHCARE TODOs:
- TODO: [SAFETY] Check NPO status before including patient
- TODO: [SAFETY] Verify no procedure-related fasting
- TODO: [INTEGRATION] Check admission status (still in facility?)
- TODO: [INTEGRATION] Verify not discharged/transferred

Import:
- MealTime, Patient from @prisma/client
- db from ../db
- CalorieRange, SelectionContext, ReviewReason from ../types/orderingTypes
- DEFAULT_CALORIE_RANGE from ../config/orderingConfig
- createLogger from ../utils/logger
- getStartOfDay from ../utils/dateTimeUtils

Create logger: createLogger('PatientEligibilityService')

### Function 1: findPatientsRequiringMealOrder
async (targetDate: Date, mealTime: MealTime): Promise<Patient[]>

Implementation:
1. Calculate dayStart and dayEnd using getStartOfDay
2. Log "Finding patients requiring meal orders" with targetDate, mealTime
3. TODO comment: Add filter for NPO, discharged, procedures
4. Get all patients: db.patient.findMany()
5. Get existing orders: db.trayOrder.findMany where mealTime and scheduledFor between dayStart/dayEnd
6. Create Set of patientIds with orders
7. Filter to patients NOT in set
8. Log results: totalPatients, withExistingOrders, needingOrders
9. Return filtered array

### Function 2: resolveCalorieConstraints
async (patientId: string): Promise<CalorieRange>

Implementation:
1. Log "Resolving calorie constraints"
2. Query patientDietOrder with include: { dietOrder: true }
3. If dietOrder exists with both min/max calories:
   - Log "Using physician-ordered diet constraints"
   - Return { minimum, maximum, source: 'DIET_ORDER' }
4. Else:
   - Log WARN "No diet order - using defaults. ORDER REQUIRES STAFF REVIEW."
   - Return DEFAULT_CALORIE_RANGE

### Function 3: buildSelectionContext
async (patientId: string, mealTime: MealTime): Promise<SelectionContext>

Implementation:
1. Get calorieRange from resolveCalorieConstraints
2. TODO comments for future data loading (allergies, texture, etc.)
3. Return { patientId, mealTime, calorieRange }

### Function 4: determineReviewReasons
async (patientId: string, context: SelectionContext): Promise<ReviewReason[]>

Implementation:
1. Create empty reasons array
2. If calorieRange.source === 'SYSTEM_DEFAULT', add 'DEFAULT_CALORIE_CONSTRAINTS'
3. Always add: 'MISSING_ALLERGY_DATA', 'MISSING_TEXTURE_REQUIREMENT', 'MISSING_DIETARY_PREFERENCES' (since schema doesn't support these)
4. TODO comment for checking new patient without assessment
5. Return reasons

Export all 4 functions.
```

---

## Validation Checklist
- [ ] File created at `src/services/patientEligibilityService.ts`
- [ ] All 4 functions exported
- [ ] Uses Prisma client correctly
- [ ] Logs all operations
- [ ] TODO comments for healthcare safety items
- [ ] No TypeScript errors