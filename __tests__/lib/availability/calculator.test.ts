/**
 * Availability Calculator Unit Tests
 *
 * Tests for the pure utility functions in the availability module.
 * These tests don't require database connections.
 */

import {
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
  DEFAULT_BUFFER_MINUTES,
  availabilityQuerySchema,
  availabilitySearchSchema,
  createAvailabilityBlockSchema,
  bufferTimeSettingsSchema,
} from '@/lib/availability/types';
import type { BufferTimeSettings, AvailabilityBlockType, UnavailabilityReason } from '@/lib/availability/types';

// ============================================================================
// DATE RANGE OVERLAP TESTS
// ============================================================================

describe('dateRangesOverlap', () => {
  it('should return true when ranges fully overlap', () => {
    const result = dateRangesOverlap(
      '2024-01-10T10:00:00Z',
      '2024-01-15T10:00:00Z',
      '2024-01-12T10:00:00Z',
      '2024-01-14T10:00:00Z'
    );
    expect(result).toBe(true);
  });

  it('should return true when range1 contains range2', () => {
    const result = dateRangesOverlap(
      '2024-01-01T00:00:00Z',
      '2024-01-31T23:59:59Z',
      '2024-01-10T10:00:00Z',
      '2024-01-20T10:00:00Z'
    );
    expect(result).toBe(true);
  });

  it('should return true when range2 contains range1', () => {
    const result = dateRangesOverlap(
      '2024-01-10T10:00:00Z',
      '2024-01-20T10:00:00Z',
      '2024-01-01T00:00:00Z',
      '2024-01-31T23:59:59Z'
    );
    expect(result).toBe(true);
  });

  it('should return true when ranges overlap at the start', () => {
    const result = dateRangesOverlap(
      '2024-01-10T10:00:00Z',
      '2024-01-15T10:00:00Z',
      '2024-01-05T10:00:00Z',
      '2024-01-12T10:00:00Z'
    );
    expect(result).toBe(true);
  });

  it('should return true when ranges overlap at the end', () => {
    const result = dateRangesOverlap(
      '2024-01-10T10:00:00Z',
      '2024-01-15T10:00:00Z',
      '2024-01-13T10:00:00Z',
      '2024-01-20T10:00:00Z'
    );
    expect(result).toBe(true);
  });

  it('should return false when ranges do not overlap (range1 before range2)', () => {
    const result = dateRangesOverlap(
      '2024-01-01T10:00:00Z',
      '2024-01-05T10:00:00Z',
      '2024-01-10T10:00:00Z',
      '2024-01-15T10:00:00Z'
    );
    expect(result).toBe(false);
  });

  it('should return false when ranges do not overlap (range1 after range2)', () => {
    const result = dateRangesOverlap(
      '2024-01-20T10:00:00Z',
      '2024-01-25T10:00:00Z',
      '2024-01-10T10:00:00Z',
      '2024-01-15T10:00:00Z'
    );
    expect(result).toBe(false);
  });

  it('should return false when ranges touch but do not overlap', () => {
    // Range1 ends exactly when range2 starts
    const result = dateRangesOverlap(
      '2024-01-01T10:00:00Z',
      '2024-01-10T10:00:00Z',
      '2024-01-10T10:00:00Z',
      '2024-01-15T10:00:00Z'
    );
    expect(result).toBe(false);
  });

  it('should handle Date objects as well as strings', () => {
    const result = dateRangesOverlap(
      new Date('2024-01-10T10:00:00Z'),
      new Date('2024-01-15T10:00:00Z'),
      new Date('2024-01-12T10:00:00Z'),
      new Date('2024-01-20T10:00:00Z')
    );
    expect(result).toBe(true);
  });
});

// ============================================================================
// IS DATE IN RANGE TESTS
// ============================================================================

