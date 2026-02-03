/**
 * Web Vitals Monitoring Utility
 *
 * Provides utilities for monitoring and reporting Core Web Vitals metrics.
 * Works alongside Vercel Speed Insights for comprehensive performance monitoring.
 *
 * Core Web Vitals:
 * - LCP (Largest Contentful Paint) - Loading performance
 * - INP (Interaction to Next Paint) - Interactivity (replaced FID)
 * - CLS (Cumulative Layout Shift) - Visual stability
 *
 * Additional Metrics:
 * - TTFB (Time to First Byte) - Server response time
 * - FCP (First Contentful Paint) - First content render
 */

export type MetricName = 'LCP' | 'INP' | 'CLS' | 'FID' | 'TTFB' | 'FCP';

export interface WebVitalMetric {
  name: MetricName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

/**
 * Thresholds for Core Web Vitals ratings
 * Based on Google's Web Vitals guidelines
 * @see https://web.dev/vitals/
 */
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500, // 2.5s
    poor: 4000, // 4s
  },
  INP: {
    good: 200, // 200ms
    poor: 500, // 500ms
  },
  CLS: {
    good: 0.1,
    poor: 0.25,
  },
  FID: {
    good: 100, // 100ms
    poor: 300, // 300ms
  },
  TTFB: {
    good: 800, // 800ms
    poor: 1800, // 1.8s
  },
  FCP: {
    good: 1800, // 1.8s
    poor: 3000, // 3s
  },
} as const;

/**
 * Get rating for a metric value
 */
export function getMetricRating(
  name: MetricName,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (!thresholds) return 'needs-improvement';

  if (value <= thresholds.good) return 'good';
  if (value > thresholds.poor) return 'poor';
  return 'needs-improvement';
}

/**
 * Format metric value for display
 */
export function formatMetricValue(name: MetricName, value: number): string {
  switch (name) {
    case 'CLS':
      return value.toFixed(3);
    case 'LCP':
    case 'FCP':
    case 'TTFB':
      return `${(value / 1000).toFixed(2)}s`;
    case 'INP':
    case 'FID':
      return `${Math.round(value)}ms`;
    default:
      return String(value);
  }
}

/**
 * Get metric description
 */
export function getMetricDescription(name: MetricName): string {
  const descriptions: Record<MetricName, string> = {
    LCP: 'Largest Contentful Paint - measures loading performance',
    INP: 'Interaction to Next Paint - measures interactivity',
    CLS: 'Cumulative Layout Shift - measures visual stability',
    FID: 'First Input Delay - measures interactivity (legacy)',
    TTFB: 'Time to First Byte - measures server response time',
    FCP: 'First Contentful Paint - measures first content render',
  };
  return descriptions[name];
}

/**
 * Log metric to console in development
 */
export function logMetric(metric: WebVitalMetric): void {
  if (process.env.NODE_ENV !== 'development') return;

  const color =
    metric.rating === 'good'
      ? 'color: #0cce6b'
      : metric.rating === 'poor'
        ? 'color: #ff4e42'
        : 'color: #ffa400';

  console.log(
    `%c[Web Vitals] ${metric.name}: ${formatMetricValue(metric.name, metric.value)} (${metric.rating})`,
    color
  );
}

/**
 * Send metric to analytics endpoint
 * Override this function to send metrics to your analytics service
 */
export type MetricReporter = (metric: WebVitalMetric) => void;

/**
 * Default metric reporter - logs to console in development
 */
export const defaultMetricReporter: MetricReporter = (metric) => {
  logMetric(metric);
};

/**
 * Create a metric reporter that sends data to an API endpoint
 */
export function createApiReporter(endpoint: string): MetricReporter {
  return (metric) => {
    // Log in development
    logMetric(metric);

    // Send to API in production
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        page: typeof window !== 'undefined' ? window.location.pathname : '',
        timestamp: Date.now(),
      });

      // Use sendBeacon for reliability during page unload
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(endpoint, body);
      } else {
        fetch(endpoint, {
          method: 'POST',
          body,
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(() => {
          // Silently fail - don't block user experience
        });
      }
    }
  };
}

/**
 * Create a metric reporter for Google Analytics 4
 */
export function createGA4Reporter(): MetricReporter {
  return (metric) => {
    logMetric(metric);

    // Send to GA4 if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
      if (gtag) {
        gtag('event', metric.name, {
          event_category: 'Web Vitals',
          event_label: metric.id,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          non_interaction: true,
        });
      }
    }
  };
}

/**
 * Performance budget configuration
 * Define thresholds that trigger warnings
 */
export interface PerformanceBudget {
  LCP?: number;
  INP?: number;
  CLS?: number;
  FCP?: number;
  TTFB?: number;
}

/**
 * Default performance budget (based on "good" thresholds)
 */
export const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
  FCP: 1800,
  TTFB: 800,
};

/**
 * Check if metric exceeds budget
 */
export function checkBudget(
  metric: WebVitalMetric,
  budget: PerformanceBudget = DEFAULT_PERFORMANCE_BUDGET
): boolean {
  const threshold = budget[metric.name as keyof PerformanceBudget];
  if (threshold === undefined) return true;
  return metric.value <= threshold;
}
