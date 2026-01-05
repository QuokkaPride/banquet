-- AlterTable: Add suitable_meal_times to recipes
ALTER TABLE "recipes" ADD COLUMN "suitable_meal_times" TEXT NOT NULL DEFAULT 'BREAKFAST,LUNCH,DINNER';
