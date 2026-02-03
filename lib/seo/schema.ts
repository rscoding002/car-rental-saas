/**
 * Schema.org JSON-LD Generators
 *
 * Provides utilities for generating structured data (JSON-LD)
 * for SEO and rich search results.
 */

import { getBaseUrl } from './hreflang';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Organization schema options
 */
export interface OrganizationSchemaOptions {
  /** Organization/Company name */
  name: string;
  /** Organization description */
  description?: string;
  /** Logo URL (absolute) */
  logo?: string;
  /** Website URL */
  url?: string;
  /** Contact email */
  email?: string;
  /** Contact phone */
  phone?: string;
  /** Physical address */
  address?: {
    streetAddress?: string;
    addressLocality?: string; // City
    addressRegion?: string; // State/Region
    postalCode?: string;
    addressCountry?: string; // ISO country code
  };
  /** Social media profile URLs */
  sameAs?: string[];
  /** Founding date (ISO format) */
  foundingDate?: string;
  /** Number of employees */
  numberOfEmployees?: number | string;
}

/**
 * LocalBusiness schema options (extends Organization)
 */
export interface LocalBusinessSchemaOptions extends OrganizationSchemaOptions {
  /** Business type (e.g., 'AutoRental', 'CarRental') */
  type?: string;
  /** Geographic coordinates */
  geo?: {
    latitude: number;
    longitude: number;
  };
  /** Opening hours specification */
  openingHours?: OpeningHoursSpecification[];
  /** Price range (e.g., '$$', '$$$') */
  priceRange?: string;
  /** Accepted payment methods */
  paymentAccepted?: string[];
  /** Currencies accepted */
  currenciesAccepted?: string[];
  /** Areas served */
  areaServed?: string[];
  /** Branch ID for unique identification */
  branchId?: string;
}

/**
 * Opening hours specification
 */
export interface OpeningHoursSpecification {
  /** Days of week (e.g., ['Monday', 'Tuesday']) */
  dayOfWeek: string[];
  /** Opening time (HH:MM format) */
  opens: string;
  /** Closing time (HH:MM format) */
  closes: string;
}

/**
 * Vehicle/Product schema options
 */
export interface VehicleSchemaOptions {
  /** Vehicle ID */
  id: string;
  /** Vehicle name/title */
  name: string;
  /** Vehicle description */
  description?: string;
  /** Image URLs */
  images?: string[];
  /** Brand/Make */
  brand: string;
  /** Model */
  model: string;
  /** Model year */
  year: number;
  /** Vehicle category */
  category?: string;
  /** Fuel type */
  fuelType?: string;
  /** Transmission type */
  transmission?: string;
  /** Number of seats */
  seatingCapacity?: number;
  /** Number of doors */
  numberOfDoors?: number;
  /** Color */
  color?: string;
  /** Daily rental price */
  price?: number;
  /** Currency code */
  currency?: string;
  /** Availability status */
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
  /** Page URL */
  url?: string;
}

/**
 * FAQ item
 */
export interface FAQItem {
  /** Question text */
  question: string;
  /** Answer text (can contain HTML) */
  answer: string;
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  /** Display name */
  name: string;
  /** URL */
  url: string;
}

// ============================================================================
// ORGANIZATION SCHEMA
// ============================================================================

/**
 * Generate Organization JSON-LD schema
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{
 *     __html: JSON.stringify(generateOrganizationSchema({
 *       name: 'Car Rental Company',
 *       logo: 'https://example.com/logo.png',
 *       email: 'contact@example.com',
 *     }))
 *   }}
 * />
 * ```
 */
