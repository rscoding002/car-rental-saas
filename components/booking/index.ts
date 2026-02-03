/**
 * Booking Components
 *
 * Components for the booking flow and vehicle search.
 */

export { SearchWidget } from './search-widget';
export {
  AvailabilityCalendar,
  AvailabilityIndicator,
  type BookingPeriod,
} from './availability-calendar';
export {
  BranchSelector,
  SimpleBranchSelect,
  type BranchOption,
} from './branch-selector';

export {
  DurationPricingDisplay,
  DurationPricingSummary,
  type DurationPricingProps,
} from './duration-pricing';

// Multi-step booking form
export {
  BookingForm,
  BookingStepWrapper,
  BookingProvider,
  useBooking,
  type BookingStep,
  type VehicleInfo,
  type BranchInfo,
} from './booking-form';

export {
  BookingSteps,
  BookingStepsCompact,
  BookingStepsMinimal,
} from './booking-steps';

export {
  useBookingOptional,
  type BookingState,
} from './booking-context';

// Step components
export { BookingStepVehicle } from './booking-step-vehicle';
export { BookingStepAddons } from './booking-step-addons';
export { BookingStepDetails } from './booking-step-details';
export { BookingStepReview } from './booking-step-review';

// Price breakdown components
export {
  PriceBreakdown,
  PriceLine,
  PriceSummary,
  InlinePrice,
  SavingsBadge,
  type PriceBreakdownProps,
  type PriceLineProps,
  type PriceSummaryProps,
  type InlinePriceProps,
  type SavingsBadgeProps,
} from './price-breakdown';
