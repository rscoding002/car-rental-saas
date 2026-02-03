/**
 * Booking Validation Unit Tests
 *
 * Tests for the pure utility functions and Zod schemas in the booking module.
 * These tests don't require database connections.
 */

import {
  // Status check functions
  isBookingCancellable,
  isBookingModifiable,
  isBookingBlocking,
  isBookingUpcoming,
  isBookingInProgress,
  // Date/time utilities
  getHoursUntilPickup,
  calculateDurationDays,
  validateBookingDates,
  // One-way utilities
  isOneWayRental,
  // Format functions
  formatBookingStatus,
  getStatusColorClass,
  formatBookingSource,
  // Refund calculation
  calculateRefund,
  // Constants
  DEFAULT_CANCELLATION_POLICY,
  BOOKING_STATUSES,
  CANCELLABLE_STATUSES,
  MODIFIABLE_STATUSES,
  BLOCKING_STATUSES,
  ACTIVE_BOOKING_STATUSES,
  MIN_RENTAL_HOURS,
  MAX_RENTAL_DAYS,
  // Zod schemas
  bookingStatusSchema,
  paymentStatusSchema,
  bookingSourceSchema,
  cancellationReasonTypeSchema,
  dateTimeSchema,
  phoneSchema,
  driverLicenseSchema,
  driverInfoSchema,
  addonSelectionSchema,
  createBookingSchema,
  updateBookingSchema,
  vehicleSearchSchema,
  bookingListFiltersSchema,
  cancellationSchema,
  modificationSchema,
  bookingStep1Schema,
  bookingStep2Schema,
  bookingStep3Schema,
  bookingStep4Schema,
  // Types
  type BookingStatus,
  type BookingPricing,
  type CancellationPolicy,
} from '@/lib/booking/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createBookingPricing = (total: number = 100): BookingPricing => ({
  baseRate: 50,
  rateType: 'daily',
  duration: 2,
  subtotal: 100,
  total,
  currency: 'EUR',
});

const createCancellationPolicy = (
  overrides: Partial<CancellationPolicy> = {}
): CancellationPolicy => ({
  ...DEFAULT_CANCELLATION_POLICY,
  ...overrides,
});

// Helper to create dates relative to now
const hoursFromNow = (hours: number): string => {
  const date = new Date();
  date.setTime(date.getTime() + hours * 60 * 60 * 1000);
  return date.toISOString();
};

const daysFromNow = (days: number): string => {
  return hoursFromNow(days * 24);
};

// ============================================================================
// STATUS CHECK FUNCTION TESTS
// ============================================================================

describe('isBookingCancellable', () => {
  it('should return true for pending status', () => {
    expect(isBookingCancellable('pending')).toBe(true);
  });

  it('should return true for confirmed status', () => {
    expect(isBookingCancellable('confirmed')).toBe(true);
  });

  it('should return false for active status', () => {
    expect(isBookingCancellable('active')).toBe(false);
  });

  it('should return false for completed status', () => {
    expect(isBookingCancellable('completed')).toBe(false);
  });

  it('should return false for cancelled status', () => {
    expect(isBookingCancellable('cancelled')).toBe(false);
  });

  it('should match CANCELLABLE_STATUSES constant', () => {
    BOOKING_STATUSES.forEach((status) => {
      expect(isBookingCancellable(status)).toBe(CANCELLABLE_STATUSES.includes(status));
    });
  });
});

describe('isBookingModifiable', () => {
  it('should return true for pending status', () => {
    expect(isBookingModifiable('pending')).toBe(true);
  });

  it('should return true for confirmed status', () => {
    expect(isBookingModifiable('confirmed')).toBe(true);
  });

  it('should return false for active status', () => {
    expect(isBookingModifiable('active')).toBe(false);
  });

  it('should return false for completed status', () => {
    expect(isBookingModifiable('completed')).toBe(false);
  });

  it('should return false for cancelled status', () => {
    expect(isBookingModifiable('cancelled')).toBe(false);
  });

  it('should match MODIFIABLE_STATUSES constant', () => {
    BOOKING_STATUSES.forEach((status) => {
      expect(isBookingModifiable(status)).toBe(MODIFIABLE_STATUSES.includes(status));
    });
  });
});

