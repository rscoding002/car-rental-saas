-- Migration: 009_coupons
-- Description: Create coupons table for discount codes
-- Date: 2026-01-31

-- Create coupons table
CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount', 'free_addon')),
    discount_value DECIMAL(10, 2) NOT NULL CHECK (discount_value >= 0),
    free_addon_id UUID REFERENCES addons(id) ON DELETE SET NULL,
    min_order_value DECIMAL(10, 2) CHECK (min_order_value IS NULL OR min_order_value >= 0),
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    usage_limit INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
    usage_per_customer INTEGER DEFAULT 1 CHECK (usage_per_customer > 0),
    usage_count INTEGER DEFAULT 0 CHECK (usage_count >= 0),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Coupon code must be unique within tenant
    CONSTRAINT uq_coupons_tenant_code UNIQUE (tenant_id, code),

    -- Valid until must be after valid from
    CONSTRAINT chk_coupons_validity CHECK (valid_until > valid_from),

    -- Percentage discount must be between 0 and 100
    CONSTRAINT chk_coupons_percentage CHECK (
        discount_type != 'percentage' OR (discount_value >= 0 AND discount_value <= 100)
    ),

    -- Free addon requires addon_id
    CONSTRAINT chk_coupons_free_addon CHECK (
        discount_type != 'free_addon' OR free_addon_id IS NOT NULL
    )
);

-- Add comments for documentation
COMMENT ON TABLE coupons IS 'Discount codes with various discount types and usage limits';
COMMENT ON COLUMN coupons.code IS 'Coupon code entered by customer (uppercase, unique per tenant)';
COMMENT ON COLUMN coupons.description IS 'Internal description/notes for the coupon';
COMMENT ON COLUMN coupons.discount_type IS 'Type: percentage (% off), fixed_amount (flat discount), free_addon (free addon)';
COMMENT ON COLUMN coupons.discount_value IS 'Discount value (percentage 0-100 or fixed amount in currency)';
COMMENT ON COLUMN coupons.free_addon_id IS 'Addon to give for free (when discount_type = free_addon)';
COMMENT ON COLUMN coupons.min_order_value IS 'Minimum order value required to use coupon';
COMMENT ON COLUMN coupons.usage_limit IS 'Total usage limit (NULL = unlimited)';
COMMENT ON COLUMN coupons.usage_per_customer IS 'Maximum uses per customer';
COMMENT ON COLUMN coupons.usage_count IS 'Current total usage count';

-- Create indexes for common queries
CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id);
CREATE INDEX idx_coupons_code ON coupons(tenant_id, code);
CREATE INDEX idx_coupons_status ON coupons(status);
CREATE INDEX idx_coupons_validity ON coupons(valid_from, valid_until);
CREATE INDEX idx_coupons_tenant_status ON coupons(tenant_id, status);

-- Apply updated_at trigger
CREATE TRIGGER update_coupons_updated_at
    BEFORE UPDATE ON coupons
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS: Enable Row Level Security
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated users can validate coupons (for booking flow)
-- Note: Actual validation logic will check tenant context
CREATE POLICY "Authenticated can validate coupons"
    ON coupons
    FOR SELECT
    USING (
        status = 'active'
        AND valid_from <= NOW()
        AND valid_until > NOW()
        AND (usage_limit IS NULL OR usage_count < usage_limit)
    );

-- RLS Policy: Tenant staff can view all coupons in their tenant
CREATE POLICY "Tenant staff can view all tenant coupons"
    ON coupons
    FOR SELECT
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager', 'tenant_staff'])
    );

-- RLS Policy: Tenant admins can manage coupons
CREATE POLICY "Tenant admins can manage coupons"
    ON coupons
    FOR ALL
    USING (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    )
    WITH CHECK (
        tenant_id = current_tenant_id()
        AND has_any_role(ARRAY['tenant_admin', 'tenant_manager'])
    );

-- RLS Policy: Platform admins can manage all coupons
CREATE POLICY "Platform admins can manage all coupons"
    ON coupons
    FOR ALL
    USING (has_role('platform_admin'))
    WITH CHECK (has_role('platform_admin'));

-- Function to validate a coupon code
CREATE OR REPLACE FUNCTION validate_coupon(
    p_tenant_id UUID,
    p_code VARCHAR,
    p_customer_id UUID DEFAULT NULL,
    p_order_value DECIMAL DEFAULT 0
)
RETURNS TABLE (
    is_valid BOOLEAN,
    coupon_id UUID,
    discount_type VARCHAR(20),
    discount_value DECIMAL(10, 2),
    free_addon_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_coupon RECORD;
    v_customer_usage INTEGER;
BEGIN
    -- Find the coupon
    SELECT c.* INTO v_coupon
    FROM coupons c
    WHERE c.tenant_id = p_tenant_id
      AND UPPER(c.code) = UPPER(p_code);

    -- Check if coupon exists
    IF v_coupon IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID, 'Invalid coupon code'::TEXT;
        RETURN;
    END IF;

    -- Check status
    IF v_coupon.status != 'active' THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID, 'Coupon is not active'::TEXT;
        RETURN;
    END IF;

    -- Check validity dates
    IF NOW() < v_coupon.valid_from THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID, 'Coupon is not yet valid'::TEXT;
        RETURN;
    END IF;

    IF NOW() > v_coupon.valid_until THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID, 'Coupon has expired'::TEXT;
        RETURN;
    END IF;

    -- Check total usage limit
    IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID, 'Coupon usage limit reached'::TEXT;
        RETURN;
    END IF;

    -- Check minimum order value
    IF v_coupon.min_order_value IS NOT NULL AND p_order_value < v_coupon.min_order_value THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID,
            format('Minimum order value of %s required', v_coupon.min_order_value)::TEXT;
        RETURN;
    END IF;

    -- Check per-customer usage (if customer provided)
    IF p_customer_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_customer_usage
        FROM bookings b
        WHERE b.coupon_id = v_coupon.id
          AND b.customer_id = p_customer_id
          AND b.status != 'cancelled';

        IF v_customer_usage >= v_coupon.usage_per_customer THEN
            RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::DECIMAL, NULL::UUID, 'You have already used this coupon'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Coupon is valid
    RETURN QUERY SELECT
        true,
        v_coupon.id,
        v_coupon.discount_type,
        v_coupon.discount_value,
        v_coupon.free_addon_id,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION validate_coupon IS 'Validate a coupon code and return discount details or error message';

-- Function to increment coupon usage
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE coupons
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = p_coupon_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION increment_coupon_usage IS 'Increment coupon usage count after successful booking';
