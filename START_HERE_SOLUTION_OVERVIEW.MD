# SOLUTION_OVERVIEW.md
# Smart Ordering System - Solution Overview

**Candidate:** Devon Saliga
**Time Spent:** ~3 hours
**Date:** 2026-01-06

---

## Executive Summary

This solution implements an automated meal ordering system for hospital patients who haven't placed their own orders. While the requirements appear straightforward, hospital meal ordering sits at the intersection of **patient safety**, **nutritional compliance**, and **operational logistics**—making it deceptively complex.

**The system successfully:**
1. ✅ Auto-places orders for patients missing meals (BREAKFAST, LUNCH, DINNER only)
2. ✅ Ensures orders meet dietary calorie constraints from physician orders
3. ✅ Provides AWS deployment architecture (see `systemDesign/`)

---

## The Hidden Complexity

### It's Not Just "Pick Food Under X Calories"

Consider what happens when we order dinner for a patient:

| Naive Approach | Production Reality |
|----------------|-------------------|
| Pick any recipes under calorie limit | Don't serve pancakes for dinner |
| Ignore what they've already eaten | Account for daily consumption so far |
| Assume all patients have diet orders | Handle missing data gracefully |
| One-size-fits-all portions | Patient who skipped lunch needs more at dinner |

### Real Example: Alan Johnson

Alan is on a **High Calorie diet (2000-2500 cal/day)**. He only had coffee for breakfast (10 calories). By lunch/dinner, our system must recognize:

- **Consumed:** 10 cal (breakfast)
- **Minimum remaining:** 1,990 cal across lunch + dinner
- **Challenge:** Standard meals are ~500-700 cal each
- **Solution:** System composes larger meals to catch up

This isn't edge-case handling—it's **core healthcare functionality**. Malnourished patients recover slower.

---

## Architecture Decisions

### 1. Modular Selection Factor System

Instead of hardcoding meal logic, I built an extensible factor system:

```
┌─────────────────────────────────────────────────────────┐
│                  Selection Factors                       │
├─────────────────────────────────────────────────────────┤
│ ✅ CALORIE_CONSTRAINT    │ Active - enforces diet order │
│ 🚧 ALLERGY_SAFETY        │ Ready - needs schema field   │
│ 🚧 TEXTURE_MODIFICATION  │ Ready - needs schema field   │
│ 🚧 RELIGIOUS_DIETARY     │ Ready - needs schema field   │
│ ✅ MEAL_TIME_SUITABILITY │ Active - no pancakes@dinner  │
└─────────────────────────────────────────────────────────┘
```

**Why this matters:** Adding allergy filtering later is a config change, not a rewrite.

### 2. Graceful Degradation for Missing Data

Not all patients have diet orders. Rather than fail:

```typescript
// Patient without diet order → Use safe defaults + FLAG FOR REVIEW
if (!dietOrder) {
  return {
    calories: DEFAULT_RANGE,      // 1500-2000 (conservative)
    requiresStaffReview: true,    // Alert nursing station
    reviewReason: 'DEFAULT_CALORIE_CONSTRAINTS'
  };
}
```

**Healthcare principle:** Never let a patient go hungry because of missing paperwork.

### 3. Meal-Appropriate Recipe Filtering

Added `suitable_meal_times` to recipes:

| Recipe | Suitable For | Rationale |
|--------|--------------|-----------|
| Pancakes | BREAKFAST | Patient satisfaction |
| Coffee | BREAKFAST, LUNCH | No caffeine at dinner |
| Salmon | LUNCH, DINNER | Dinner-appropriate protein |
| Water | ALL | Always available |

**Small detail, big impact:** Serving breakfast food at dinner signals "the system doesn't care about me."

---

## Test Coverage

I created 3 test patients to validate distinct scenarios:

| Patient | Diet Order | Existing Orders | Tests |
|---------|------------|-----------------|-------|
| Mark Corrigan | Regular (1500-2500) | BREAKFAST, LUNCH | Creates only missing DINNER |
| Sophie Chapman | **NONE** | None | Default handling, creates all 3 |
| Alan Johnson | High Cal (2000-2500) | BREAKFAST (10 cal) | Calorie catch-up scenario |

### Key Test Cases

```
✓ Creates missing meals (not duplicates)
✓ Never creates SNACK orders
✓ Handles patients without diet orders
✓ Daily calories within diet order range
✓ Calorie catch-up for under-eaten patients
✓ Each meal contains at least one entree
✓ No breakfast items served at dinner
✓ Idempotent (running twice = same result)
```

---

## Production Considerations

### The "Feed First" Principle

In healthcare, **patients must eat**. The system is designed around this principle:

```
┌─────────────────────────────────────────────────────────────────┐
│  PRINCIPLE: Start preparing food, even with incomplete data.   │
│                                                                 │
│  Missing diet order?     → Use safe defaults + FLAG for review │
│  Missing allergy info?   → Use standard meal + FLAG for review │
│  Approval pending?       → Prepare meal + ALERT staff          │
│                                                                 │
│  A flagged meal is better than a missed meal.                  │
└─────────────────────────────────────────────────────────────────┘
```

