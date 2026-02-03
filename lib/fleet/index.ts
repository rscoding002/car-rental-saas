/**
 * Fleet Module
 *
 * Provides types, schemas, queries, and utilities for vehicle and category management.
 *
 * @example
 * // Types and schemas
 * import {
 *   type Vehicle,
 *   type VehicleCategory,
 *   createVehicleSchema,
 *   createCategorySchema,
 *   VEHICLE_STATUS_OPTIONS,
 * } from '@/lib/fleet';
 *
 * // Queries
 * import {
 *   getVehicleById,
 *   listVehicles,
 *   createVehicle,
 *   updateVehicle,
 *   deleteVehicle,
 * } from '@/lib/fleet';
 */

export * from './types';
export * from './queries';
export * from './category-queries';