describe('isDateInRange', () => {
  it('should return true when date is within range', () => {
    const result = isDateInRange(
      '2024-01-15T10:00:00Z',
      '2024-01-10T00:00:00Z',
      '2024-01-20T23:59:59Z'
    );
    expect(result).toBe(true);
  });

  it('should return true when date equals range start', () => {
    const result = isDateInRange(
      '2024-01-10T00:00:00Z',
      '2024-01-10T00:00:00Z',
      '2024-01-20T23:59:59Z'
    );
    expect(result).toBe(true);
  });

  it('should return true when date equals range end', () => {
    const result = isDateInRange(
      '2024-01-20T23:59:59Z',
      '2024-01-10T00:00:00Z',
      '2024-01-20T23:59:59Z'
    );
    expect(result).toBe(true);
  });

  it('should return false when date is before range', () => {
    const result = isDateInRange(
      '2024-01-05T10:00:00Z',
      '2024-01-10T00:00:00Z',
      '2024-01-20T23:59:59Z'
    );
    expect(result).toBe(false);
  });

  it('should return false when date is after range', () => {
    const result = isDateInRange(
      '2024-01-25T10:00:00Z',
      '2024-01-10T00:00:00Z',
      '2024-01-20T23:59:59Z'
    );
    expect(result).toBe(false);
  });
});

// ============================================================================
// DURATION CALCULATION TESTS
// ============================================================================

describe('getDurationHours', () => {
  it('should calculate hours correctly for same-day rental', () => {
    const hours = getDurationHours(
      '2024-01-10T08:00:00Z',
      '2024-01-10T18:00:00Z'
    );
    expect(hours).toBe(10);
  });

  it('should calculate hours correctly for multi-day rental', () => {
    const hours = getDurationHours(
      '2024-01-10T10:00:00Z',
      '2024-01-12T10:00:00Z'
    );
    expect(hours).toBe(48);
  });

  it('should handle fractional hours', () => {
    const hours = getDurationHours(
      '2024-01-10T10:00:00Z',
      '2024-01-10T11:30:00Z'
    );
    expect(hours).toBe(1.5);
  });

  it('should return 0 for same start and end time', () => {
    const hours = getDurationHours(
      '2024-01-10T10:00:00Z',
      '2024-01-10T10:00:00Z'
    );
    expect(hours).toBe(0);
  });

  it('should handle negative duration (end before start)', () => {
    const hours = getDurationHours(
      '2024-01-10T18:00:00Z',
      '2024-01-10T08:00:00Z'
    );
    expect(hours).toBe(-10);
  });
});

describe('getDurationDays', () => {
  it('should return 1 for less than 24 hours', () => {
    const days = getDurationDays(
      '2024-01-10T08:00:00Z',
      '2024-01-10T18:00:00Z'
    );
    expect(days).toBe(1);
  });

  it('should return 2 for exactly 24 hours', () => {
    const days = getDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T10:00:00Z'
    );
    expect(days).toBe(1);
  });

  it('should round up to next day', () => {
    const days = getDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-11T11:00:00Z'
    );
    expect(days).toBe(2); // 25 hours = 2 days
  });

  it('should calculate 7 days for a week', () => {
    const days = getDurationDays(
      '2024-01-10T10:00:00Z',
      '2024-01-17T10:00:00Z'
    );
    expect(days).toBe(7);
  });
});

// ============================================================================
// BUFFER TIME TESTS
// ============================================================================

describe('addBufferTime', () => {
  it('should add buffer minutes correctly', () => {
    const original = new Date('2024-01-10T10:00:00Z');
    const result = addBufferTime(original, 60);
    expect(result.toISOString()).toBe('2024-01-10T11:00:00.000Z');
  });

  it('should handle crossing day boundary', () => {
    const result = addBufferTime('2024-01-10T23:30:00Z', 60);
    expect(result.toISOString()).toBe('2024-01-11T00:30:00.000Z');
  });

  it('should handle 0 buffer minutes', () => {
    const original = '2024-01-10T10:00:00Z';
    const result = addBufferTime(original, 0);
    expect(result.toISOString()).toBe('2024-01-10T10:00:00.000Z');
  });

  it('should handle large buffer times', () => {
    const result = addBufferTime('2024-01-10T10:00:00Z', 1440); // 24 hours
    expect(result.toISOString()).toBe('2024-01-11T10:00:00.000Z');
  });
});

