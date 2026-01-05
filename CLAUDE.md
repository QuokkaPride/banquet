# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Primary Goals

Before writing ANY code, ask: Does this directly help achieve one of these three goals?

1. **Auto-Order**: Automatically place meal orders for patients who haven't ordered
2. **Dietary Constraints**: Ensure orders meet calorie requirements from DietOrder
3. **AWS Deployment**: Provide production-ready AWS deployment recommendation

## Project Overview

This is the Banquet Health case challenge - a Smart Ordering system for hospital meal management. The system automatically generates meal orders for patients who haven't placed orders themselves, while respecting dietary constraints.

## Healthcare Safety Guidelines

- **When in doubt, FLAG FOR REVIEW** - set `requiresStaffReview: true`
- **Never assume** allergies, texture requirements, or dietary restrictions
- All orders using default constraints trigger staff review
- Patient safety > operational efficiency

## Commands

### Database Operations
- `npm run db-up` - Start Postgres container (runs on port 5442, not default 5432)
- `npm run db-down` - Stop Postgres container 
- `npm run db-clean` - Stop container and remove persistent data
- `npm run init-db` - Initialize and seed database with sample data
- `npm run reset-db` - Reset database to base state

### Development
- `npm start` - Run the smart ordering system (executes src/entrypoint.ts)
- `npm run test` - Run Jest tests with database reset before each test
- `npm install` - Install dependencies

### Database Connection
- Host: 127.0.0.1, Port: 5442, Database: dev, User: postgres, Password: local

## Architecture

### Core Components
- **src/smartOrder.ts** - Main implementation file for `triggerSmartOrderSystem()` function
- **src/entrypoint.ts** - Application entry point that calls the smart order system
- **src/db.ts** - Prisma client configuration with hardcoded DATABASE_URL

### Database Schema (Prisma)
- **DietOrder** - Dietary constraints with min/max calories
- **Patient** - Hospital patients
- **PatientDietOrder** - Links patients to their diet requirements
- **Recipe** - Food items with calorie information
- **TrayOrder** - Meal orders with MealTime enum (BREAKFAST, LUNCH, DINNER, SNACK)
- **TrayOrderRecipe** - Links recipes to tray orders

### Key Business Rules
- Smart ordering only for BREAKFAST, LUNCH, DINNER (not SNACK)
- Don't create duplicate orders for patients who already ordered
- Consider daily calorie limits from diet orders and existing consumption

### Test Framework
- Jest with maxWorkers: 1 and 20s timeout
- Database resets before each test via jest.setup-after-env.ts
- Sample test data in prisma/seed/rawData/ (CSV files)

### Development Environment
- TypeScript with strict mode
- Docker Compose for Postgres
- Prisma ORM for database operations
- Seed data includes patients, diet orders, recipes, and sample tray orders

## Naming Conventions

- **Functions**: Verb + Noun (e.g., `findPatientsRequiringMealOrder`, `composeMealWithinConstraints`)
- **Variables**: Descriptive nouns (e.g., `patientsNeedingOrders`, `calorieRange`)
- **Booleans**: is/has/should prefix (e.g., `isEligible`, `hasExistingOrder`, `requiresStaffReview`)

## TODO Format

```typescript
// TODO: [CATEGORY] Description
// Required: What needs to happen first
// Rationale: Why this matters
```

Categories: `SAFETY`, `SCHEMA`, `INTEGRATION`, `OPTIMIZATION`, `FEATURE`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     entrypoint.ts                            │
│                           │                                  │
│                           ▼                                  │
│                  automatedOrdering.ts                        │
│                    (orchestrator)                            │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  patientEligibility  mealComposition  trayOrderService      │
│      Service             Service           Service          │
│         │                 │                 │               │
│         ▼                 ▼                 ▼               │
│    ┌─────────────────────────────────────────┐              │
│    │           selectionFactors/             │              │
│    │  calorieConstraint │ allergy │ texture  │              │
│    └─────────────────────────────────────────┘              │
│                           │                                  │
│                           ▼                                  │
│                     Prisma (db.ts)                          │
│                           │                                  │
│                           ▼                                  │
│                      PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
npm install
npm run db-up
npm run init-db
npm test
npm start
```