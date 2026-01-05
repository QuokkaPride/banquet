# 2026-01-06_05_selection-factors.md
# Step 05: Modular Selection Factor System

## Metadata
- **Order**: 05 of 11
- **Estimated Time**: 20 minutes
- **Dependencies**: Steps 02, 03, 04
- **Creates**:
  - `src/selectionFactors/types.ts`
  - `src/selectionFactors/calorieConstraintFactor.ts`
  - `src/selectionFactors/allergyFactor.ts`
  - `src/selectionFactors/textureFactor.ts`
  - `src/selectionFactors/religiousDietaryFactor.ts`
  - `src/selectionFactors/index.ts`

## Purpose
Create the modular architecture that allows future dietary constraints to be plugged in.

---

## Prompt for LLM
```
Create the modular selection factor system. This is our key architectural pattern for extensibility.

### 1. Create `src/selectionFactors/types.ts`:
Re-export SelectionFactor, SelectionContext, FactorEvaluationResult from '../types/orderingTypes'

### 2. Create `src/selectionFactors/calorieConstraintFactor.ts`:

Header comment:
- Status: ✅ ACTIVE
- Data source: DietOrder via PatientDietOrder, or system default
- This is currently the ONLY active factor

Import Recipe from @prisma/client
Import types from ./types
Import config from ../config/orderingConfig
Import createLogger

Export calorieConstraintFactor implementing SelectionFactor:

name: 'CALORIE_CONSTRAINT'
enabled: true

filter:
- Remove recipes where calories > calorieRange.maximum
- Log input/output counts

score:
- Calculate target calories per category (entree ~50%, side ~20%, beverage ~5%, dessert ~15%)
- Score based on deviation from target (closer = higher score, 0-100 range)

requiresReview:
- Return true if calorieRange.source === 'SYSTEM_DEFAULT'

### 3. Create `src/selectionFactors/allergyFactor.ts`:

Header comment:
- Status: 🚧 TODO - Not implemented
- HEALTHCARE CRITICAL: Highest weight when enabled (allergens = life-threatening)
- Required schema: Patient.allergies: string[], Recipe.allergens: string[]

Include commented-out ALLERGEN_CATEGORIES array (FDA Top 9)

Export allergyFactor implementing SelectionFactor:
- name: 'ALLERGY_SAFETY'
- enabled: false

filter:
- Log that factor not active
- Return recipes unchanged
- Include commented-out implementation showing what it WOULD do

score: Return 0 (allergies are binary, not scored)

requiresReview: Return true (always flag since we can't check)

### 4. Create `src/selectionFactors/textureFactor.ts`:

Header comment:
- Status: 🚧 TODO - Not implemented
- HEALTHCARE CRITICAL: Wrong texture for dysphagia = aspiration pneumonia risk
- Include IDDSI Framework texture levels in comments
- Required schema: Patient.textureRequirement, Recipe.textureLevel

Export textureFactor with same pattern as allergyFactor (disabled, logs, returns unchanged)

### 5. Create `src/selectionFactors/religiousDietaryFactor.ts`:

Header comment:
- Status: 🚧 TODO - Not implemented
- Important for patient dignity, cultural competence
- List common restrictions: KOSHER, HALAL, VEGETARIAN, VEGAN, HINDU
- Required schema: Patient.dietaryRestriction, Recipe.suitableFor

Export religiousDietaryFactor with same pattern (disabled)

### 6. Create `src/selectionFactors/index.ts`:

Header comment: Selection Factor Registry - add new factors here

Export ALL_SELECTION_FACTORS array in order:
1. allergyFactor (safety-critical first)
2. textureFactor (safety-critical)
3. calorieConstraintFactor (active)
4. religiousDietaryFactor

Export getActiveSelectionFactors(): Returns factors where enabled=true

Export getReviewRequiringFactors(factors, context): Returns factors where requiresReview returns true

Re-export individual factors for direct access
```

---

## Validation Checklist
- [ ] All 6 files created in src/selectionFactors/
- [ ] calorieConstraintFactor has enabled: true
- [ ] All other factors have enabled: false
- [ ] Disabled factors have comprehensive TODO comments
- [ ] index.ts exports getActiveSelectionFactors()
- [ ] No TypeScript errors