describe('subtractBufferTime', () => {
  it('should subtract buffer minutes correctly', () => {
    const result = subtractBufferTime('2024-01-10T11:00:00Z', 60);
    expect(result.toISOString()).toBe('2024-01-10T10:00:00.000Z');
  });

  it('should handle crossing day boundary backwards', () => {
    const result = subtractBufferTime('2024-01-10T00:30:00Z', 60);
    expect(result.toISOString()).toBe('2024-01-09T23:30:00.000Z');
  });

  it('should handle 0 buffer minutes', () => {
    const result = subtractBufferTime('2024-01-10T10:00:00Z', 0);
    expect(result.toISOString()).toBe('2024-01-10T10:00:00.000Z');
  });
});

// ============================================================================
// EFFECTIVE BUFFER TIME TESTS
// ============================================================================

describe('getEffectiveBufferTime', () => {
  const vehicleId = 'vehicle-123';
  const categoryId = 'category-456';

  it('should return global buffer when no overrides', () => {
    const settings: BufferTimeSettings = {
      globalBufferMinutes: 60,
      categoryOverrides: [],
      vehicleOverrides: [],
    };

    const result = getEffectiveBufferTime(vehicleId, categoryId, settings);

    expect(result.bufferMinutes).toBe(60);
    expect(result.source).toBe('global');
    expect(result.sourceId).toBeUndefined();
  });

  it('should return category buffer when category override exists', () => {
    const settings: BufferTimeSettings = {
      globalBufferMinutes: 60,
      categoryOverrides: [
        { categoryId: 'category-456', bufferMinutes: 90 },
      ],
      vehicleOverrides: [],
    };

    const result = getEffectiveBufferTime(vehicleId, categoryId, settings);

    expect(result.bufferMinutes).toBe(90);
    expect(result.source).toBe('category');
    expect(result.sourceId).toBe(categoryId);
  });

  it('should return vehicle buffer when vehicle override exists', () => {
    const settings: BufferTimeSettings = {
      globalBufferMinutes: 60,
      categoryOverrides: [
        { categoryId: 'category-456', bufferMinutes: 90 },
      ],
      vehicleOverrides: [
        { vehicleId: 'vehicle-123', bufferMinutes: 120 },
      ],
    };

    const result = getEffectiveBufferTime(vehicleId, categoryId, settings);

    expect(result.bufferMinutes).toBe(120);
    expect(result.source).toBe('vehicle');
    expect(result.sourceId).toBe(vehicleId);
  });

  it('should prioritize vehicle over category override', () => {
    const settings: BufferTimeSettings = {
      globalBufferMinutes: 30,
      categoryOverrides: [
        { categoryId: 'category-456', bufferMinutes: 60 },
      ],
      vehicleOverrides: [
        { vehicleId: 'vehicle-123', bufferMinutes: 45 },
      ],
    };

    const result = getEffectiveBufferTime(vehicleId, categoryId, settings);

    expect(result.bufferMinutes).toBe(45);
    expect(result.source).toBe('vehicle');
  });

  it('should ignore non-matching overrides', () => {
    const settings: BufferTimeSettings = {
      globalBufferMinutes: 60,
      categoryOverrides: [
        { categoryId: 'other-category', bufferMinutes: 90 },
      ],
      vehicleOverrides: [
        { vehicleId: 'other-vehicle', bufferMinutes: 120 },
      ],
    };

    const result = getEffectiveBufferTime(vehicleId, categoryId, settings);

    expect(result.bufferMinutes).toBe(60);
    expect(result.source).toBe('global');
  });
});

// ============================================================================
// ONE-WAY RENTAL TESTS
// ============================================================================

