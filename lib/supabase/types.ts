/**
 * Supabase Database Types
 *
 * These types are manually created based on the database schema.
 * To regenerate from live database, run:
 * npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================================
// ENUMS
// ============================================================================

export type SubscriptionTier = 'starter' | 'pro' | 'business' | 'enterprise';
export type TenantStatus = 'active' | 'suspended' | 'deleted';
export type UserRole = 'platform_admin' | 'tenant_admin' | 'tenant_manager' | 'tenant_staff' | 'customer';
export type UserStatus = 'active' | 'inactive' | 'suspended';
export type BranchStatus = 'active' | 'inactive';
export type VehicleStatus = 'available' | 'rented' | 'maintenance' | 'retired';
export type Transmission = 'manual' | 'automatic';
export type FuelType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid';
export type RateType = 'hourly' | 'daily' | 'weekly' | 'monthly';
export type PriceType = 'per_day' | 'per_rental' | 'one_time';
export type DiscountType = 'percentage' | 'fixed_amount' | 'free_addon';
export type CouponStatus = 'active' | 'inactive' | 'expired';
export type BookingStatus = 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type PageStatus = 'draft' | 'published' | 'archived';
export type BlockType =
  | 'hero'
  | 'features'
  | 'fleet_gallery'
  | 'testimonials'
  | 'faq'
  | 'cta'
  | 'text_image'
  | 'contact_form'
  | 'location_map'
  | 'pricing_table'
  | 'text'
  | 'image'
  | 'video'
  | 'divider'
  | 'spacer'
  | 'html';

// ============================================================================
// JSONB TYPES
// ============================================================================

export interface LocalizedString {
  en?: string;
  lt?: string;
  ru?: string;
  [key: string]: string | undefined;
}

export interface TenantBranding {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
}

export interface TenantLanguages {
  enabled: string[];
  default: string;
}

export interface CancellationPolicy {
  freeCancellationHours?: number;
  partialRefundHours?: number;
  partialRefundPercent?: number;
}

export interface TenantContact {
  email?: string;
  phone?: string;
  address?: string;
}

export interface TenantSettings {
  branding?: TenantBranding;
  languages?: TenantLanguages;
  currency?: string;
  timezone?: string;
  bufferTime?: number;
  cancellationPolicy?: CancellationPolicy;
  contact?: TenantContact;
}

export interface OperatingHours {
  monday?: { open: string; close: string } | null;
  tuesday?: { open: string; close: string } | null;
  wednesday?: { open: string; close: string } | null;
  thursday?: { open: string; close: string } | null;
  friday?: { open: string; close: string } | null;
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

export interface VehiclePhoto {
  url: string;
  isPrimary?: boolean;
  order?: number;
}

export interface DriverLicense {
  number?: string;
  expiryDate?: string;
  country?: string;
}

export interface UserAddress {
  street?: string;
  city?: string;
  postalCode?: string;
  country?: string;
}

export interface UserPreferences {
  language?: string;
  newsletter?: boolean;
}

export interface UserProfile {
  dateOfBirth?: string;
  driverLicense?: DriverLicense;
  address?: UserAddress;
  preferences?: UserPreferences;
}

export interface DriverInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  driverLicense?: DriverLicense;
}

export interface BookingPricing {
  baseRate: number;
  rateType: RateType;
  duration: number;
  durationUnit?: string;
  subtotal: number;
  seasonId?: string;
  seasonName?: string;
  seasonMultiplier?: number;
  seasonAmount?: number;
  addonsTotal?: number;
  oneWayFee?: number;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount?: number;
  couponCode?: string;
  total: number;
  currency: string;
}

export interface PageMeta {
  [locale: string]: {
    description?: string;
    keywords?: string;
    ogImage?: string;
    canonical?: string;
  };
}

export interface BlockSettings {
  background?: {
    type?: string;
    value?: string;
  };
  padding?: {
    top?: string;
    bottom?: string;
  };
  maxWidth?: string;
  alignment?: string;
}

// ============================================================================
// DATABASE TABLES
// ============================================================================

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          domain: string | null;
          logo_url: string | null;
          settings: TenantSettings;
          subscription_tier: SubscriptionTier;
          status: TenantStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          logo_url?: string | null;
          settings?: TenantSettings;
          subscription_tier?: SubscriptionTier;
          status?: TenantStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          logo_url?: string | null;
          settings?: TenantSettings;
          subscription_tier?: SubscriptionTier;
          status?: TenantStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          tenant_id: string | null;
          auth_id: string;
          email: string;
          role: UserRole;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          profile: UserProfile;
          status: UserStatus;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          auth_id: string;
          email: string;
          role: UserRole;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          profile?: UserProfile;
          status?: UserStatus;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string | null;
          auth_id?: string;
          email?: string;
          role?: UserRole;
          first_name?: string | null;
          last_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          profile?: UserProfile;
          status?: UserStatus;
          last_login_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          slug: string;
          address: string;
          city: string;
          country: string;
          latitude: number | null;
          longitude: number | null;
          phone: string | null;
          email: string | null;
          operating_hours: OperatingHours;
          status: BranchStatus;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          slug: string;
          address: string;
          city: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          email?: string | null;
          operating_hours?: OperatingHours;
          status?: BranchStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          slug?: string;
          address?: string;
          city?: string;
          country?: string;
          latitude?: number | null;
          longitude?: number | null;
          phone?: string | null;
          email?: string | null;
          operating_hours?: OperatingHours;
          status?: BranchStatus;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicle_categories: {
        Row: {
          id: string;
          tenant_id: string;
          name: LocalizedString;
          description: LocalizedString;
          icon: string | null;
          image_url: string | null;
          sort_order: number;
          status: BranchStatus;
          buffer_time_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: LocalizedString;
          description?: LocalizedString;
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number;
          status?: BranchStatus;
          buffer_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: LocalizedString;
          description?: LocalizedString;
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number;
          status?: BranchStatus;
          buffer_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          tenant_id: string;
          branch_id: string;
          category_id: string;
          make: string;
          model: string;
          year: number;
          license_plate: string;
          vin: string | null;
          transmission: Transmission;
          fuel_type: FuelType;
          seats: number;
          doors: number;
          luggage_capacity: number | null;
          features: string[];
          photos: VehiclePhoto[];
          status: VehicleStatus;
          odometer: number | null;
          color: string | null;
          description: LocalizedString;
          buffer_time_minutes: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          branch_id: string;
          category_id: string;
          make: string;
          model: string;
          year: number;
          license_plate: string;
          vin?: string | null;
          transmission: Transmission;
          fuel_type: FuelType;
          seats: number;
          doors: number;
          luggage_capacity?: number | null;
          features?: string[];
          photos?: VehiclePhoto[];
          status?: VehicleStatus;
          odometer?: number | null;
          color?: string | null;
          description?: LocalizedString;
          buffer_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          branch_id?: string;
          category_id?: string;
          make?: string;
          model?: string;
          year?: number;
          license_plate?: string;
          vin?: string | null;
          transmission?: Transmission;
          fuel_type?: FuelType;
          seats?: number;
          doors?: number;
          luggage_capacity?: number | null;
          features?: string[];
          photos?: VehiclePhoto[];
          status?: VehicleStatus;
          odometer?: number | null;
          color?: string | null;
          description?: LocalizedString;
          buffer_time_minutes?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pricing_rules: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string | null;
          vehicle_id: string | null;
          rate_type: RateType;
          amount: number;
          currency: string;
          min_duration: number | null;
          max_duration: number | null;
          status: BranchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id?: string | null;
          vehicle_id?: string | null;
          rate_type: RateType;
          amount: number;
          currency?: string;
          min_duration?: number | null;
          max_duration?: number | null;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          category_id?: string | null;
          vehicle_id?: string | null;
          rate_type?: RateType;
          amount?: number;
          currency?: string;
          min_duration?: number | null;
          max_duration?: number | null;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      seasons: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          start_date: string;
          end_date: string;
          multiplier: number;
          priority: number;
          status: BranchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          start_date: string;
          end_date: string;
          multiplier?: number;
          priority?: number;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          multiplier?: number;
          priority?: number;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      addons: {
        Row: {
          id: string;
          tenant_id: string;
          name: LocalizedString;
          description: LocalizedString;
          price: number;
          price_type: PriceType;
          max_quantity: number;
          image_url: string | null;
          sort_order: number;
          status: BranchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: LocalizedString;
          description?: LocalizedString;
          price: number;
          price_type: PriceType;
          max_quantity?: number;
          image_url?: string | null;
          sort_order?: number;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: LocalizedString;
          description?: LocalizedString;
          price?: number;
          price_type?: PriceType;
          max_quantity?: number;
          image_url?: string | null;
          sort_order?: number;
          status?: BranchStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      coupons: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          description: string | null;
          discount_type: DiscountType;
          discount_value: number;
          free_addon_id: string | null;
          min_order_value: number | null;
          valid_from: string;
          valid_until: string;
          usage_limit: number | null;
          usage_per_customer: number;
          usage_count: number;
          status: CouponStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          description?: string | null;
          discount_type: DiscountType;
          discount_value: number;
          free_addon_id?: string | null;
          min_order_value?: number | null;
          valid_from: string;
          valid_until: string;
          usage_limit?: number | null;
          usage_per_customer?: number;
          usage_count?: number;
          status?: CouponStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          code?: string;
          description?: string | null;
          discount_type?: DiscountType;
          discount_value?: number;
          free_addon_id?: string | null;
          min_order_value?: number | null;
          valid_from?: string;
          valid_until?: string;
          usage_limit?: number | null;
          usage_per_customer?: number;
          usage_count?: number;
          status?: CouponStatus;
          created_at?: string;
          updated_at?: string;
        };
      };
      bookings: {
        Row: {
          id: string;
          tenant_id: string;
          reference: string;
          customer_id: string;
          vehicle_id: string;
          pickup_branch_id: string;
          return_branch_id: string;
          pickup_at: string;
          return_at: string;
          status: BookingStatus;
          pricing: BookingPricing;
          coupon_id: string | null;
          driver_info: DriverInfo;
          notes: string | null;
          cancelled_at: string | null;
          cancellation_reason: string | null;
          stripe_payment_intent_id: string | null;
          stripe_checkout_session_id: string | null;
          stripe_refund_id: string | null;
          refund_amount: number | null;
          refund_status: string | null;
          refunded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          reference?: string;
          customer_id: string;
          vehicle_id: string;
          pickup_branch_id: string;
          return_branch_id: string;
          pickup_at: string;
          return_at: string;
          status?: BookingStatus;
          pricing: BookingPricing;
          coupon_id?: string | null;
          driver_info?: DriverInfo;
          notes?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_refund_id?: string | null;
          refund_amount?: number | null;
          refund_status?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          reference?: string;
          customer_id?: string;
          vehicle_id?: string;
          pickup_branch_id?: string;
          return_branch_id?: string;
          pickup_at?: string;
          return_at?: string;
          status?: BookingStatus;
          pricing?: BookingPricing;
          coupon_id?: string | null;
          driver_info?: DriverInfo;
          notes?: string | null;
          cancelled_at?: string | null;
          cancellation_reason?: string | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          stripe_refund_id?: string | null;
          refund_amount?: number | null;
          refund_status?: string | null;
          refunded_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      booking_addons: {
        Row: {
          id: string;
          booking_id: string;
          addon_id: string;
          quantity: number;
          unit_price: number;
          price_type: PriceType;
          total_price: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          addon_id: string;
          quantity?: number;
          unit_price: number;
          price_type: PriceType;
          total_price: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          addon_id?: string;
          quantity?: number;
          unit_price?: number;
          price_type?: PriceType;
          total_price?: number;
          created_at?: string;
        };
      };
      pages: {
        Row: {
          id: string;
          tenant_id: string;
          slug: string;
          title: LocalizedString;
          meta: PageMeta;
          status: PageStatus;
          is_system: boolean;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          slug: string;
          title: LocalizedString;
          meta?: PageMeta;
          status?: PageStatus;
          is_system?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          slug?: string;
          title?: LocalizedString;
          meta?: PageMeta;
          status?: PageStatus;
          is_system?: boolean;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      page_blocks: {
        Row: {
          id: string;
          page_id: string;
          block_type: BlockType;
          content: Json;
          settings: BlockSettings;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          page_id: string;
          block_type: BlockType;
          content: Json;
          settings?: BlockSettings;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string;
          block_type?: BlockType;
          content?: Json;
          settings?: BlockSettings;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      media: {
        Row: {
          id: string;
          tenant_id: string;
          filename: string;
          storage_path: string;
          url: string;
          mime_type: string;
          size: number;
          width: number | null;
          height: number | null;
          alt_text: LocalizedString;
          folder: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          filename: string;
          storage_path: string;
          url: string;
          mime_type: string;
          size: number;
          width?: number | null;
          height?: number | null;
          alt_text?: LocalizedString;
          folder?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          filename?: string;
          storage_path?: string;
          url?: string;
          mime_type?: string;
          size?: number;
          width?: number | null;
          height?: number | null;
          alt_text?: LocalizedString;
          folder?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      availability_blocks: {
        Row: {
          id: string;
          tenant_id: string;
          vehicle_id: string;
          block_type: string;
          start_at: string;
          end_at: string;
          reason: string | null;
          notes: string | null;
          created_by: string | null;
          recurrence: string;
          recurrence_end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          vehicle_id: string;
          block_type: string;
          start_at: string;
          end_at: string;
          reason?: string | null;
          notes?: string | null;
          created_by?: string | null;
          recurrence?: string;
          recurrence_end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          vehicle_id?: string;
          block_type?: string;
          start_at?: string;
          end_at?: string;
          reason?: string | null;
          notes?: string | null;
          created_by?: string | null;
          recurrence?: string;
          recurrence_end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      has_role: {
        Args: { required_role: string };
        Returns: boolean;
      };
      has_any_role: {
        Args: { required_roles: string[] };
        Returns: boolean;
      };
      is_platform_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      check_vehicle_availability: {
        Args: {
          p_vehicle_id: string;
          p_pickup_at: string;
          p_return_at: string;
          p_exclude_booking_id?: string;
        };
        Returns: boolean;
      };
      validate_coupon: {
        Args: {
          p_tenant_id: string;
          p_code: string;
          p_customer_id?: string;
          p_order_value?: number;
        };
        Returns: {
          is_valid: boolean;
          coupon_id: string | null;
          discount_type: string | null;
          discount_value: number | null;
          free_addon_id: string | null;
          error_message: string | null;
        }[];
      };
    };
    Enums: {
      subscription_tier: SubscriptionTier;
      tenant_status: TenantStatus;
      user_role: UserRole;
      user_status: UserStatus;
      branch_status: BranchStatus;
      vehicle_status: VehicleStatus;
      transmission: Transmission;
      fuel_type: FuelType;
      rate_type: RateType;
      price_type: PriceType;
      discount_type: DiscountType;
      coupon_status: CouponStatus;
      booking_status: BookingStatus;
      page_status: PageStatus;
      block_type: BlockType;
    };
  };
}

// ============================================================================
// HELPER TYPES
// ============================================================================

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

// Aliases for compatibility
export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T];

// Convenience type aliases
export type Tenant = Tables<'tenants'>;
export type User = Tables<'users'>;
export type Branch = Tables<'branches'>;
export type VehicleCategory = Tables<'vehicle_categories'>;
export type Vehicle = Tables<'vehicles'>;
export type PricingRule = Tables<'pricing_rules'>;
export type Season = Tables<'seasons'>;
export type Addon = Tables<'addons'>;
export type Coupon = Tables<'coupons'>;
export type Booking = Tables<'bookings'>;
export type BookingAddon = Tables<'booking_addons'>;
export type Page = Tables<'pages'>;
export type PageBlock = Tables<'page_blocks'>;
export type Media = Tables<'media'>;

// Insert types
export type TenantInsert = InsertTables<'tenants'>;
export type UserInsert = InsertTables<'users'>;
export type BranchInsert = InsertTables<'branches'>;
export type VehicleCategoryInsert = InsertTables<'vehicle_categories'>;
export type VehicleInsert = InsertTables<'vehicles'>;
export type PricingRuleInsert = InsertTables<'pricing_rules'>;
export type SeasonInsert = InsertTables<'seasons'>;
export type AddonInsert = InsertTables<'addons'>;
export type CouponInsert = InsertTables<'coupons'>;
export type BookingInsert = InsertTables<'bookings'>;
export type BookingAddonInsert = InsertTables<'booking_addons'>;
export type PageInsert = InsertTables<'pages'>;
export type PageBlockInsert = InsertTables<'page_blocks'>;
export type MediaInsert = InsertTables<'media'>;

// Update types
export type TenantUpdate = UpdateTables<'tenants'>;
export type UserUpdate = UpdateTables<'users'>;
export type BranchUpdate = UpdateTables<'branches'>;
export type VehicleCategoryUpdate = UpdateTables<'vehicle_categories'>;
export type VehicleUpdate = UpdateTables<'vehicles'>;
export type PricingRuleUpdate = UpdateTables<'pricing_rules'>;
export type SeasonUpdate = UpdateTables<'seasons'>;
export type AddonUpdate = UpdateTables<'addons'>;
export type CouponUpdate = UpdateTables<'coupons'>;
export type BookingUpdate = UpdateTables<'bookings'>;
export type BookingAddonUpdate = UpdateTables<'booking_addons'>;
export type PageUpdate = UpdateTables<'pages'>;
export type PageBlockUpdate = UpdateTables<'page_blocks'>;
export type MediaUpdate = UpdateTables<'media'>;