export function generateOrganizationSchema(
  options: OrganizationSchemaOptions
): object {
  const baseUrl = getBaseUrl();

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: options.name,
    url: options.url || baseUrl,
  };

  if (options.description) {
    schema.description = options.description;
  }

  if (options.logo) {
    schema.logo = {
      '@type': 'ImageObject',
      url: options.logo.startsWith('http') ? options.logo : `${baseUrl}${options.logo}`,
    };
  }

  if (options.email) {
    schema.email = options.email;
  }

  if (options.phone) {
    schema.telephone = options.phone;
  }

  if (options.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(options.address.streetAddress && { streetAddress: options.address.streetAddress }),
      ...(options.address.addressLocality && { addressLocality: options.address.addressLocality }),
      ...(options.address.addressRegion && { addressRegion: options.address.addressRegion }),
      ...(options.address.postalCode && { postalCode: options.address.postalCode }),
      ...(options.address.addressCountry && { addressCountry: options.address.addressCountry }),
    };
  }

  if (options.sameAs && options.sameAs.length > 0) {
    schema.sameAs = options.sameAs;
  }

  if (options.foundingDate) {
    schema.foundingDate = options.foundingDate;
  }

  if (options.numberOfEmployees) {
    schema.numberOfEmployees = {
      '@type': 'QuantitativeValue',
      value: options.numberOfEmployees,
    };
  }

  // Add contact point for customer service
  if (options.phone || options.email) {
    schema.contactPoint = {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      ...(options.phone && { telephone: options.phone }),
      ...(options.email && { email: options.email }),
      availableLanguage: ['English', 'Lithuanian', 'Russian'],
    };
  }

  return schema;
}

// ============================================================================
// LOCAL BUSINESS SCHEMA
// ============================================================================

/**
 * Generate LocalBusiness JSON-LD schema for branches
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{
 *     __html: JSON.stringify(generateLocalBusinessSchema({
 *       name: 'Car Rental - Vilnius Airport',
 *       type: 'AutoRental',
 *       address: { streetAddress: '...', addressLocality: 'Vilnius' },
 *       geo: { latitude: 54.6361, longitude: 25.2876 },
 *     }))
 *   }}
 * />
 * ```
 */
export function generateLocalBusinessSchema(
  options: LocalBusinessSchemaOptions
): object {
  const baseUrl = getBaseUrl();
  const businessType = options.type || 'AutoRental';

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': businessType,
    name: options.name,
    url: options.url || baseUrl,
  };

  // Add unique identifier if branch ID provided
  if (options.branchId) {
    schema['@id'] = `${baseUrl}/branches/${options.branchId}`;
  }

  if (options.description) {
    schema.description = options.description;
  }

  if (options.logo) {
    schema.logo = options.logo.startsWith('http') ? options.logo : `${baseUrl}${options.logo}`;
  }

  if (options.email) {
    schema.email = options.email;
  }

  if (options.phone) {
    schema.telephone = options.phone;
  }

  if (options.address) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(options.address.streetAddress && { streetAddress: options.address.streetAddress }),
      ...(options.address.addressLocality && { addressLocality: options.address.addressLocality }),
      ...(options.address.addressRegion && { addressRegion: options.address.addressRegion }),
      ...(options.address.postalCode && { postalCode: options.address.postalCode }),
      ...(options.address.addressCountry && { addressCountry: options.address.addressCountry }),
    };
  }

  if (options.geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: options.geo.latitude,
      longitude: options.geo.longitude,
    };
  }

  if (options.openingHours && options.openingHours.length > 0) {
    schema.openingHoursSpecification = options.openingHours.map((hours) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: hours.dayOfWeek,
      opens: hours.opens,
      closes: hours.closes,
    }));
  }

  if (options.priceRange) {
    schema.priceRange = options.priceRange;
  }

  if (options.paymentAccepted && options.paymentAccepted.length > 0) {
    schema.paymentAccepted = options.paymentAccepted.join(', ');
  }

  if (options.currenciesAccepted && options.currenciesAccepted.length > 0) {
    schema.currenciesAccepted = options.currenciesAccepted.join(', ');
  }

  if (options.areaServed && options.areaServed.length > 0) {
    schema.areaServed = options.areaServed;
  }

  if (options.sameAs && options.sameAs.length > 0) {
    schema.sameAs = options.sameAs;
  }

  return schema;
}

// ============================================================================
// VEHICLE/PRODUCT SCHEMA
// ============================================================================

/**
 * Generate Vehicle JSON-LD schema
 *
 * Uses both Vehicle and Product types for maximum compatibility.
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{
 *     __html: JSON.stringify(generateVehicleSchema({
 *       id: '123',
 *       name: 'Toyota Camry 2024',
 *       brand: 'Toyota',
 *       model: 'Camry',
 *       year: 2024,
 *       price: 45,
 *       currency: 'EUR',
 *     }))
 *   }}
 * />
 * ```
 */