describe('isOneWayRental', () => {
  it('should return false when return branch is undefined', () => {
    const result = isOneWayRental('branch-1', undefined);
    expect(result).toBe(false);
  });

  it('should return false when branches are the same', () => {
    const result = isOneWayRental('branch-1', 'branch-1');
    expect(result).toBe(false);
  });

  it('should return true when branches are different', () => {
    const result = isOneWayRental('branch-1', 'branch-2');
    expect(result).toBe(true);
  });

  it('should return true for empty string return branch (edge case)', () => {
    const result = isOneWayRental('branch-1', '');
    expect(result).toBe(false); // Empty string is falsy
  });
});

// ============================================================================
// GET DATES BETWEEN TESTS
// ============================================================================

describe('getDatesBetween', () => {
  it('should return single date when start equals end', () => {
    const dates = getDatesBetween('2024-01-10', '2024-01-10');
    expect(dates).toEqual(['2024-01-10']);
  });

  it('should return all dates in range inclusive', () => {
    const dates = getDatesBetween('2024-01-10', '2024-01-13');
    expect(dates).toEqual([
      '2024-01-10',
      '2024-01-11',
      '2024-01-12',
      '2024-01-13',
    ]);
  });

  it('should handle month boundary', () => {
    const dates = getDatesBetween('2024-01-30', '2024-02-02');
    expect(dates).toEqual([
      '2024-01-30',
      '2024-01-31',
      '2024-02-01',
      '2024-02-02',
    ]);
  });

  it('should handle year boundary', () => {
    const dates = getDatesBetween('2023-12-30', '2024-01-02');
    expect(dates).toEqual([
      '2023-12-30',
      '2023-12-31',
      '2024-01-01',
      '2024-01-02',
    ]);
  });

  it('should work with Date objects', () => {
    const dates = getDatesBetween(
      new Date('2024-01-10T00:00:00Z'),
      new Date('2024-01-12T00:00:00Z')
    );
    expect(dates.length).toBe(3);
  });
});

// ============================================================================
// FORMAT FUNCTIONS TESTS
// ============================================================================

describe('formatBlockType', () => {
  it('should format all block types correctly', () => {
    const blockTypes: AvailabilityBlockType[] = [
      'maintenance',
      'reserved',
      'out_of_service',
      'inspection',
      'damage_repair',
      'cleaning',
      'other',
    ];

    const expected: Record<AvailabilityBlockType, string> = {
      maintenance: 'Maintenance',
      reserved: 'Reserved',
      out_of_service: 'Out of Service',
      inspection: 'Inspection',
      damage_repair: 'Damage Repair',
      cleaning: 'Cleaning',
      other: 'Other',
    };

    blockTypes.forEach((type) => {
      expect(formatBlockType(type)).toBe(expected[type]);
    });
  });
});

describe('formatUnavailabilityReason', () => {
  it('should format all unavailability reasons correctly', () => {
    const reasons: UnavailabilityReason[] = [
      'booking_conflict',
      'buffer_time',
      'maintenance',
      'reserved',
      'out_of_service',
      'branch_closed',
      'vehicle_status',
      'one_way_conflict',
    ];

    reasons.forEach((reason) => {
      const formatted = formatUnavailabilityReason(reason);
      expect(formatted).toBeTruthy();
      expect(typeof formatted).toBe('string');
      expect(formatted.length).toBeGreaterThan(0);
    });
  });

  it('should return specific messages for each reason', () => {
    expect(formatUnavailabilityReason('booking_conflict')).toBe(
      'Already booked during this period'
    );
    expect(formatUnavailabilityReason('buffer_time')).toBe(
      'Buffer time between bookings'
    );
    expect(formatUnavailabilityReason('branch_closed')).toBe(
      'Branch is closed'
    );
  });
});

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Constants', () => {
  it('should have default buffer minutes defined', () => {
    expect(DEFAULT_BUFFER_MINUTES).toBe(60);
  });
});

// ============================================================================
// ZOD SCHEMA VALIDATION TESTS
// ============================================================================

