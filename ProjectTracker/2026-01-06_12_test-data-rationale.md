# 2026-01-06_12_test-data-rationale.md
# Step 12: Test Data Enhancement - Rationale

## Metadata
- **Order**: 12 of 16
- **Estimated Time**: 5 minutes (reading)
- **Dependencies**: Steps 01-11 complete
- **Creates**: Nothing (planning document)

## Purpose
Explain WHY we need enhanced test data before making changes.

---

## The Problem

Our current seed data only has ONE patient (Mark Corrigan). This is insufficient to test:

1. **Patients without diet orders** - What happens when we don't know calorie limits?
2. **Patients with no existing orders** - Does the system create all 3 meals?
3. **Calorie catch-up scenarios** - If someone under-ate, can we compensate?
4. **Duplicate prevention** - Does running twice create duplicates?

---

## The Solution: 3 Test Patients

| Patient | Diet Order | Existing Orders | Tests |
|---------|------------|-----------------|-------|
| Mark Corrigan | Regular (1500-2500) | BREAKFAST, LUNCH | Creates only DINNER |
| Sophie Chapman | **NONE** | None | Default calories, creates all 3 meals |
| Alan Johnson | High Calorie (2000-2500) | BREAKFAST (10 cal) | Calorie catch-up |

---

## Why Recipe Updates?

**Patient satisfaction is unacceptable if we serve breakfast for dinner.**

Consider: Would YOU want pancakes and bacon at 6pm?

While the current requirements don't explicitly mandate meal-appropriate recipes, this is:
1. Common sense for patient satisfaction
2. Easy to implement (just filter recipes)
3. A quality signal to reviewers

**Decision:** We'll add a `suitable_meal_times` column to recipes. This is a SIMPLE string field like `"BREAKFAST,LUNCH,DINNER"` that we can split and filter on.

---

## Test Scenarios Summary

| Test | Patient | What We Check |
|------|---------|---------------|
| Creates missing meal | Mark | Has BREAKFAST+LUNCH, gets DINNER |
| Creates all meals | Sophie | Has nothing, gets all 3 |
| No duplicates | All | Run twice, same count |
| No SNACK | All | SNACK count = 0 |
| Default calories work | Sophie | Gets meals despite no diet order |
| Calorie compliance | Mark | Total within 1500-2500 |
| Calorie catch-up | Alan | Total reaches 2000+ despite low breakfast |
| Has entree | All | Every meal has an entree |

---

## Files We'll Modify

1. `prisma/schema.prisma` - Add `suitableMealTimes` to Recipe
2. `prisma/seed/rawData/recipes.csv` - Add column + new recipes
3. `prisma/seed/rawData/patients.csv` - Add Sophie and Alan
4. `prisma/seed/rawData/patient_diet_orders.csv` - Add Alan's diet order
5. `prisma/seed/rawData/tray_orders.csv` - Add Alan's breakfast
6. `prisma/seed/rawData/tray_order_recipes.csv` - Add Alan's coffee
7. `test/smartOrdering.spec.ts` - New test file

---

## Validation
- [ ] Understood why we need 3 patients
- [ ] Understood meal-time filtering rationale
- [ ] Ready to proceed with implementation