export function generateVehicleSchema(options: VehicleSchemaOptions): object {
  const baseUrl = getBaseUrl();
  const vehicleUrl = options.url || `${baseUrl}/fleet/${options.id}`;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Vehicle',
    '@id': vehicleUrl,
    name: options.name,
    url: vehicleUrl,
    brand: {
      '@type': 'Brand',
      name: options.brand,
    },
    model: options.model,
    modelDate: options.year.toString(),
    vehicleModelDate: options.year.toString(),
  };

  if (options.description) {
    schema.description = options.description;
  }

  if (options.images && options.images.length > 0) {
    schema.image = options.images.map((img) =>
      img.startsWith('http') ? img : `${baseUrl}${img}`
    );
  }

  if (options.category) {
    schema.vehicleConfiguration = options.category;
  }

  if (options.fuelType) {
    schema.fuelType = options.fuelType;
  }

  if (options.transmission) {
    schema.vehicleTransmission = options.transmission;
  }

  if (options.seatingCapacity) {
    schema.seatingCapacity = options.seatingCapacity;
  }

  if (options.numberOfDoors) {
    schema.numberOfDoors = options.numberOfDoors;
  }

  if (options.color) {
    schema.color = options.color;
  }

  // Add rental offer
  if (options.price) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: options.currency || 'EUR',
      price: options.price,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days from now
      availability:
        options.availability === 'InStock'
          ? 'https://schema.org/InStock'
          : options.availability === 'OutOfStock'
            ? 'https://schema.org/OutOfStock'
            : 'https://schema.org/InStock',
      url: vehicleUrl,
      itemCondition: 'https://schema.org/UsedCondition',
      businessFunction: 'https://schema.org/LeaseOut',
    };
  }

  return schema;
}

/**
 * Generate Product JSON-LD schema for vehicle (alternative format)
 *
 * Some search engines prefer Product schema for rental items.
 */
export function generateProductSchema(options: VehicleSchemaOptions): object {
  const baseUrl = getBaseUrl();
  const productUrl = options.url || `${baseUrl}/fleet/${options.id}`;

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': productUrl,
    name: options.name,
    url: productUrl,
    brand: {
      '@type': 'Brand',
      name: options.brand,
    },
    category: options.category || 'Vehicle Rental',
  };

  if (options.description) {
    schema.description = options.description;
  }

  if (options.images && options.images.length > 0) {
    schema.image = options.images.map((img) =>
      img.startsWith('http') ? img : `${baseUrl}${img}`
    );
  }

  // Add rental offer
  if (options.price) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: options.currency || 'EUR',
      price: options.price,
      availability:
        options.availability === 'OutOfStock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      url: productUrl,
    };
  }

  return schema;
}

// ============================================================================
// FAQ SCHEMA
// ============================================================================

/**
 * Generate FAQPage JSON-LD schema
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{
 *     __html: JSON.stringify(generateFAQSchema([
 *       { question: 'What documents do I need?', answer: 'You need...' },
 *       { question: 'What is the minimum age?', answer: 'The minimum age is...' },
 *     ]))
 *   }}
 * />
 * ```
 */
export function generateFAQSchema(items: FAQItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

// ============================================================================
// BREADCRUMB SCHEMA
// ============================================================================

/**
 * Generate BreadcrumbList JSON-LD schema
 *
 * @example
 * ```tsx
 * <script
 *   type="application/ld+json"
 *   dangerouslySetInnerHTML={{
 *     __html: JSON.stringify(generateBreadcrumbSchema([
 *       { name: 'Home', url: '/' },
 *       { name: 'Fleet', url: '/fleet' },
 *       { name: 'Toyota Camry', url: '/fleet/123' },
 *     ]))
 *   }}
 * />
 * ```
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): object {
  const baseUrl = getBaseUrl();

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${baseUrl}${item.url}`,
    })),
  };
}

// ============================================================================
// WEBSITE SCHEMA
// ============================================================================

/**
 * Generate WebSite JSON-LD schema with search action
 *
 * Enables sitelinks search box in Google results.
 */
export function generateWebSiteSchema(options: {
  name: string;
  description?: string;
  searchPath?: string;
}): object {
  const baseUrl = getBaseUrl();

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: options.name,
    url: baseUrl,
  };

  if (options.description) {
    schema.description = options.description;
  }

  // Add search action for sitelinks search box
  if (options.searchPath) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${baseUrl}${options.searchPath}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    };
  }

  return schema;
}

