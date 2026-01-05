# 2026-01-06_13_schema-update.md
# Step 13: Update Prisma Schema for Meal Time Suitability

## Metadata
- **Order**: 13 of 16
- **Estimated Time**: 5 minutes
- **Dependencies**: Step 12 (rationale)
- **Creates**: Updated `prisma/schema.prisma`

## Purpose
Add `suitableMealTimes` field to Recipe model so we can filter breakfast items from dinner.

---

## Prompt for LLM

Update `prisma/schema.prisma` to add a `suitableMealTimes` field to the Recipe model.

The field should:
- Be a String type
- Default to "BREAKFAST,LUNCH,DINNER" (available for all meals)
- Map to column name "suitable_meal_times"

This is the complete updated schema:
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model DietOrder {
  id String @id @default(uuid())
  name String
  minimumCalories Int? @map("minimum_calories")
  maximumCalories Int? @map("maximum_calories")
  patientDietOrders PatientDietOrder[]

  @@map("diet_orders")
}

model PatientDietOrder {
  id String @id @default(uuid())
  patient Patient @relation(fields: [patientId], references: [id])
  patientId String @map("patient_id")
  dietOrder DietOrder @relation(fields: [dietOrderId], references: [id])
  dietOrderId String @map("diet_order_id")

  @@map("patient_diet_orders")
}

model Patient {
  id String @id @default(uuid())
  name String
  trayOrders TrayOrder[]
  patientDietOrders PatientDietOrder[]

  @@map("patients")
}

model Recipe {
  id               String            @id @default(uuid())
  name             String
  category         String            @map("category")
  calories         Int               @map("calories")
  suitableMealTimes String           @default("BREAKFAST,LUNCH,DINNER") @map("suitable_meal_times")
  trayOrderRecipes TrayOrderRecipe[]

  @@map("recipes")
}

enum MealTime {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}

model TrayOrder {
  id           String            @id @default(uuid())
  scheduledFor DateTime          @default(now()) @map("scheduled_for")
  mealTime     MealTime          @default(BREAKFAST) @map("meal_time")
  recipes      TrayOrderRecipe[]
  patient      Patient           @relation(fields: [patientId], references: [id])
  patientId    String            @map("patient_id")

  @@map("tray_orders")
}

model TrayOrderRecipe {
  id          String    @id @default(uuid())
  recipe      Recipe    @relation(fields: [recipeId], references: [id])
  recipeId    String    @map("recipe_id")
  trayOrder   TrayOrder @relation(fields: [trayOrderId], references: [id])
  trayOrderId String    @map("tray_order_id")

  @@map("tray_order_recipes")
}
```

---

## Validation Checklist
- [ ] Schema updated at `prisma/schema.prisma`
- [ ] Recipe model has `suitableMealTimes` field
- [ ] Field maps to `suitable_meal_times` column
- [ ] Default value is "BREAKFAST,LUNCH,DINNER"