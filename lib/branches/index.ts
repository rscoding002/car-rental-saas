/**
 * Branches Module
 *
 * Provides types, schemas, queries, and utilities for branch/location management.
 *
 * @example
 * // Types and schemas
 * import {
 *   type Branch,
 *   createBranchSchema,
 *   isBranchOpen,
 *   DEFAULT_OPERATING_HOURS
 * } from '@/lib/branches';
 *
 * // Queries
 * import {
 *   getBranchById,
 *   listBranches,
 *   createBranch,
 *   updateBranch,
 *   deleteBranch
 * } from '@/lib/branches';
 */

export * from './types';
export * from './queries';
