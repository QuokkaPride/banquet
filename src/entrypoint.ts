import { executeAutomatedMealOrdering } from './automatedOrdering';
import { createLogger } from './utils/logger';

const logger = createLogger('Entrypoint');

async function main() {
  logger.info('Starting automated meal ordering system');

  try {
    const summary = await executeAutomatedMealOrdering();

    logger.info('Ordering run complete', {
      ordersCreated: summary.ordersCreated,
      ordersFailed: summary.ordersFailed,
      ordersRequiringReview: summary.ordersRequiringReview,
    });

    // Log individual outcomes
    for (const outcome of summary.outcomes) {
      if (outcome.success) {
        console.log(
          `  ✓ ${outcome.patientName} - ${outcome.mealTime}: ${outcome.totalCalories} cal` +
            (outcome.requiresStaffReview ? ' [REVIEW REQUIRED]' : '')
        );
      } else {
        console.log(
          `  ✗ ${outcome.patientName} - ${outcome.mealTime}: ${outcome.failureReason}`
        );
      }
    }
  } catch (error) {
    logger.error('Fatal error in meal ordering system', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