// ============================================================================
// HELPER: RENDER SCRIPT TAG
// ============================================================================

/**
 * Helper to render JSON-LD script tag content
 *
 * Safely stringifies the schema object for use in dangerouslySetInnerHTML.
 */
export function renderJsonLd(schema: object): string {
  return JSON.stringify(schema, null, 0);
}

/**
 * Combine multiple schemas into a single array
 *
 * Use when you need to include multiple schemas on a single page.
 */
export function combineSchemas(...schemas: object[]): object[] {
  return schemas;
}

// ============================================================================
// BRANCH TO LOCAL BUSINESS CONVERTER
// ============================================================================

/**
 * Branch data structure for conversion
 */
export interface BranchData {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  email?: string | null;
  operating_hours?: {
    monday?: { open: string; close: string } | null;
    tuesday?: { open: string; close: string } | null;
    wednesday?: { open: string; close: string } | null;
    thursday?: { open: string; close: string } | null;
    friday?: { open: string; close: string } | null;
    saturday?: { open: string; close: string } | null;
    sunday?: { open: string; close: string } | null;
  };
}

/**
 * Convert branch data to LocalBusiness JSON-LD schema
 *
 * @example
 * ```tsx
 * const branches = await getBranches();
 * const schemas = branches.map(branch => generateBranchLocalBusinessSchema(branch, {
 *   tenantName: 'My Car Rental',
 *   tenantLogo: '/logo.png',
 * }));
 * ```
 */
export function generateBranchLocalBusinessSchema(
  branch: BranchData,
  options?: {
    tenantName?: string;
    tenantLogo?: string;
    priceRange?: string;
    currenciesAccepted?: string[];
  }
): object {
  // Map operating hours to OpeningHoursSpecification format
  const openingHours: OpeningHoursSpecification[] = [];
  const dayMapping: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };

  if (branch.operating_hours) {
    for (const [day, hours] of Object.entries(branch.operating_hours)) {
      if (hours && hours.open && hours.close) {
        openingHours.push({
          dayOfWeek: [dayMapping[day]],
          opens: hours.open,
          closes: hours.close,
        });
      }
    }
  }

  // Build the schema options
  const schemaOptions: LocalBusinessSchemaOptions = {
    name: options?.tenantName
      ? `${options.tenantName} - ${branch.name}`
      : branch.name,
    type: 'AutoRental',
    branchId: branch.id,
    address: {
      streetAddress: branch.address,
      addressLocality: branch.city,
      addressCountry: branch.country,
    },
  };

  // Add optional fields
  if (branch.latitude && branch.longitude) {
    schemaOptions.geo = {
      latitude: branch.latitude,
      longitude: branch.longitude,
    };
  }

  if (branch.phone) {
    schemaOptions.phone = branch.phone;
  }

  if (branch.email) {
    schemaOptions.email = branch.email;
  }

  if (openingHours.length > 0) {
    schemaOptions.openingHours = openingHours;
  }

  if (options?.tenantLogo) {
    schemaOptions.logo = options.tenantLogo;
  }

  if (options?.priceRange) {
    schemaOptions.priceRange = options.priceRange;
  }

  if (options?.currenciesAccepted) {
    schemaOptions.currenciesAccepted = options.currenciesAccepted;
  }

  // Common payment methods for car rentals
  schemaOptions.paymentAccepted = ['Credit Card', 'Debit Card', 'Cash'];

  return generateLocalBusinessSchema(schemaOptions);
}

/**
 * Generate multiple LocalBusiness schemas for all branches
 *
 * @example
 * ```tsx
 * const branches = await getBranches();
 * const schemas = generateBranchesLocalBusinessSchemas(branches, {
 *   tenantName: 'My Car Rental',
 * });
 *
 * // Render in page
 * {schemas.map((schema, i) => (
 *   <script
 *     key={i}
 *     type="application/ld+json"
 *     dangerouslySetInnerHTML={{ __html: renderJsonLd(schema) }}
 *   />
 * ))}
 * ```
 */
export function generateBranchesLocalBusinessSchemas(
  branches: BranchData[],
  options?: {
    tenantName?: string;
    tenantLogo?: string;
    priceRange?: string;
    currenciesAccepted?: string[];
  }
): object[] {
  return branches.map((branch) =>
    generateBranchLocalBusinessSchema(branch, options)
  );
}