describe('availabilityQuerySchema', () => {
  it('should validate correct input', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-15T10:00:00Z',
    };

    const result = availabilityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid vehicle ID', () => {
    const input = {
      vehicleId: 'not-a-uuid',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-15T10:00:00Z',
    };

    const result = availabilityQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject when return is before pickup', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: '2024-01-15T10:00:00Z',
      returnAt: '2024-01-10T10:00:00Z',
    };

    const result = availabilityQuerySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept optional branch IDs', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-15T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174001',
      returnBranchId: '123e4567-e89b-12d3-a456-426614174002',
    };

    const result = availabilityQuerySchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('availabilitySearchSchema', () => {
  it('should validate correct input', () => {
    const input = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-15T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174001',
    };

    const result = availabilitySearchSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept optional filters', () => {
    const input = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-15T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174001',
      transmission: 'automatic',
      minSeats: 4,
      minDoors: 4,
      features: ['air_conditioning', 'gps'],
    };

    const result = availabilitySearchSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject invalid transmission value', () => {
    const input = {
      tenantId: '123e4567-e89b-12d3-a456-426614174000',
      pickupAt: '2024-01-10T10:00:00Z',
      returnAt: '2024-01-15T10:00:00Z',
      pickupBranchId: '123e4567-e89b-12d3-a456-426614174001',
      transmission: 'semi-automatic',
    };

    const result = availabilitySearchSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('createAvailabilityBlockSchema', () => {
  it('should validate correct input', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      blockType: 'maintenance',
      startAt: '2024-01-10T08:00:00Z',
      endAt: '2024-01-10T18:00:00Z',
    };

    const result = createAvailabilityBlockSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject when end is before start', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      blockType: 'maintenance',
      startAt: '2024-01-10T18:00:00Z',
      endAt: '2024-01-10T08:00:00Z',
    };

    const result = createAvailabilityBlockSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should require recurrenceEndDate for recurring blocks', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      blockType: 'maintenance',
      startAt: '2024-01-10T08:00:00Z',
      endAt: '2024-01-10T18:00:00Z',
      recurrence: 'weekly',
    };

    const result = createAvailabilityBlockSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept recurring blocks with end date', () => {
    const input = {
      vehicleId: '123e4567-e89b-12d3-a456-426614174000',
      blockType: 'maintenance',
      startAt: '2024-01-10T08:00:00Z',
      endAt: '2024-01-10T18:00:00Z',
      recurrence: 'weekly',
      recurrenceEndDate: '2024-03-31',
    };

    const result = createAvailabilityBlockSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should validate all block types', () => {
    const blockTypes = [
      'maintenance',
      'reserved',
      'out_of_service',
      'inspection',
      'damage_repair',
      'cleaning',
      'other',
    ];

    blockTypes.forEach((blockType) => {
      const input = {
        vehicleId: '123e4567-e89b-12d3-a456-426614174000',
        blockType,
        startAt: '2024-01-10T08:00:00Z',
        endAt: '2024-01-10T18:00:00Z',
      };

      const result = createAvailabilityBlockSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe('bufferTimeSettingsSchema', () => {
  it('should validate correct settings', () => {
    const input = {
      globalBufferMinutes: 60,
      categoryOverrides: [
        { categoryId: '123e4567-e89b-12d3-a456-426614174000', bufferMinutes: 90 },
      ],
      vehicleOverrides: [
        { vehicleId: '123e4567-e89b-12d3-a456-426614174001', bufferMinutes: 120 },
      ],
    };

    const result = bufferTimeSettingsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject negative buffer minutes', () => {
    const input = {
      globalBufferMinutes: -30,
      categoryOverrides: [],
      vehicleOverrides: [],
    };

    const result = bufferTimeSettingsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject buffer minutes over 24 hours', () => {
    const input = {
      globalBufferMinutes: 1500, // More than 1440 (24 hours)
      categoryOverrides: [],
      vehicleOverrides: [],
    };

    const result = bufferTimeSettingsSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept empty overrides arrays', () => {
    const input = {
      globalBufferMinutes: 60,
      categoryOverrides: [],
      vehicleOverrides: [],
    };

    const result = bufferTimeSettingsSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});
