'use client';

import { useTranslations } from 'next-intl';
import { Check, Car, Package, User, FileCheck } from 'lucide-react';

import { cn } from '@/lib/utils/cn';
import type { BookingStep } from './booking-context';

// ============================================================================
// TYPES
// ============================================================================

interface BookingStepsProps {
  currentStep: BookingStep;
  completedSteps: Set<BookingStep>;
  onStepClick?: (step: BookingStep) => void;
  className?: string;
}

interface StepConfig {
  step: BookingStep;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

// ============================================================================
// STEP CONFIGURATION
// ============================================================================

const STEPS: StepConfig[] = [
  { step: 1, labelKey: 'vehicle', icon: Car },
  { step: 2, labelKey: 'extras', icon: Package },
  { step: 3, labelKey: 'details', icon: User },
  { step: 4, labelKey: 'review', icon: FileCheck },
];

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * Booking Steps Indicator
 *
 * Shows progress through the booking flow with clickable steps.
 * Mobile-first responsive design.
 */
export function BookingSteps({
  currentStep,
  completedSteps,
  onStepClick,
  className,
}: BookingStepsProps) {
  const t = useTranslations('booking.steps');

  return (
    <nav className={cn('w-full', className)} aria-label="Booking progress">
      {/* Mobile: Horizontal compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.step);
            const isCurrent = currentStep === step.step;
            const isClickable = isCompleted || isCurrent;
            const Icon = step.icon;

            return (
              <div key={step.step} className="flex flex-1 items-center">
                <button
                  onClick={() => isClickable && onStepClick?.(step.step)}
                  disabled={!isClickable}
                  className={cn(
                    'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'border-2 border-primary bg-background text-primary'
                      : 'border-2 border-muted bg-background text-muted-foreground',
                    isClickable && 'cursor-pointer hover:opacity-80',
                    !isClickable && 'cursor-not-allowed'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </button>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'mx-2 h-0.5 flex-1',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Current step label */}
        <p className="mt-2 text-center text-sm font-medium">
          {t(STEPS[currentStep - 1].labelKey)}
        </p>
      </div>

      {/* Desktop: Full horizontal with labels */}
      <div className="hidden sm:block">
        <ol className="flex items-center">
          {STEPS.map((step, index) => {
            const isCompleted = completedSteps.has(step.step);
            const isCurrent = currentStep === step.step;
            const isClickable = isCompleted || isCurrent;
            const Icon = step.icon;

            return (
              <li
                key={step.step}
                className={cn(
                  'relative flex flex-1 items-center',
                  index < STEPS.length - 1 && 'pr-8 lg:pr-12'
                )}
              >
                <button
                  onClick={() => isClickable && onStepClick?.(step.step)}
                  disabled={!isClickable}
                  className={cn(
                    'group flex items-center',
                    isClickable && 'cursor-pointer',
                    !isClickable && 'cursor-not-allowed'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {/* Step circle */}
                  <span
                    className={cn(
                      'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors',
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                        ? 'border-2 border-primary bg-background text-primary'
                        : 'border-2 border-muted bg-background text-muted-foreground',
                      isClickable && 'group-hover:opacity-80'
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>

                  {/* Step label */}
                  <span
                    className={cn(
                      'ml-3 text-sm font-medium transition-colors',
                      isCurrent
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-foreground'
                        : 'text-muted-foreground',
                      isClickable && 'group-hover:text-primary'
                    )}
                  >
                    {t(step.labelKey)}
                  </span>
                </button>

                {/* Connector line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute right-0 top-5 h-0.5 w-full -translate-y-1/2',
                      'left-[calc(50%+1.25rem)] lg:left-[calc(50%+1.5rem)]',
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    )}
                    style={{ width: 'calc(100% - 2.5rem)' }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

// ============================================================================
// COMPACT VARIANT
// ============================================================================

interface BookingStepsCompactProps {
  currentStep: BookingStep;
  totalSteps?: number;
  className?: string;
}

/**
 * Compact step indicator showing "Step X of Y"
 */
export function BookingStepsCompact({
  currentStep,
  totalSteps = 4,
  className,
}: BookingStepsCompactProps) {
  const t = useTranslations('booking');

  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">
        {t('step')} {currentStep} {t('of')} {totalSteps}
      </span>
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 w-6 rounded-full transition-colors',
              i + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MINIMAL VARIANT
// ============================================================================

interface BookingStepsMinimalProps {
  currentStep: BookingStep;
  completedSteps: Set<BookingStep>;
  className?: string;
}

/**
 * Minimal dots-only step indicator
 */
export function BookingStepsMinimal({
  currentStep,
  completedSteps,
  className,
}: BookingStepsMinimalProps) {
  return (
    <div className={cn('flex items-center justify-center gap-2', className)}>
      {STEPS.map((step) => {
        const isCompleted = completedSteps.has(step.step);
        const isCurrent = currentStep === step.step;

        return (
          <div
            key={step.step}
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              isCompleted
                ? 'bg-primary'
                : isCurrent
                ? 'border-2 border-primary bg-background'
                : 'bg-muted'
            )}
            aria-current={isCurrent ? 'step' : undefined}
          />
        );
      })}
    </div>
  );
}
