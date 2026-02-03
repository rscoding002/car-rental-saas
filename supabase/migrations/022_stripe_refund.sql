-- Migration: Add Stripe refund tracking to bookings
-- Description: Adds columns to track refund information when bookings are cancelled

-- Add refund-related columns to bookings table
ALTER TABLE bookings
ADD COLUMN stripe_refund_id VARCHAR(255),
ADD COLUMN refund_amount DECIMAL(10, 2),
ADD COLUMN refund_status VARCHAR(50),
ADD COLUMN refunded_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN bookings.stripe_refund_id IS 'Stripe Refund ID when a refund is processed';
COMMENT ON COLUMN bookings.refund_amount IS 'Amount refunded in the booking currency';
COMMENT ON COLUMN bookings.refund_status IS 'Refund status: pending, succeeded, failed, canceled';
COMMENT ON COLUMN bookings.refunded_at IS 'Timestamp when the refund was processed';

-- Create index for refund lookups
CREATE INDEX idx_bookings_stripe_refund ON bookings(stripe_refund_id) WHERE stripe_refund_id IS NOT NULL;
