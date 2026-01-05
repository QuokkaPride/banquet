# 2026-01-06_03_configuration.md
# Step 03: Configuration & Constants

## Metadata
- **Order**: 03 of 11
- **Estimated Time**: 10 minutes
- **Dependencies**: Step 02 (types)
- **Creates**: `src/config/orderingConfig.ts`

## Purpose
Centralize all configuration values with comprehensive documentation about healthcare safety rationale.

---

## Prompt for LLM
```
Create `src/config/orderingConfig.ts` with all system configuration.

Include a header comment block explaining:
- HEALTHCARE SAFETY PRINCIPLES: When in doubt, flag for review; use conservative defaults; alert care team
- DEFAULT MEAL PHILOSOPHY: Research shows hospitals use "Regular Diet" as default. We don't over-restrict (GF, vegan) because overly restrictive diets risk malnutrition. Our pattern: Standard meal + Flag for review.

1. TIMING CONFIGURATION:
ADVANCE_ORDER_HOURS = 3 (comment: gives kitchen prep time)

MEAL_SERVICE_TIMES = {
  BREAKFAST: 8,
  LUNCH: 12,
  DINNER: 18,
  // SNACK intentionally omitted - not auto-ordered per requirements
}

2. CALORIE CONFIGURATION:
DEFAULT_CALORIE_RANGE: CalorieRange = {
  minimum: 1500,
  maximum: 2000,
  source: 'SYSTEM_DEFAULT'
}
Include detailed comment: This is conservative default. Using defaults ALWAYS triggers staff review. NOT calculated from demographics (requires clinical assessment). In production, triggers alerts to nursing station, dietitian queue.

3. MEAL COMPOSITION RULES:
MEAL_COMPOSITION_RULES = {
  minEntrees: 1, maxEntrees: 1,
  minSides: 0, maxSides: 2,
  minBeverages: 0, maxBeverages: 1,
  minDesserts: 0, maxDesserts: 1,  // Comment: Dessert is food type, not snack occasion
}

Include INTERPRETATION NOTE about Snack vs Dessert:
- SNACK (MealTime enum) = Between-meal occasion → NOT auto-ordered
- Desserts (Recipe category) = Food type → CAN be included
- If interpretation wrong, set maxDesserts to 0

4. RECIPE CATEGORIES:
Match database values exactly: 'Entrees', 'Sides', 'Beverages', 'Desserts'

5. SELECTION FACTORS CONFIG:
Object showing each factor with:
- enabled: boolean (true only for CALORIE_CONSTRAINT)
- weight: number
- description: string
- schemaRequired: string (for disabled factors)
- reviewReasonIfMissing: ReviewReason

Factors to include:
- CALORIE_CONSTRAINT: enabled=true, weight=100
- ALLERGY_SAFETY: enabled=false, weight=1000 (safety-critical)
- TEXTURE_MODIFICATION: enabled=false, weight=500
- RELIGIOUS_DIETARY: enabled=false, weight=200
- CULTURAL_PREFERENCE: enabled=false, weight=50
- REJECTION_HISTORY: enabled=false, weight=75
- COST_OPTIMIZATION: enabled=false, weight=25
- KITCHEN_EFFICIENCY: enabled=false, weight=25
- INGREDIENT_AVAILABILITY: enabled=false, weight=150

6. MANDATORY_REVIEW_TRIGGERS: ReviewReason[] (always trigger review)

Import CalorieRange and ReviewReason from types.
```

---

## Validation Checklist
- [ ] File created at `src/config/orderingConfig.ts`
- [ ] Imports types correctly
- [ ] Healthcare rationale documented in comments
- [ ] All disabled factors explain what schema changes are needed
- [ ] No TypeScript errors