describe('isBookingBlocking', () => {
  it('should return true for pending status', () => {
    expect(isBookingBlocking('pending')).toBe(true);
  });

  it('should return true for confirmed status', () => {
    expect(isBookingBlocking('confirmed')).toBe(true);
  });

  it('should return true for active status', () => {
    expect(isBookingBlocking('active')).toBe(true);
  });

  it('should return false for completed status', () => {
    expect(isBookingBlocking('completed')).toBe(false);
  });

  it('should return false for cancelled status', () => {
    expect(isBookingBlocking('cancelled')).toBe(false);
  });

  it('should match BLOCKING_STATUSES constant', () => {
    BOOKING_STATUSES.forEach((status) => {
      expect(isBookingBlocking(status)).toBe(BLOCKING_STATUSES.includes(status));
    });
  });
});

describe('isBookingUpcoming', () => {
  it('should return true for future pending booking', () => {
    const booking = {
      pickupAt: daysFromNow(7),
      status: 'pending' as BookingStatus,
    };
    expect(isBookingUpcoming(booking)).toBe(true);
  });

  it('should return true for future confirmed booking', () => {
    const booking = {
      pickupAt: daysFromNow(3),
      status: 'confirmed' as BookingStatus,
    };
    expect(isBookingUpcoming(booking)).toBe(true);
  });

  it('should return false for past pickup time', () => {
    const booking = {
      pickupAt: daysFromNow(-1),
      status: 'pending' as BookingStatus,
    };
    expect(isBookingUpcoming(booking)).toBe(false);
  });

  it('should return false for cancelled booking', () => {
    const booking = {
      pickupAt: daysFromNow(7),
      status: 'cancelled' as BookingStatus,
    };
    expect(isBookingUpcoming(booking)).toBe(false);
  });

  it('should return false for completed booking', () => {
    const booking = {
      pickupAt: daysFromNow(7),
      status: 'completed' as BookingStatus,
    };
    expect(isBookingUpcoming(booking)).toBe(false);
  });
});

describe('isBookingInProgress', () => {
  it('should return true for active booking within date range', () => {
    const booking = {
      pickupAt: daysFromNow(-1),
      returnAt: daysFromNow(3),
      status: 'active' as BookingStatus,
    };
    expect(isBookingInProgress(booking)).toBe(true);
  });

  it('should return false for active booking not yet started', () => {
    const booking = {
      pickupAt: daysFromNow(1),
      returnAt: daysFromNow(5),
      status: 'active' as BookingStatus,
    };
    expect(isBookingInProgress(booking)).toBe(false);
  });

  it('should return false for active booking already ended', () => {
    const booking = {
      pickupAt: daysFromNow(-5),
      returnAt: daysFromNow(-1),
      status: 'active' as BookingStatus,
    };
    expect(isBookingInProgress(booking)).toBe(false);
  });

  it('should return false for non-active status', () => {
    const booking = {
      pickupAt: daysFromNow(-1),
      returnAt: daysFromNow(3),
      status: 'confirmed' as BookingStatus,
    };
    expect(isBookingInProgress(booking)).toBe(false);
  });
});

// ============================================================================
// DATE/TIME UTILITY TESTS
// ============================================================================

describe('getHoursUntilPickup', () => {
  it('should return positive hours for future pickup', () => {
    const pickupAt = hoursFromNow(24);
    const hours = getHoursUntilPickup(pickupAt);
    expect(hours).toBeGreaterThan(23);
    expect(hours).toBeLessThan(25);
  });

  it('should return 0 for past pickup', () => {
    const pickupAt = hoursFromNow(-5);
    const hours = getHoursUntilPickup(pickupAt);
    expect(hours).toBe(0);
  });

  it('should return approximately correct hours', () => {
    const pickupAt = hoursFromNow(48);
    const hours = getHoursUntilPickup(pickupAt);
    expect(hours).toBeGreaterThan(47);
    expect(hours).toBeLessThan(49);
  });
});

