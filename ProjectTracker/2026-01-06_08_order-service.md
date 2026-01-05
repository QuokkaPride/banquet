# 2026-01-06_08_order-service.md
# Step 08: Tray Order & Notification Services

## Metadata
- **Order**: 08 of 11
- **Estimated Time**: 10 minutes
- **Dependencies**: Steps 02, 04
- **Creates**:
  - `src/services/trayOrderService.ts`
  - `src/services/staffNotificationService.ts`

## Purpose
Create orders in database and handle staff notifications.

---

## Prompt for LLM
```
Create two service files:

### 1. Create `src/services/trayOrderService.ts`:

Header comment: Service for creating tray orders. Uses transactions for atomicity.

Import:
- MealTime, Recipe, TrayOrder from @prisma/client
- db from ../db
- createLogger

Create logger: createLogger('TrayOrderService')

### Function: createTrayOrderWithRecipes
export async (
  patientId: string,
  mealTime: MealTime,
  scheduledFor: Date,
  recipes: Recipe[]
): Promise<TrayOrder>

Implementation:
1. Log "Creating tray order" with all parameters and recipe details
2. Use db.$transaction:
   a. Create TrayOrder: { patientId, mealTime, scheduledFor }
   b. Create TrayOrderRecipe for each recipe: { trayOrderId, recipeId }
3. Log "Tray order created successfully" with orderId
4. Return created order

### 2. Create `src/services/staffNotificationService.ts`:

Header comment:
Status: 🚧 TODO - Interface defined, implementation pending

This service would handle alerting clinical staff when:
1. Orders created using default constraints
2. Patient dietary information incomplete
3. Orders require clinical review

In production, would integrate with:
- Hospital notification systems
- Nursing station alerts
- Dietitian review queues
- EMR task systems

Import:
- MealOrderOutcome, ReviewReason from ../types/orderingTypes
- createLogger

Create logger: createLogger('StaffNotificationService')

### Function: notifyStaffOfReviewRequired
export async (outcome: MealOrderOutcome): Promise<void>

Implementation:
1. If !outcome.requiresStaffReview, return early
2. Define urgentReasons: ['MISSING_ALLERGY_DATA', 'MISSING_TEXTURE_REQUIREMENT']
3. Determine priority: 'URGENT' if any urgentReasons match, else 'ROUTINE'
4. Build reasonMessages mapping (each ReviewReason to human-readable string)
5. Join messages into single string
6. TODO comment: Actually send notification when infrastructure exists
7. Log WARN "STAFF NOTIFICATION REQUIRED" with all details
   - Include notificationSent: false, notificationMethod: 'LOGGING_ONLY'

### Function: alertToUpdatePatientDietaryProfile
export async (patientId: string, patientName: string, missingData: ReviewReason[]): Promise<void>

Implementation:
1. TODO comment: Create task in EMR or nursing workflow
2. Log WARN "DIETARY ASSESSMENT NEEDED" with:
   - patientId, patientName, missingData
   - action: "Please update patient dietary profile with: allergies, texture requirements, dietary restrictions"
   - taskCreated: false, taskSystem: 'NOT_IMPLEMENTED'
```

---

## Validation Checklist
- [ ] Both files created in src/services/
- [ ] trayOrderService uses Prisma transaction
- [ ] staffNotificationService logs with WARN level
- [ ] TODO comments explain future integration points
- [ ] No TypeScript errors