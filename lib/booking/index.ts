/**
 * Booking Module
 *
 * Exports all booking-related types, schemas, queries, actions, and utilities.
 */

// Types and schemas
export * from './types';

// Database queries
export * from './queries';

// Reference number generator
export * from './reference-generator';

// Cancellation logic
export * from './cancellation';

// Modification logic
export * from './modification';

// Client-side checkout utilities (import directly for 'use client' components)
// import { useCheckout, createCheckout } from '@/lib/booking/checkout';

// Additional exports will be added as modules are created:
// export * from './actions';
// export * from './validation';
