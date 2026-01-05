# 2026-01-06_01_claude-md-standards.md
# Step 01: CLAUDE.md Development Standards

## Metadata
- **Order**: 01 of 11
- **Estimated Time**: 5 minutes
- **Dependencies**: None
- **Creates**: `CLAUDE.md`

## Purpose
Establish development standards BEFORE writing any code. This ensures all subsequent code follows consistent patterns.

---

## Prompt for LLM
```
Create or replace `CLAUDE.md` in the project root with comprehensive development guidelines.

Requirements:
1. State the 3 primary goals at the top (auto-order, dietary constraints, AWS deployment)
2. Include "Before writing ANY code, ask: Does this directly help achieve one of the three goals?"
3. Define naming conventions:
   - Functions: Verb + Noun (e.g., findPatientsRequiringMealOrder)
   - Variables: Descriptive nouns (e.g., patientsNeedingOrders)
   - Booleans: is/has/should prefix (e.g., isEligible)
4. Define TODO format:
   // TODO: [CATEGORY] Description
   // Required: What needs to happen first
   // Rationale: Why this matters
   Categories: SAFETY, SCHEMA, INTEGRATION, OPTIMIZATION, FEATURE
5. Healthcare guidelines:
   - When in doubt, FLAG FOR REVIEW
   - Never silently assume allergies, texture, dietary restrictions
   - All assumptions must trigger requiresStaffReview: true
6. Logging standards:
   - All operations must log start, completion, warnings, errors
   - Every order must log: patientId, orderId, mealTime, calorieSource, reviewReasons
7. Include quick reference:
   - File locations table
   - Commands (npm run db-up, npm test, npm start)
   - Decision checklist before writing code
8. Include architecture summary diagram (ASCII)

Keep it concise - this is a reference document, not a novel.
```

---

## Validation Checklist
- [ ] File created at project root
- [ ] 3 goals clearly stated at top
- [ ] Naming conventions documented
- [ ] TODO format defined
- [ ] Healthcare safety guidelines included
- [ ] Quick reference section present