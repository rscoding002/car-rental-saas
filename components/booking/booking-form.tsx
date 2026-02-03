'use client';

import { useCallback, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import {
  BookingProvider,
  useBooking,
  type BookingStep,
  type VehicleInfo,
  type BranchInfo,
} from './booking-context';
import { BookingSteps, BookingStepsCompact } from './booking-steps';
import type { Addon } from '@/lib/supabase/types';
import type { PricingBreakdown } from '@/lib/pricing/types';

// ============================================================================
// TYPES
// ============================================================================

interface BookingFormProps {
  /** Initial step to show */
  initialStep?: BookingStep;

  /** Vehicle information */
  vehicle: VehicleInfo;

  /** Pickup branch */
  pickupBranch: BranchInfo;

  /** Return branch */
  returnBranch: BranchInfo;

  /** Pickup date/time */
  pickupAt: string;

  /** Return date/time */
  returnAt: string;

  /** Number of rental days */
  rentalDays: number;

  /** Initial pricing breakdown */
  pricing?: PricingBreakdown | null;

  /** Available addons */
  addons?: Addon[];

  /** Locale for translations */
  locale: string;

  /** Step content renderers */
  children: ReactNode;

  /** Custom class name */
  className?: string;
}

interface BookingFormContentProps {
  children: ReactNode;
  locale: string;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Multi-Step Booking Form
 *
 * Wraps the booking flow with context and navigation.
 * Children should be the step content components.
 */
export function BookingForm({
  initialStep = 1,
  vehicle,
  pickupBranch,
  returnBranch,
  pickupAt,
  returnAt,
  rentalDays,
  pricing,
  addons = [],
  locale,
  children,
  className,
}: BookingFormProps) {
  // Build initial state
  const initialState = {
    currentStep: initialStep,
    vehicle,
    pickupBranch,
    returnBranch,
    rentalDays,
    isOneWay: pickupBranch.id !== returnBranch.id,
    pricing: pricing || null,
    availableAddons: addons,
    step1Data: {
      vehicleId: vehicle.id,
      pickupBranchId: pickupBranch.id,
      returnBranchId: returnBranch.id,
      pickupAt,
      returnAt,
    },
    // Mark step 1 as complete since we have vehicle/dates from search
    completedSteps: new Set<BookingStep>([1]),
  };

  return (
    <BookingProvider initialData={initialState}>
      <BookingFormContent locale={locale} className={className}>
        {children}
      </BookingFormContent>
    </BookingProvider>
  );
}

// ============================================================================
// FORM CONTENT
// ============================================================================

function BookingFormContent({
  children,
  locale,
  className,
}: BookingFormContentProps) {
  const t = useTranslations('booking');
  const {
    state,
    goToStep,
    nextStep,
    prevStep,
    canGoToStep,
    isStepComplete,
    markStepComplete,
    setError,
  } = useBooking();

  const handleStepClick = useCallback(
    (step: BookingStep) => {
      if (canGoToStep(step)) {
        goToStep(step);
      }
    },
    [canGoToStep, goToStep]
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Step Progress */}
      <div className="mb-6 sm:mb-8">
        {/* Mobile: Compact */}
        <div className="sm:hidden">
          <BookingStepsCompact currentStep={state.currentStep} />
        </div>

        {/* Desktop: Full */}
        <div className="hidden sm:block">
          <BookingSteps
            currentStep={state.currentStep}
            completedSteps={state.completedSteps}
            onStepClick={handleStepClick}
          />
        </div>
      </div>

      {/* Error Alert */}
      {state.error && (
        <Alert variant="destructive" className="mb-6">
          {state.error}
          <button
            onClick={() => setError(null)}
            className="ml-2 underline hover:no-underline"
          >
            {t('dismiss')}
          </button>
        </Alert>
      )}

      {/* Step Content */}
      <div className="relative">
        {state.isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

// ============================================================================
// STEP WRAPPER
// ============================================================================

interface BookingStepWrapperProps {
  /** Step number this wrapper is for */
  step: BookingStep;

  /** Step title */
  title?: string;

  /** Step description */
  description?: string;

  /** Step content */
  children: ReactNode;

  /** Show navigation buttons */
  showNavigation?: boolean;

  /** Custom next button text */
  nextButtonText?: string;

  /** Custom back button text */
  backButtonText?: string;

  /** Disable next button */
  nextDisabled?: boolean;

  /** Custom next handler (called before navigation) */
  onNext?: () => Promise<boolean> | boolean;

  /** Custom back handler (called before navigation) */
  onBack?: () => void;

  /** Hide back button */
  hideBack?: boolean;

  /** Hide next button (for final step) */
  hideNext?: boolean;

  /** Additional footer content */
  footerContent?: ReactNode;

  /** Custom class name */
  className?: string;
}

/**
 * Wrapper for individual booking steps
 *
 * Provides consistent layout and navigation.
 */
export function BookingStepWrapper({
  step,
  title,
  description,
  children,
  showNavigation = true,
  nextButtonText,
  backButtonText,
  nextDisabled = false,
  onNext,
  onBack,
  hideBack = false,
  hideNext = false,
  footerContent,
  className,
}: BookingStepWrapperProps) {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');
  const {
    state,
    nextStep,
    prevStep,
    markStepComplete,
    setLoading,
    setError,
  } = useBooking();

  // Only render if this is the current step
  if (state.currentStep !== step) {
    return null;
  }

  const handleNext = async () => {
    setError(null);

    if (onNext) {
      setLoading(true);
      try {
        const canProceed = await onNext();
        if (canProceed) {
          markStepComplete(step);
          nextStep();
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    } else {
      markStepComplete(step);
      nextStep();
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
    prevStep();
  };

  return (
    <Card className={cn('w-full', className)}>
      {(title || description) && (
        <CardHeader>
          {title && <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>}
          {description && (
            <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
          )}
        </CardHeader>
      )}

      <CardContent>{children}</CardContent>

      {showNavigation && (
        <CardFooter className="flex flex-col gap-4 border-t pt-6 sm:flex-row sm:justify-between">
          {footerContent && (
            <div className="w-full sm:w-auto">{footerContent}</div>
          )}

          <div className="flex w-full gap-3 sm:ml-auto sm:w-auto">
            {!hideBack && step > 1 && (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={state.isLoading}
                className="flex-1 sm:flex-none"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backButtonText || tCommon('back')}
              </Button>
            )}

            {!hideNext && (
              <Button
                onClick={handleNext}
                disabled={nextDisabled || state.isLoading}
                className="flex-1 sm:flex-none"
              >
                {state.isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {nextButtonText || tCommon('next')}
                {!state.isLoading && step < 4 && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export { useBooking, BookingProvider } from './booking-context';
export type { BookingStep, VehicleInfo, BranchInfo } from './booking-context';
