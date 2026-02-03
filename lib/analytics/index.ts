/**
 * Analytics Module
 *
 * Exports utilities for web analytics and performance monitoring.
 *
 * This module works alongside Vercel Analytics (@vercel/analytics) and
 * Vercel Speed Insights (@vercel/speed-insights) which are configured
 * in the root layout.
 *
 * @example
 * // Import web vitals utilities
 * import { getMetricRating, formatMetricValue, WEB_VITALS_THRESHOLDS } from '@/lib/analytics';
 *
 * // Check metric rating
 * const rating = getMetricRating('LCP', 2100); // 'good'
 */

export {
  // Types
  type MetricName,
  type WebVitalMetric,
  type MetricReporter,
  type PerformanceBudget,
  // Constants
  WEB_VITALS_THRESHOLDS,
  DEFAULT_PERFORMANCE_BUDGET,
  // Functions
  getMetricRating,
  formatMetricValue,
  getMetricDescription,
  logMetric,
  defaultMetricReporter,
  createApiReporter,
  createGA4Reporter,
  checkBudget,
} from './web-vitals';
