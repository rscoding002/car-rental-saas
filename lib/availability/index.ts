/**
 * Availability Module Exports
 *
 * Central export point for availability types, interfaces, and utilities.
 */

// Types & Interfaces
export type {
  // Enums & Constants
  UnavailabilityReason,
  AvailabilityBlockType,
  RecurrencePattern,
  // Date Range Types
  DateTimeRange,
  DateRange,
  // Query Types
  AvailabilityQueryInput,
  AvailabilitySearchInput,
  CalendarQueryInput,
  // Result Types
  AvailabilityResult,
  ConflictingBooking,
  AvailableVehicle,
  // Calendar Types
  DayAvailability,
  CalendarBooking,
  CalendarBlock,
  CalendarData,
  CalendarStats,
  // Block Types
  AvailabilityBlock,
  AvailabilityBlockInsert,
  AvailabilityBlockUpdate,
  // Buffer Time Types
  BufferTimeSettings,
  CategoryBufferTime,
  VehicleBufferTime,
  EffectiveBufferTime,
  // One-Way Types
  OneWayAvailability,
  // Input Types
  CreateAvailabilityBlockInput,
  UpdateAvailabilityBlockInput,
} from './types';

// Zod Schemas
export {
  dateTimeSchema,
  dateOnlySchema,
  availabilityBlockTypeSchema,
  recurrencePatternSchema,
  availabilityQuerySchema,
  availabilitySearchSchema,
  calendarQuerySchema,
  createAvailabilityBlockSchema,
  updateAvailabilityBlockSchema,
  bufferTimeSettingsSchema,
} from './types';

// Utility Functions
export {
  dateRangesOverlap,
  isDateInRange,
  getDurationHours,
  getDurationDays,
  addBufferTime,
  subtractBufferTime,
  getEffectiveBufferTime,
  isOneWayRental,
  getDatesBetween,
  formatBlockType,
  formatUnavailabilityReason,
} from './types';

// Constants
export {
  DEFAULT_BUFFER_MINUTES,
  MIN_RENTAL_HOURS,
  MAX_ADVANCE_BOOKING_DAYS,
  AVAILABILITY_BLOCK_TYPE_OPTIONS,
  RECURRENCE_PATTERN_OPTIONS,
  BLOCKING_BOOKING_STATUSES,
  AVAILABLE_VEHICLE_STATUSES,
} from './types';

// Query Functions
export {
  // Single vehicle availability
  checkVehicleAvailability,
  checkMultipleVehiclesAvailability,
  // Available vehicles search
  searchAvailableVehicles,
  getAvailableVehicleCount,
  // Booking conflicts
  getConflictingBookings,
  canModifyBookingDates,
  // Buffer time (from queries)
  getBufferTimeSettings,
  getVehicleBufferTime,
  // Date range utilities
  getVehiclesBookedOnDate,
  getDailyAvailabilityCounts,
} from './queries';

// One-Way Rental Types
export type {
  OneWayConfig,
  OneWayFeeStructure,
  OneWayZoneFee,
  OneWayRoute,
  BranchPair,
} from './one-way';

// One-Way Rental Functions
export {
  // Availability checks
  checkOneWayAvailability,
  getOneWayRoutes,
  getAvailableReturnBranches,
  // Fee calculation
  calculateOneWayFee,
  // Validation
  validateOneWayBranches,
  // Display utilities
  formatOneWayFee,
  getOneWaySummary,
} from './one-way';

// Availability Blocks Management
export {
  // Read operations
  getBlockById,
  getVehicleBlocks,
  getTenantBlocks,
  getConflictingBlocks,
  hasActiveBlocks,
  getBlocksForCalendar,
  getUpcomingBlocks,
  // Write operations
  createBlock,
  updateBlock,
  deactivateBlock,
  reactivateBlock,
  deleteBlock,
  bulkDeactivateBlocks,
  deleteExpiredBlocks,
  // Quick block creation
  createMaintenanceBlock,
  createReservationBlock,
  createAllDayBlock,
  createMultiDayBlock,
  // Statistics
  getBlockStats,
  getVehicleBlockSummary,
  // Utilities
  formatBlockDuration,
  getBlockStatus,
} from './blocks';

// Buffer Time Calculator
export {
  // Buffer time resolution
  getTenantBufferTimeSettings,
  resolveVehicleBufferTime,
  resolveMultipleVehicleBufferTimes,
  // Buffer time management
  updateTenantBufferTime,
  updateCategoryBufferTime,
  updateVehicleBufferTime,
  clearCategoryBufferTime,
  clearVehicleBufferTime,
  // Buffer time calculation utilities
  calculateBufferedPickupTime,
  calculateBufferedReturnTime,
  getBufferedTimeRange,
  hasBufferConflict,
  // Display utilities
  formatBufferTime,
  getBufferTimeDescription,
  // Presets & validation
  BUFFER_TIME_PRESETS,
  isValidBufferTime,
} from './buffer-time';
