/**
 * SEO Utilities
 *
 * Utilities for search engine optimization including
 * metadata generation, schema.org, and hreflang links.
 */

// Hreflang link generation
export {
  generateHreflangLinks,
  generateRegionalHreflangLinks,
  generateLanguageAlternates,
  generateAlternatesMetadata,
  generateHreflangHtml,
  getCanonicalUrl,
  getAlternateUrls,
  getBaseUrl,
  getPageAlternates,
  type HreflangLink,
  type LanguageAlternate,
  type HreflangOptions,
} from './hreflang';

// Metadata generation
export {
  generatePageMetadata,
  generateVehicleMetadata,
  generateCmsPageMetadata,
  generateBranchMetadata,
  formatTitle,
  truncateDescription,
  formatKeywords,
  stripHtml,
  generateBreadcrumbList,
  DEFAULT_METADATA,
  type PageMetadataOptions,
  type VehicleMetadataOptions,
  type CmsPageMetadataOptions,
  type BranchMetadataOptions,
  type OGImageConfig,
} from './metadata';

// Schema.org JSON-LD generators
export {
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  generateVehicleSchema,
  generateProductSchema,
  generateFAQSchema,
  generateBreadcrumbSchema,
  generateWebSiteSchema,
  generateBranchLocalBusinessSchema,
  generateBranchesLocalBusinessSchemas,
  renderJsonLd,
  combineSchemas,
  type OrganizationSchemaOptions,
  type LocalBusinessSchemaOptions,
  type VehicleSchemaOptions,
  type FAQItem,
  type BreadcrumbItem,
  type OpeningHoursSpecification,
  type BranchData,
} from './schema';