Healthcare professionals can intervene and modify—but the kitchen starts working immediately.

### Scheduling & Time-Based Ordering

In production, this system runs on a schedule tied to meal service windows:

| Trigger Time | Meal | Kitchen Lead Time |
|--------------|------|-------------------|
| 5:00 AM | BREAKFAST (8 AM service) | 3 hours |
| 9:00 AM | LUNCH (12 PM service) | 3 hours |
| 3:00 PM | DINNER (6 PM service) | 3 hours |

**Current implementation:** Accepts a `targetDate` parameter for testing.
**Production implementation:** EventBridge cron triggers Lambda at each window, system only creates orders for the *upcoming* meal—not all three at once.

```typescript
// Production behavior (not yet implemented)
// At 5:00 AM → only process BREAKFAST
// At 9:00 AM → only process LUNCH
// At 3:00 PM → only process DINNER
```

### Alert & Escalation System

Orders requiring human review need to reach the right people at the right time:

| Flag | Priority | Notification Target | SLA |
|------|----------|--------------------| ----|
| `DEFAULT_CALORIE_CONSTRAINTS` | Medium | Dietitian queue | Before meal service |
| `MISSING_ALLERGY_DATA` | **HIGH** | Nursing station + Dietitian | Immediate |
| `MISSING_TEXTURE_REQUIREMENT` | **HIGH** | Nursing station | Immediate |
| `CALORIE_CATCH_UP_REQUIRED` | Medium | Dietitian queue | Before next meal |

**Current implementation:** Flags are logged and returned in `OrderingRunSummary`.
**Production implementation:** SNS topics trigger alerts to nursing stations, create tasks in EMR systems.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Smart Order  │────▶│  SNS Topic   │────▶│   Nursing    │
│   System     │     │  (by priority)│     │   Station    │
└──────────────┘     └──────────────┘     └──────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │  Dietitian   │
                     │    Queue     │
                     └──────────────┘
```

---

## What I Would Add With More Time

### Safety-Critical (Next Sprint)
| Feature | Why It Matters | Schema Change |
|---------|----------------|---------------|
| Allergy filtering | **Life-threatening** if wrong | `Patient.allergies[]`, `Recipe.allergens[]` |
| Texture modification | Dysphagia → choking risk | `Patient.textureLevel`, `Recipe.textureLevel` |
| NPO status check | Pre-surgery patients cannot eat | `Patient.npoUntil` |
| Real-time alerts | Staff must know about flagged orders | SNS integration |

### Scheduling & Operations
| Feature | Benefit |
|---------|---------|
| Time-window ordering | Only create upcoming meal, not full day |
| Kitchen batch optimization | Group similar meals for prep efficiency |
| Ingredient availability check | Don't order unavailable items |
| Cost optimization | Stay within budget while meeting nutrition |

### Integration Points
| System | Purpose |
|--------|---------|
| EMR/EHR | Pull latest diet orders, allergy data |
| Nursing station dashboard | Real-time flagged order visibility |
| Kitchen display system | Prep queue with special instructions |
| Dietitian workflow | Review queue for orders using defaults |

---

## Code Quality Signals

Despite the 3-hour constraint, I maintained production standards:

1. **Comprehensive logging** - Every order logs patient, calories, review flags
2. **Type safety** - Full TypeScript interfaces for all data structures
3. **Modular architecture** - Services are single-responsibility
4. **Healthcare-aware comments** - TODOs explain clinical rationale
5. **Testable design** - Functions accept date parameter for deterministic testing

---

## Files to Review

| Priority | File | What It Shows |
|----------|------|---------------|
| 🔴 High | `src/smartOrder.ts` | Core implementation |
| 🔴 High | `test/smartOrdering.spec.ts` | Test coverage & scenarios |
| 🟡 Medium | `src/services/` | Modular service design |
| 🟡 Medium | `src/config/orderingConfig.ts` | Configurable defaults |
| 🟢 Low | `systemDesign/README.md` | AWS architecture |
| 🟢 Low | `CLAUDE.md` | Development standards |
| 🟢 Low | `ProjectTracker/` | Implementation methodology |

---

## Running the Solution

```bash
# Setup
npm install
npm run db-up
npm run init-db

# Run tests (validates all requirements)
npm test

# Execute the system
npm start
```

---

## Final Thoughts

Hospital meal ordering is a **patient care** problem disguised as a **logistics** problem. The difference between a good system and a great one isn't just calorie math—it's recognizing that:

- A patient who skipped lunch may be **hungry**, not just "below target"
- Serving pancakes at dinner says "you're a number, not a person"
- Missing allergy data is a **safety gap**, not a validation error
- **Patients must eat**—flag concerns, but start preparing food immediately

I've built a foundation that handles the core requirements while making it straightforward to add the safety-critical features a production system would need.

---

*Questions? I'm happy to walk through any part of the implementation.*