describe('calculateDurationDays', () => {
  it('should return 1 for same day rental', () => {
    const days = calculateDurationDays(
      '2024-01-10T08:00:00Z',
      '2024-01-10T18:00:00Z'
    );
    expect(days).toBe(1);
  });

  it('should return 1 for exactly 24 hours', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T10:00:00Z'
    );
    expect(days).toBe(1);
  });

  it('should round up to 2 days for 25 hours', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T11:00:00Z'
    );
    expect(days).toBe(2);
  });

  it('should calculate 7 days for a week', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-17T10:00:00Z'
    );
    expect(days).toBe(7);
  });

  it('should calculate 30 days for a month', () => {
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-02-09T10:00:00Z'
    );
    expect(days).toBe(30);
  });

  it('should handle hour boundary correctly', () => {
    // 23 hours should be 1 day
    const days = calculateDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T09:00:00Z'
    );
    expect(days).toBe(1);
  });
});

describe('validateBookingDates', () => {
  it('should return valid for proper future dates', () => {
    const result = validateBookingDates(
      hoursFromNow(24),
      hoursFromNow(48)
    );
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject pickup in the past', () => {
    const result = validateBookingDates(
      hoursFromNow(-1),
      hoursFromNow(24)
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Pickup must be at least');
  });

  it('should reject pickup too soon (default 1 hour notice)', () => {
    const result = validateBookingDates(
      hoursFromNow(0.5),
      hoursFromNow(24)
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Pickup must be at least');
  });

  it('should reject return before pickup', () => {
    const result = validateBookingDates(
      hoursFromNow(48),
      hoursFromNow(24)
    );
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Return time must be after pickup time');
  });

  it('should reject return equal to pickup', () => {
    const sameTime = hoursFromNow(24);
    const result = validateBookingDates(sameTime, sameTime);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Return time must be after pickup time');
  });

  it('should reject duration less than minimum', () => {
    const result = validateBookingDates(
      hoursFromNow(24),
      hoursFromNow(24.5),
      { minDurationHours: 2 }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum rental duration');
  });

  it('should reject duration exceeding maximum', () => {
    const result = validateBookingDates(
      hoursFromNow(24),
      daysFromNow(400),
      { maxDurationDays: 365 }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum rental duration');
  });

  it('should respect custom minHoursNotice', () => {
    const result = validateBookingDates(
      hoursFromNow(3),
      hoursFromNow(27),
      { minHoursNotice: 6 }
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain('6 hour');
  });

  it('should accept booking at exact boundary', () => {
    const result = validateBookingDates(
      hoursFromNow(2),
      hoursFromNow(26),
      { minHoursNotice: 1 }
    );
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// ONE-WAY RENTAL TESTS
// ============================================================================

describe('isOneWayRental', () => {
  it('should return false for same branches', () => {
    expect(isOneWayRental('branch-1', 'branch-1')).toBe(false);
  });

  it('should return true for different branches', () => {
    expect(isOneWayRental('branch-1', 'branch-2')).toBe(true);
  });
});

// ============================================================================
// FORMAT FUNCTION TESTS
// ============================================================================

describe('formatBookingStatus', () => {
  it('should format all statuses correctly', () => {
    expect(formatBookingStatus('pending')).toBe('Pending');
    expect(formatBookingStatus('confirmed')).toBe('Confirmed');
    expect(formatBookingStatus('active')).toBe('Active');
    expect(formatBookingStatus('completed')).toBe('Completed');
    expect(formatBookingStatus('cancelled')).toBe('Cancelled');
  });
});

describe('getStatusColorClass', () => {
  it('should return correct color classes', () => {
    expect(getStatusColorClass('pending')).toContain('yellow');
    expect(getStatusColorClass('confirmed')).toContain('blue');
    expect(getStatusColorClass('active')).toContain('green');
    expect(getStatusColorClass('completed')).toContain('gray');
    expect(getStatusColorClass('cancelled')).toContain('red');
  });
});

describe('formatBookingSource', () => {
  it('should format all sources correctly', () => {
    expect(formatBookingSource('website')).toBe('Website');
    expect(formatBookingSource('admin')).toBe('Admin');
    expect(formatBookingSource('phone')).toBe('Phone');
    expect(formatBookingSource('walkin')).toBe('Walk-in');
    expect(formatBookingSource('api')).toBe('API');
  });
});

// ============================================================================
// REFUND CALCULATION TESTS
// ============================================================================

describe('calculateRefund', () => {
  describe('full refund tier', () => {
    it('should return 100% refund when well before free cancellation deadline', () => {
      const booking = {
        pickupAt: hoursFromNow(72), // 72 hours from now
        pricing: createBookingPricing(100),
      };
      const policy = createCancellationPolicy({ freeCancellationHours: 48 });

      const result = calculateRefund(booking, policy);

      expect(result.refundPercent).toBe(100);
      expect(result.refundAmount).toBe(100);
      expect(result.retainedAmount).toBe(0);
      expect(result.policyTier).toBe('full');
      expect(result.isEligible).toBe(true);
    });

    it('should return 100% at exactly free cancellation boundary', () => {
      const booking = {
        pickupAt: hoursFromNow(48),
        pricing: createBookingPricing(200),
      };
      const policy = createCancellationPolicy({ freeCancellationHours: 48 });

      const result = calculateRefund(booking, policy);

      expect(result.policyTier).toBe('full');
      expect(result.refundAmount).toBe(200);
    });
  });

  describe('partial refund tier', () => {
    it('should return partial refund between deadlines', () => {
      const booking = {
        pickupAt: hoursFromNow(36), // Between 48 and 24 hours
        pricing: createBookingPricing(100),
      };
      const policy = createCancellationPolicy({
        freeCancellationHours: 48,
        partialRefundHours: 24,
        partialRefundPercent: 50,
      });

      const result = calculateRefund(booking, policy);

      expect(result.policyTier).toBe('partial');
      expect(result.refundPercent).toBe(50);
      expect(result.refundAmount).toBe(50);
      expect(result.retainedAmount).toBe(50);
      expect(result.cancellationFee).toBe(50);
      expect(result.isEligible).toBe(true);
    });

    it('should return partial refund at exact partial boundary', () => {
      const booking = {
        pickupAt: hoursFromNow(24),
        pricing: createBookingPricing(200),
      };
      const policy = createCancellationPolicy({
        freeCancellationHours: 48,
        partialRefundHours: 24,
        partialRefundPercent: 75,
      });

      const result = calculateRefund(booking, policy);

      expect(result.policyTier).toBe('partial');
      expect(result.refundAmount).toBe(150);
    });
  });

  describe('no refund tier', () => {
    it('should return 0 refund when too close to pickup', () => {
      const booking = {
        pickupAt: hoursFromNow(12), // Less than 24 hours
        pricing: createBookingPricing(100),
      };
      const policy = createCancellationPolicy({ partialRefundHours: 24 });

      const result = calculateRefund(booking, policy);

      expect(result.policyTier).toBe('none');
      expect(result.refundPercent).toBe(0);
      expect(result.refundAmount).toBe(0);
      expect(result.retainedAmount).toBe(100);
      expect(result.isEligible).toBe(false);
    });

    it('should return 0 refund when cancellation not allowed', () => {
      const booking = {
        pickupAt: hoursFromNow(100),
        pricing: createBookingPricing(100),
      };
      const policy = createCancellationPolicy({ allowCancellation: false });

      const result = calculateRefund(booking, policy);

      expect(result.policyTier).toBe('none');
      expect(result.refundAmount).toBe(0);
      expect(result.isEligible).toBe(false);
    });
  });

  describe('currency and rounding', () => {
    it('should preserve currency from booking', () => {
      const booking = {
        pickupAt: hoursFromNow(72),
        pricing: { ...createBookingPricing(100), currency: 'USD' },
      };
      const policy = createCancellationPolicy();

      const result = calculateRefund(booking, policy);

      expect(result.currency).toBe('USD');
    });

    it('should round refund amounts correctly', () => {
      const booking = {
        pickupAt: hoursFromNow(36),
        pricing: createBookingPricing(99.99),
      };
      const policy = createCancellationPolicy({ partialRefundPercent: 33 });

      const result = calculateRefund(booking, policy);

      // 99.99 * 0.33 = 32.9967 -> rounds to 33.00
      expect(result.refundAmount).toBe(33);
    });
  });
});

// ============================================================================
// ZOD SCHEMA TESTS
// ============================================================================

describe('bookingStatusSchema', () => {
  it('should accept valid statuses', () => {
    BOOKING_STATUSES.forEach((status) => {
      expect(bookingStatusSchema.safeParse(status).success).toBe(true);
    });
  });

  it('should reject invalid status', () => {
    expect(bookingStatusSchema.safeParse('invalid').success).toBe(false);
  });
});

describe('paymentStatusSchema', () => {
  it('should accept valid payment statuses', () => {
    const validStatuses = ['unpaid', 'pending', 'paid', 'partially_refunded', 'refunded', 'failed'];
    validStatuses.forEach((status) => {
      expect(paymentStatusSchema.safeParse(status).success).toBe(true);
    });
  });

  it('should reject invalid payment status', () => {
    expect(paymentStatusSchema.safeParse('unknown').success).toBe(false);
  });
});

describe('bookingSourceSchema', () => {
  it('should accept valid sources', () => {
    const validSources = ['website', 'admin', 'phone', 'walkin', 'api'];
    validSources.forEach((source) => {
      expect(bookingSourceSchema.safeParse(source).success).toBe(true);
    });
  });
});

describe('cancellationReasonTypeSchema', () => {
  it('should accept valid reason types', () => {
    const validReasons = [
      'customer_request',
      'vehicle_unavailable',
      'payment_failed',
      'no_show',
      'force_majeure',
      'other',
    ];
    validReasons.forEach((reason) => {
      expect(cancellationReasonTypeSchema.safeParse(reason).success).toBe(true);
    });
  });
});

describe('dateTimeSchema', () => {
  it('should accept valid ISO datetime strings', () => {
    expect(dateTimeSchema.safeParse('2024-01-10T10:00:00Z').success).toBe(true);
    expect(dateTimeSchema.safeParse('2024-06-15T14:30:00.000Z').success).toBe(true);
  });

  it('should reject invalid datetime strings', () => {
    expect(dateTimeSchema.safeParse('invalid').success).toBe(false);
    expect(dateTimeSchema.safeParse('2024-13-45').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('should accept valid phone numbers', () => {
    expect(phoneSchema.safeParse('+37060000000').success).toBe(true);
    expect(phoneSchema.safeParse('860000000').success).toBe(true);
    expect(phoneSchema.safeParse('+1 (555) 123-4567').success).toBe(true);
  });

  it('should reject too short phone numbers', () => {
    expect(phoneSchema.safeParse('12345').success).toBe(false);
  });

  it('should reject phone numbers with invalid characters', () => {
    expect(phoneSchema.safeParse('phone@number').success).toBe(false);
  });
});

describe('driverInfoSchema', () => {
  it('should validate complete driver info', () => {
    const driverInfo = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+37060000000',
    };

    const result = driverInfoSchema.safeParse(driverInfo);
    expect(result.success).toBe(true);
  });

  it('should validate driver info with optional fields', () => {
    const driverInfo = {
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      phone: '860000000',
      dateOfBirth: '1990-05-15',
      driverLicense: {
        number: 'ABC123456',
        expiryDate: '2025-12-31',
        country: 'LT',
      },
    };

    const result = driverInfoSchema.safeParse(driverInfo);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const driverInfo = {
      firstName: 'John',
      // missing lastName
      email: 'john@example.com',
      phone: '+37060000000',
    };

    const result = driverInfoSchema.safeParse(driverInfo);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email', () => {
    const driverInfo = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid-email',
      phone: '+37060000000',
    };

    const result = driverInfoSchema.safeParse(driverInfo);
    expect(result.success).toBe(false);
  });
});

describe('addonSelectionSchema', () => {
  it('should validate valid addon selection', () => {
    const selection = {
      addonId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 2,
    };

    const result = addonSelectionSchema.safeParse(selection);
    expect(result.success).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const selection = {
      addonId: 'not-a-uuid',
      quantity: 1,
    };

    const result = addonSelectionSchema.safeParse(selection);
    expect(result.success).toBe(false);
  });

  it('should reject quantity less than 1', () => {
    const selection = {
      addonId: '123e4567-e89b-12d3-a456-426614174000',
      quantity: 0,
    };

    const result = addonSelectionSchema.safeParse(selection);
    expect(result.success).toBe(false);
  });
});

describe('createBookingSchema', () => {
  const validInput = {
    vehicleId: '123e4567-e89b-12d3-a456-426614174000',
    pickupBranchId: '123e4567-e89b-12d3-a456-426614174001',
    returnBranchId: '123e4567-e89b-12d3-a456-426614174002',
    pickupAt: hoursFromNow(24),
    returnAt: hoursFromNow(72),
    driverInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+37060000000',
    },
  };

  it('should validate complete booking input', () => {
    const result = createBookingSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should validate booking with addons', () => {
    const input = {
      ...validInput,
      addons: [
        { addonId: '123e4567-e89b-12d3-a456-426614174003', quantity: 1 },
        { addonId: '123e4567-e89b-12d3-a456-426614174004', quantity: 2 },
      ],
    };

    const result = createBookingSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject return before pickup', () => {
    const input = {
      ...validInput,
      pickupAt: hoursFromNow(72),
      returnAt: hoursFromNow(24),
    };

    const result = createBookingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject pickup less than 1 hour from now', () => {
    const input = {
      ...validInput,
      pickupAt: hoursFromNow(0.5),
    };

    const result = createBookingSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('vehicleSearchSchema', () => {
  it('should validate search input', () => {
    const input = {
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: hoursFromNow(24),
      returnAt: hoursFromNow(72),
    };

    const result = vehicleSearchSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept optional filters', () => {
    const input = {
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174000',
      returnBranchId: '123e4567-e89b-12d3-a456-426614174001',
      pickupAt: hoursFromNow(24),
      returnAt: hoursFromNow(72),
      categoryId: '123e4567-e89b-12d3-a456-426614174002',
      transmission: 'automatic',
      fuelType: 'petrol',
      minSeats: 4,
      features: ['air_conditioning', 'gps'],
    };

    const result = vehicleSearchSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('bookingListFiltersSchema', () => {
  it('should validate empty filters', () => {
    const result = bookingListFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('should validate all filter options', () => {
    const input = {
      status: ['pending', 'confirmed'],
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      search: 'REF123',
      sortBy: 'pickup_at',
      sortOrder: 'desc',
      page: 2,
      pageSize: 50,
    };

    const result = bookingListFiltersSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should provide default pagination', () => {
    const result = bookingListFiltersSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

describe('cancellationSchema', () => {
  it('should validate cancellation input', () => {
    const input = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'Customer changed travel plans',
      reasonType: 'customer_request',
      requestRefund: true,
    };

    const result = cancellationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty reason', () => {
    const input = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      reason: '',
      reasonType: 'customer_request',
      requestRefund: true,
    };

    const result = cancellationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject reason exceeding max length', () => {
    const input = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      reason: 'x'.repeat(501),
      reasonType: 'customer_request',
      requestRefund: true,
    };

    const result = cancellationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('modificationSchema', () => {
  it('should validate date modification', () => {
    const input = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: hoursFromNow(48),
      returnAt: hoursFromNow(96),
    };

    const result = modificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate addon modification', () => {
    const input = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      addons: [
        { addonId: '123e4567-e89b-12d3-a456-426614174001', quantity: 1 },
      ],
    };

    const result = modificationSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid date order', () => {
    const input = {
      bookingId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: hoursFromNow(96),
      returnAt: hoursFromNow(48),
    };

    const result = modificationSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('bookingStep1Schema', () => {
  it('should validate step 1 data', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174001',
      returnBranchId: '123e4567-e89b-12d3-a456-426614174002',
      pickupAt: hoursFromNow(24),
      returnAt: hoursFromNow(72),
    };

    const result = bookingStep1Schema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('bookingStep2Schema', () => {
  it('should validate step 2 with empty addons', () => {
    const result = bookingStep2Schema.safeParse({ addons: [] });
    expect(result.success).toBe(true);
  });

  it('should validate step 2 with addons', () => {
    const input = {
      addons: [
        { addonId: '123e4567-e89b-12d3-a456-426614174000', quantity: 1 },
      ],
    };

    const result = bookingStep2Schema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('bookingStep3Schema', () => {
  it('should validate step 3 driver info', () => {
    const input = {
      driverInfo: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+37060000000',
      },
    };

    const result = bookingStep3Schema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('bookingStep4Schema', () => {
  it('should validate step 4 with terms accepted', () => {
    const input = {
      acceptTerms: true,
    };

    const result = bookingStep4Schema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject when terms not accepted', () => {
    const input = {
      acceptTerms: false,
    };

    const result = bookingStep4Schema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional coupon code', () => {
    const input = {
      couponCode: 'SAVE20',
      acceptTerms: true,
    };

    const result = bookingStep4Schema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
  it('should have correct booking statuses', () => {
    expect(BOOKING_STATUSES).toContain('pending');
    expect(BOOKING_STATUSES).toContain('confirmed');
    expect(BOOKING_STATUSES).toContain('active');
    expect(BOOKING_STATUSES).toContain('completed');
    expect(BOOKING_STATUSES).toContain('cancelled');
    expect(BOOKING_STATUSES.length).toBe(5);
  });

  it('should have correct cancellable statuses', () => {
    expect(CANCELLABLE_STATUSES).toContain('pending');
    expect(CANCELLABLE_STATUSES).toContain('confirmed');
    expect(CANCELLABLE_STATUSES).not.toContain('active');
  });

  it('should have correct modifiable statuses', () => {
    expect(MODIFIABLE_STATUSES).toContain('pending');
    expect(MODIFIABLE_STATUSES).toContain('confirmed');
    expect(MODIFIABLE_STATUSES).not.toContain('active');
  });

  it('should have correct blocking statuses', () => {
    expect(BLOCKING_STATUSES).toContain('pending');
    expect(BLOCKING_STATUSES).toContain('confirmed');
    expect(BLOCKING_STATUSES).toContain('active');
    expect(BLOCKING_STATUSES).not.toContain('completed');
  });

  it('should have correct active booking statuses', () => {
    expect(ACTIVE_BOOKING_STATUSES).toContain('pending');
    expect(ACTIVE_BOOKING_STATUSES).toContain('confirmed');
    expect(ACTIVE_BOOKING_STATUSES).toContain('active');
  });

  it('should have correct default cancellation policy', () => {
    expect(DEFAULT_CANCELLATION_POLICY.freeCancellationHours).toBe(48);
    expect(DEFAULT_CANCELLATION_POLICY.partialRefundHours).toBe(24);
    expect(DEFAULT_CANCELLATION_POLICY.partialRefundPercent).toBe(50);
    expect(DEFAULT_CANCELLATION_POLICY.allowCancellation).toBe(true);
  });

  it('should have correct rental constraints', () => {
    expect(MIN_RENTAL_HOURS).toBe(1);
    expect(MAX_RENTAL_DAYS).toBe(365);
  });
});
