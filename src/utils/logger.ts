/**
 * Structured JSON Logger for Healthcare Audit Compliance
 *
 * Why logging matters in healthcare:
 * - Audit compliance: Track all decisions for regulatory review
 * - Incident investigation: Trace what happened and when
 * - Quality improvement: Identify patterns and issues
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: Record<string, unknown>;
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
}

/**
 * Creates a logger for a specific component.
 *
 * @param component - The component name (e.g., 'PatientEligibilityService')
 * @returns Logger instance with info, warn, error methods
 *
 * @example
 * const logger = createLogger('MealCompositionService');
 * logger.info('Composing meal', { patientId: '123', mealTime: 'LUNCH' });
 */
export function createLogger(component: string): Logger {
  const log = (level: LogLevel, message: string, data?: Record<string, unknown>) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      ...(data && { data }),
    };

    const formatted = formatLog(entry);

    switch (level) {
      case 'INFO':
        console.log(formatted);
        break;
      case 'WARN':
        console.warn(formatted);
        break;
      case 'ERROR':
        console.error(formatted);
        break;
    }
  };

  return {
    info: (message: string, data?: Record<string, unknown>) => log('INFO', message, data),
    warn: (message: string, data?: Record<string, unknown>) => log('WARN', message, data),
    error: (message: string, data?: Record<string, unknown>) => log('ERROR', message, data),
  };
}
