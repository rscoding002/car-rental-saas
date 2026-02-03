import { z } from 'zod';

/**
 * Common validation schemas used throughout the application
 */

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// Password validation (min 8 chars, at least one letter and one number)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone number validation (basic international format)
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number');

// Name validation
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name is too long');

// Slug validation (URL-safe string)
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

// UUID validation
export const uuidSchema = z.string().uuid('Invalid ID');

// Date validation
export const dateSchema = z.coerce.date();

// Positive number validation
export const positiveNumberSchema = z.number().positive('Must be a positive number');

// Non-negative number validation
export const nonNegativeNumberSchema = z.number().min(0, 'Cannot be negative');

// Pagination schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

// Sort order schema
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

// Common address schema
export const addressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

// GPS coordinates schema
export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Operating hours schema (for branches)
export const operatingHoursSchema = z.object({
  monday: z.object({ open: z.string(), close: z.string() }).nullable(),
  tuesday: z.object({ open: z.string(), close: z.string() }).nullable(),
  wednesday: z.object({ open: z.string(), close: z.string() }).nullable(),
  thursday: z.object({ open: z.string(), close: z.string() }).nullable(),
  friday: z.object({ open: z.string(), close: z.string() }).nullable(),
  saturday: z.object({ open: z.string(), close: z.string() }).nullable(),
  sunday: z.object({ open: z.string(), close: z.string() }).nullable(),
});

// Customer details schema (for booking)
export const customerDetailsSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateSchema.optional(),
  driverLicenseNumber: z.string().min(1, 'Driver license number is required'),
  driverLicenseExpiry: dateSchema,
});

// Search params schema (for vehicle search)
export const vehicleSearchSchema = z.object({
  pickupBranchId: uuidSchema,
  dropoffBranchId: uuidSchema,
  pickupDate: dateSchema,
  dropoffDate: dateSchema,
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
  dropoffTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format'),
});

// Type exports
export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type Phone = z.infer<typeof phoneSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
export type OperatingHours = z.infer<typeof operatingHoursSchema>;
export type CustomerDetails = z.infer<typeof customerDetailsSchema>;
export type VehicleSearch = z.infer<typeof vehicleSearchSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
