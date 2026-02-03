# Product Requirements Document: Multi-Tenant SaaS Car Rental Platform

**Version:** 1.0
**Date:** 2026-01-31
**Status:** Draft

---

## 1. Introduction / Overview

This document defines the requirements for a **multi-tenant SaaS car rental platform** designed to be sold to car rental companies. The platform enables rental businesses to operate their entire online presence and booking operations through a single, white-labeled solution.

### Problem Statement

Car rental companies face fragmented tooling: separate systems for websites, booking engines, fleet management, invoicing, and customer management. Building custom solutions is expensive and time-consuming. Existing platforms often lack proper multi-language support for Baltic markets, have poor mobile experiences, or don't support both short-term and long-term rental models.

### Solution

A unified, white-label SaaS platform that provides:
- A premium, mobile-first public website with CMS-driven content
- A complete booking engine for short-term and long-term rentals
- Fleet and operations management
- Multi-language support (LT/EN/RU) for Baltic markets
- Full tenant isolation with enterprise-grade security

---

## 2. Goals

### Business Goals
1. **G1:** Create a sellable SaaS product with recurring subscription revenue
2. **G2:** Support hybrid pricing model (subscription tiers + optional add-ons)
3. **G3:** Enable rapid tenant onboarding with white-label customization
4. **G4:** Achieve high SEO performance for tenant websites (Core Web Vitals passing)

### Product Goals
1. **G5:** Provide a unified platform for both short-term and long-term car rentals
2. **G6:** Deliver a premium, mobile-first user experience
3. **G7:** Support multi-city, multi-branch operations per tenant
4. **G8:** Ensure complete tenant data isolation via Row Level Security
5. **G9:** Enable full localization for LT/EN/RU markets with easy expansion

### Technical Goals
1. **G10:** Build on modern stack (Next.js App Router, Supabase, Vercel)
2. **G11:** Achieve SSR/SSG for SEO with excellent performance
3. **G12:** Create a flexible CMS with page builder (blocks/sections)
4. **G13:** Design for easy template/layout changes in the future

---

## 3. User Stories

### 3.1 Platform Owner (You)

| ID | User Story |
|----|------------|
| PO-1 | As a platform owner, I want to create and manage tenant accounts so that I can onboard new car rental companies |
| PO-2 | As a platform owner, I want to configure subscription tiers and features so that I can control what each tenant can access |
| PO-3 | As a platform owner, I want to view all tenants and their usage so that I can monitor platform health |

### 3.2 Tenant Admin (Car Rental Company Owner/Manager)

| ID | User Story |
|----|------------|
| TA-1 | As a tenant admin, I want to configure my company branding (logo, colors, fonts) so that the website matches my brand |
| TA-2 | As a tenant admin, I want to connect my custom domain so that customers see my brand, not the platform's |
| TA-3 | As a tenant admin, I want to manage my fleet (add/edit/remove vehicles) so that availability is accurate |
| TA-4 | As a tenant admin, I want to set up multiple branches/locations so that customers can pick up cars from different cities |
| TA-5 | As a tenant admin, I want to configure pricing rules (base rates, seasons, durations) so that pricing is automated |
| TA-6 | As a tenant admin, I want to create and manage add-ons (GPS, child seat, insurance) so that I can upsell services |
| TA-7 | As a tenant admin, I want to create coupons and gift cards so that I can run promotions |
| TA-8 | As a tenant admin, I want to build and edit website pages using blocks/sections so that I can customize content without coding |
| TA-9 | As a tenant admin, I want to manage content in multiple languages so that I can serve different markets |
| TA-10 | As a tenant admin, I want to enable/disable languages so that I only show languages I support |
| TA-11 | As a tenant admin, I want to view and manage all bookings so that I can oversee operations |
| TA-12 | As a tenant admin, I want to configure cancellation policies so that customers know the rules |
| TA-13 | As a tenant admin, I want to manage user accounts and assign roles so that my team has appropriate access |
| TA-14 | As a tenant admin, I want to view reports and analytics so that I can make data-driven decisions |
| TA-15 | As a tenant admin, I want to view audit logs so that I can track who did what |
| TA-16 | As a tenant admin, I want to set up long-term rental plans so that I can offer monthly subscriptions |
| TA-17 | As a tenant admin, I want to track vehicle maintenance schedules so that my fleet stays operational |

### 3.3 Tenant Staff (Rental Agent/Employee)

| ID | User Story |
|----|------------|
| TS-1 | As a staff member, I want to process check-ins with mandatory photo documentation so that vehicle condition is recorded |
| TS-2 | As a staff member, I want to process check-outs with damage assessment so that issues are documented |
| TS-3 | As a staff member, I want to view today's pickups and returns so that I can prepare vehicles |
| TS-4 | As a staff member, I want to create bookings on behalf of walk-in customers so that they don't need to book online |
| TS-5 | As a staff member, I want to modify or cancel existing bookings so that I can handle customer requests |
| TS-6 | As a staff member, I want to record damage and link it to deposits so that costs are recovered |

### 3.4 End Customer (Renter)

| ID | User Story |
|----|------------|
| EC-1 | As a customer, I want to browse available vehicles on a mobile-friendly website so that I can find a car to rent |
| EC-2 | As a customer, I want to search by pickup/return location and dates so that I see relevant availability |
| EC-3 | As a customer, I want to filter and compare vehicles so that I can choose the best option |
| EC-4 | As a customer, I want to select add-ons during booking so that I can customize my rental |
| EC-5 | As a customer, I want to apply coupon codes so that I can get discounts |
| EC-6 | As a customer, I want to pay securely with my card, Apple Pay, or Google Pay so that checkout is convenient |
| EC-7 | As a customer, I want to receive booking confirmation via email so that I have a record |
| EC-8 | As a customer, I want to view my bookings in my account so that I can track my rentals |
| EC-9 | As a customer, I want to modify or cancel my booking (per policy) so that I can change plans |
| EC-10 | As a customer, I want to download invoices from my account so that I have documentation |
| EC-11 | As a customer, I want to view the website in my preferred language (LT/EN/RU) so that I can understand everything |
| EC-12 | As a customer, I want to subscribe to a long-term rental plan so that I have a car for months |
| EC-13 | As a customer, I want to sign contracts digitally so that I don't need to visit the office |

---

## 4. Functional Requirements

### 4.1 Multi-Tenant Foundation

| ID | Requirement | Priority |
|----|-------------|----------|
| MT-1 | The system must support multiple independent tenants with complete data isolation | P0 |
| MT-2 | Each tenant must have a unique identifier used for all data partitioning | P0 |
| MT-3 | Row Level Security (RLS) policies must enforce tenant isolation at the database level | P0 |
| MT-4 | Platform admins must be able to create, suspend, and delete tenant accounts | P0 |
| MT-5 | Each tenant must be assignable to a subscription tier (Starter/Pro/Business/Enterprise) | P0 |
| MT-6 | Feature access must be controlled based on subscription tier | P1 |

### 4.2 Authentication & Authorization

| ID | Requirement | Priority |
|----|-------------|----------|
| AU-1 | The system must use Supabase Auth for all authentication | P0 |
| AU-2 | The system must support email/password authentication | P0 |
| AU-3 | The system must support the following roles: Platform Admin, Tenant Admin, Tenant Manager, Tenant Staff, Customer | P0 |
| AU-4 | Role-based access control must restrict UI elements and API endpoints | P0 |
| AU-5 | Users must belong to exactly one tenant (except Platform Admins) | P0 |
| AU-6 | Sessions must be secure with proper token refresh handling | P0 |
| AU-7 | Password reset functionality must be available via email | P0 |

### 4.3 White-Label & Branding

| ID | Requirement | Priority |
|----|-------------|----------|
| WL-1 | Each tenant must be able to configure: logo, primary color, secondary color, accent color, fonts | P0 |
| WL-2 | Each tenant must be accessible via platform subdomain (tenant.platform.com) | P0 |
| WL-3 | Each tenant must be able to connect a custom domain (rent.company.com) | P1 |
| WL-4 | Custom domains must support automatic SSL provisioning | P1 |
| WL-5 | Branding must be applied consistently across all public pages | P0 |
| WL-6 | Tenant favicon and meta branding must be configurable | P1 |

### 4.4 CMS & Page Builder

| ID | Requirement | Priority |
|----|-------------|----------|
| CMS-1 | Tenant admins must be able to create and manage pages | P0 |
| CMS-2 | Pages must be built using a block/section-based page builder | P0 |
| CMS-3 | The system must provide pre-built block types: Hero, Features, Fleet Gallery, Testimonials, FAQ, CTA, Text/Image, Contact Form, Location Map, Pricing Table | P0 |
| CMS-4 | Each block must have configurable properties (text, images, layout options) | P0 |
| CMS-5 | Blocks must be reorderable via drag-and-drop or move controls | P0 |
| CMS-6 | All CMS content must support localization (LT/EN/RU) | P0 |
| CMS-7 | Pages must support SEO metadata (title, description, canonical, OG tags) per language | P0 |
| CMS-8 | Media library must allow upload and management of images | P0 |
| CMS-9 | The system must support creating navigation menus | P1 |
| CMS-10 | The template/layout system must be designed for easy future replacement | P0 |

### 4.5 Public Website & Template

| ID | Requirement | Priority |
|----|-------------|----------|
| PW-1 | The public website must use a premium, mobile-first responsive template | P0 |
| PW-2 | The template must render excellently on mobile devices (phones, tablets) | P0 |
| PW-3 | Core pages must include: Home, Fleet/Vehicles, Vehicle Detail, Booking Flow, About, Contact, Terms, Privacy | P0 |
| PW-4 | The fleet page must display available vehicle categories/models with filtering | P0 |
| PW-5 | Vehicle detail pages must show: photos, specs, pricing, availability calendar, book button | P0 |
| PW-6 | The website must include a prominent booking widget (search bar) | P0 |
| PW-7 | All public pages must be server-side rendered (SSR) or statically generated (SSG) | P0 |
| PW-8 | The customer account section must be integrated within the website (not separate app) | P0 |

### 4.6 SEO

| ID | Requirement | Priority |
|----|-------------|----------|
| SEO-1 | All pages must be SSR/SSG for search engine crawlability | P0 |
| SEO-2 | The system must generate XML sitemaps per tenant | P0 |
| SEO-3 | Canonical URLs must be set correctly for all pages | P0 |
| SEO-4 | Hreflang tags must be implemented for LT/EN/RU language versions | P0 |
| SEO-5 | Schema.org structured data must be implemented: Organization, LocalBusiness, Vehicle, Offer, FAQPage | P0 |
| SEO-6 | OpenGraph and Twitter Card meta tags must be present on all pages | P0 |
| SEO-7 | The website must target passing Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1) | P0 |
| SEO-8 | Images must be optimized (next/image, WebP, lazy loading) | P0 |
| SEO-9 | The system must generate robots.txt per tenant | P1 |

### 4.7 Multi-Language (i18n)

| ID | Requirement | Priority |
|----|-------------|----------|
| I18N-1 | The system must support Lithuanian, English, and Russian languages | P0 |
| I18N-2 | UI text must be managed via i18n dictionaries (JSON/structured files) | P0 |
| I18N-3 | CMS content must be independently editable per language | P0 |
| I18N-4 | Tenant admins must be able to enable/disable languages for their website | P0 |
| I18N-5 | Language switcher must be present on the public website | P0 |
| I18N-6 | URLs must include language prefix (/en/, /lt/, /ru/) or use subdomains | P0 |
| I18N-7 | Default language must be configurable per tenant | P0 |
| I18N-8 | The architecture must allow easy addition of new languages in the future | P0 |
| I18N-9 | Date, time, and currency formatting must respect locale settings | P1 |

### 4.8 Branch/Location Management

| ID | Requirement | Priority |
|----|-------------|----------|
| BR-1 | Each tenant must be able to create multiple branches/locations | P0 |
| BR-2 | Each branch must have: name, address, GPS coordinates, contact info, operating hours | P0 |
| BR-3 | Branches must be assignable to cities/regions | P0 |
| BR-4 | Vehicles must be assigned to a home branch | P0 |
| BR-5 | Operating hours must support different schedules per day of week | P1 |
| BR-6 | Branches must be displayable on a map on the public website | P1 |

### 4.9 Fleet Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FL-1 | Tenant admins must be able to add, edit, and remove vehicles | P0 |
| FL-2 | Each vehicle must have: make, model, year, license plate, VIN, category, transmission, fuel type, seats, doors, luggage capacity | P0 |
| FL-3 | Vehicles must support multiple photos | P0 |
| FL-4 | Vehicles must have status: Available, Rented, Maintenance, Retired | P0 |
| FL-5 | Vehicles must be assigned to a home branch | P0 |
| FL-6 | Vehicle categories must be configurable (Economy, Compact, SUV, Luxury, Van, etc.) | P0 |
| FL-7 | The system must track current odometer reading | P1 |
| FL-8 | Maintenance schedules must be configurable (by date or mileage) | P1 |
| FL-9 | Maintenance reminders must alert staff when service is due | P1 |
| FL-10 | Vehicle documents (insurance, registration) must be uploadable with expiry tracking | P2 |

### 4.10 Availability & Buffers

| ID | Requirement | Priority |
|----|-------------|----------|
| AV-1 | The system must calculate real-time vehicle availability based on bookings | P0 |
| AV-2 | Configurable buffer time must be supported between bookings (for cleaning/prep) | P0 |
| AV-3 | Buffer time must be settable globally and per vehicle category | P0 |
| AV-4 | Manual availability blocks must be creatable (for planned maintenance) | P0 |
| AV-5 | Availability calendar must be viewable in admin dashboard | P0 |
| AV-6 | One-way rentals (different pickup/return locations) must affect availability at both branches | P0 |

### 4.11 Pricing Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| PR-1 | Base daily/hourly rates must be configurable per vehicle or category | P0 |
| PR-2 | Seasonal pricing rules must be supported (date ranges with rate multipliers or fixed rates) | P0 |
| PR-3 | Duration-based pricing must be supported (weekly rate, monthly rate) | P0 |
| PR-4 | One-way fees must be configurable for different pickup/return location combinations | P0 |
| PR-5 | Add-ons must be configurable with per-day or per-rental pricing | P0 |
| PR-6 | Young driver / senior driver surcharges must be supported | P1 |
| PR-7 | Pricing must calculate automatically during booking flow | P0 |
| PR-8 | Price breakdown must be transparent to customers | P0 |
| PR-9 | Currency must be configurable per tenant (EUR default) | P1 |

### 4.12 Coupons & Gift Cards

| ID | Requirement | Priority |
|----|-------------|----------|
| CP-1 | Tenant admins must be able to create coupon codes | P0 |
| CP-2 | Coupons must support: percentage discount, fixed amount discount, free add-on | P0 |
| CP-3 | Coupons must have: validity dates, usage limits (total and per-customer), minimum order value | P0 |
| CP-4 | Customers must be able to apply coupon codes during checkout | P0 |
| CP-5 | Gift cards must be creatable with a monetary value | P1 |
| CP-6 | Gift cards must be redeemable during checkout | P1 |
| CP-7 | Gift card balance must be trackable | P1 |

### 4.13 Booking Engine (Short-Term)

| ID | Requirement | Priority |
|----|-------------|----------|
| BK-1 | Customers must be able to search availability by: pickup location, return location, pickup date/time, return date/time | P0 |
| BK-2 | Search results must show available vehicles with pricing | P0 |
| BK-3 | Customers must be able to select a vehicle and proceed to booking | P0 |
| BK-4 | Booking flow must collect: customer details, driver info, add-on selections, coupon code | P0 |
| BK-5 | Booking flow must show complete price breakdown before payment | P0 |
| BK-6 | Customers must be able to pay via Stripe (cards, Apple Pay, Google Pay) | P0 |
| BK-7 | Successful booking must create a reservation and send confirmation email | P0 |
| BK-8 | Booking must have statuses: Pending, Confirmed, Active (checked out), Completed, Cancelled | P0 |
| BK-9 | Staff must be able to create bookings on behalf of customers (walk-ins/phone) | P0 |
| BK-10 | Booking reference numbers must be unique and human-readable | P0 |

### 4.14 Booking Modifications & Cancellations

| ID | Requirement | Priority |
|----|-------------|----------|
| BM-1 | Customers must be able to view their bookings in their account | P0 |
| BM-2 | Customers must be able to modify bookings (dates, add-ons) subject to availability | P0 |
| BM-3 | Customers must be able to cancel bookings subject to cancellation policy | P0 |
| BM-4 | Cancellation policies must be configurable: free cancellation period, partial refund period, no refund period | P0 |
| BM-5 | Refunds must be processed automatically via Stripe based on policy | P0 |
| BM-6 | Modification/cancellation history must be logged | P0 |
| BM-7 | Staff must be able to modify/cancel any booking with override capabilities | P0 |

### 4.15 Deposits

| ID | Requirement | Priority |
|----|-------------|----------|
| DP-1 | Deposit amount must be configurable per vehicle category | P1 |
| DP-2 | The system must support deposit handling methods: pre-authorization, full charge with refund | P1 |
| DP-3 | Pre-authorization must be captured or released based on check-out outcome | P1 |
| DP-4 | Partial deposit retention must be supported for damage claims | P2 |
| DP-5 | Deposit status must be visible in booking details | P1 |
| DP-6 | Deposit transactions must be logged | P1 |

### 4.16 Check-In / Check-Out

| ID | Requirement | Priority |
|----|-------------|----------|
| CI-1 | Staff must be able to process vehicle check-out (start of rental) | P1 |
| CI-2 | Check-out must require mandatory photo documentation of vehicle condition | P1 |
| CI-3 | Check-out must record: odometer reading, fuel level, existing damage notes | P1 |
| CI-4 | Staff must be able to process vehicle check-in (end of rental) | P1 |
| CI-5 | Check-in must require mandatory photo documentation of vehicle condition | P1 |
| CI-6 | Check-in must record: odometer reading, fuel level, new damage assessment | P1 |
| CI-7 | Check-in/check-out photos must be stored and linked to the booking | P1 |
| CI-8 | Damage comparison view must show before/after photos | P2 |

### 4.17 Damage Management

| ID | Requirement | Priority |
|----|-------------|----------|
| DM-1 | Staff must be able to create damage reports linked to bookings | P2 |
| DM-2 | Damage reports must include: description, photos, location on vehicle diagram, estimated cost | P2 |
| DM-3 | Damage must be linkable to deposit deductions | P2 |
| DM-4 | Damage history must be viewable per vehicle | P2 |
| DM-5 | Damage reports must have status: Reported, Under Review, Resolved, Claimed | P2 |

### 4.18 Long-Term Rentals

| ID | Requirement | Priority |
|----|-------------|----------|
| LT-1 | Tenant admins must be able to create long-term rental plans (1/3/6/12 months) | P2 |
| LT-2 | Plans must specify: monthly rate, included mileage, overage rate per km | P2 |
| LT-3 | Customers must be able to subscribe to long-term plans via the website | P2 |
| LT-4 | The system must generate contracts for long-term rentals | P2 |
| LT-5 | Contracts must be available as PDF | P2 |
| LT-6 | Basic e-signature must be supported (typed signature + timestamp) | P2 |
| LT-7 | Monthly billing must be automated via Stripe subscriptions | P2 |
| LT-8 | Mileage tracking must trigger overage charges | P2 |
| LT-9 | Contract extensions must be manageable | P2 |
| LT-10 | Early termination must be handled with configurable penalties | P2 |

### 4.19 Invoicing

| ID | Requirement | Priority |
|----|-------------|----------|
| IN-1 | Invoices must be generated for all completed bookings | P1 |
| IN-2 | Invoices must be available as downloadable PDF | P1 |
| IN-3 | Invoice must include: tenant company details, customer details, itemized charges, taxes, totals | P1 |
| IN-4 | Invoice numbering must be sequential and configurable | P1 |
| IN-5 | Customers must be able to download invoices from their account | P1 |
| IN-6 | Invoice history must be viewable in admin | P1 |
| IN-7 | Credit notes must be generatable for refunds | P2 |

### 4.20 Customer Account

| ID | Requirement | Priority |
|----|-------------|----------|
| CA-1 | Customers must be able to register and log in | P0 |
| CA-2 | Customer account page must show booking history | P0 |
| CA-3 | Customer account page must allow downloading invoices | P1 |
| CA-4 | Customer account page must show upcoming bookings | P0 |
| CA-5 | Customers must be able to modify/cancel bookings from their account | P0 |
| CA-6 | Customers must be able to update their profile information | P0 |
| CA-7 | Account page must be integrated within the tenant's website (same look and feel) | P0 |

### 4.21 Admin Dashboard

| ID | Requirement | Priority |
|----|-------------|----------|
| AD-1 | Admin dashboard must be accessible only to authenticated tenant staff/admins | P0 |
| AD-2 | Dashboard must provide overview: today's pickups/returns, active rentals, pending bookings, fleet status | P0 |
| AD-3 | Bookings section must list all bookings with filtering (status, date range, branch, vehicle) | P0 |
| AD-4 | Fleet section must list all vehicles with status and quick actions | P0 |
| AD-5 | Pricing section must manage rates, seasons, add-ons, coupons | P0 |
| AD-6 | Branches section must manage locations | P0 |
| AD-7 | Customers section must list customers with booking history | P1 |
| AD-8 | Reports section must provide: revenue reports, utilization reports, booking reports | P1 |
| AD-9 | Settings section must manage: branding, languages, integrations, team members | P0 |
| AD-10 | Users section must manage staff accounts and roles | P0 |
| AD-11 | Deposits section must track deposit status across bookings | P1 |
| AD-12 | Damage section must list all damage reports | P2 |
| AD-13 | Invoices section must list all invoices | P1 |

### 4.22 Audit Log

| ID | Requirement | Priority |
|----|-------------|----------|
| AL-1 | The system must log significant actions: booking changes, price changes, user changes, settings changes | P1 |
| AL-2 | Audit log must record: timestamp, user, action type, entity affected, before/after values | P1 |
| AL-3 | Audit log must be viewable by tenant admins | P1 |
| AL-4 | Audit log must be filterable by date range, user, action type | P1 |
| AL-5 | Audit logs must be retained for a configurable period (default 1 year) | P2 |

### 4.23 Notifications

| ID | Requirement | Priority |
|----|-------------|----------|
| NT-1 | The system must send email notifications for: booking confirmation, booking modification, booking cancellation, upcoming rental reminder, rental completion | P0 |
| NT-2 | Email templates must be customizable per tenant | P1 |
| NT-3 | Email templates must support localization | P1 |
| NT-4 | Staff notifications must be sent for: new booking, cancellation, check-in/out completed | P1 |
| NT-5 | Email sending must use a reliable service (Resend, SendGrid, or Supabase built-in) | P0 |

### 4.24 Platform Administration

| ID | Requirement | Priority |
|----|-------------|----------|
| PA-1 | Platform admin must be able to create new tenants | P0 |
| PA-2 | Platform admin must be able to assign subscription tiers to tenants | P0 |
| PA-3 | Platform admin must be able to view all tenants and their status | P0 |
| PA-4 | Platform admin must be able to suspend/reactivate tenants | P0 |
| PA-5 | Platform admin must be able to impersonate tenant admins for support | P2 |
| PA-6 | Platform admin dashboard must be separate from tenant dashboards | P0 |

---

## 5. Non-Goals (Out of Scope)

The following are explicitly **NOT** in scope for this project:

1. **Mobile native apps** - No iOS or Android apps; mobile experience is via responsive web
2. **GPS/Telematics integration** - No real-time vehicle tracking or IoT integration
3. **Third-party channel managers** - No integration with Kayak, Rentalcars, etc.
4. **Accounting software integration** - No direct sync with QuickBooks, Xero, etc.
5. **Advanced CRM features** - No marketing automation, email campaigns, lead scoring
6. **Dynamic pricing algorithms** - No AI/ML-based demand pricing
7. **Driver verification services** - No license validation API integrations
8. **Chat/messaging support** - No live chat or in-app messaging (Phase 2+)
9. **SMS/WhatsApp notifications** - Email only for MVP (Phase 2)
10. **Self-service tenant signup** - Manual onboarding only for MVP (Phase 2)
11. **Multiple currencies per tenant** - Single currency per tenant only
12. **Vehicle transfer between tenants** - Each tenant has isolated fleet
13. **Franchise management** - No multi-tenant hierarchies or franchisee relationships
14. **Offline mode** - Requires internet connectivity

---

## 6. Design Considerations

### 6.1 UI/UX Principles

- **Mobile-first:** All designs start with mobile viewport, then scale up
- **Premium feel:** Clean, modern aesthetic with generous whitespace
- **Accessibility:** WCAG 2.1 AA compliance target
- **Consistency:** Design system with reusable components
- **Performance:** Optimize for fast load times (lazy loading, code splitting)

### 6.2 Public Website Template

The initial template should include:

- **Header:** Logo, navigation, language switcher, CTA button
- **Footer:** Links, contact info, social media, legal pages
- **Booking widget:** Prominent search form (pickup/return locations, dates)
- **Vehicle cards:** Photo, name, category, key specs, price, CTA
- **Block library:** Modular sections for page builder

### 6.3 Admin Dashboard

- **Sidebar navigation:** Collapsible, with icons and labels
- **Data tables:** Sortable, filterable, paginated
- **Forms:** Inline validation, clear error messages
- **Responsive:** Usable on tablets (not optimized for phones)

### 6.4 Component Library

Use Tailwind CSS with a component approach:
- Headless UI or Radix for accessible primitives
- Consistent spacing, typography, and color tokens
- Dark mode support (optional, nice-to-have)

---

## 7. Technical Considerations

### 7.1 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Payments | Stripe |
| Hosting | Vercel |
| Email | Resend or Supabase built-in |

### 7.2 Architecture Principles

1. **Multi-tenancy via RLS:** Every table includes `tenant_id`, enforced by Row Level Security policies
2. **Server Components by default:** Use React Server Components for data fetching
3. **Edge-ready:** Design for Vercel Edge Runtime where applicable
4. **Type safety:** End-to-end TypeScript with generated Supabase types
5. **Modular structure:** Feature-based folder organization

### 7.3 Database Schema Highlights

Key tables (high-level):
- `tenants` - Tenant accounts and settings
- `users` - All users with tenant association and roles
- `branches` - Locations per tenant
- `vehicles` - Fleet inventory
- `vehicle_categories` - Vehicle groupings
- `bookings` - Reservations
- `booking_addons` - Add-ons per booking
- `pricing_rules` - Rate configurations
- `seasons` - Seasonal pricing periods
- `addons` - Available add-ons
- `coupons` - Discount codes
- `pages` - CMS pages
- `page_blocks` - Block content per page
- `media` - Uploaded files
- `invoices` - Generated invoices
- `audit_logs` - Activity tracking

### 7.4 Key Technical Decisions

1. **Tenant resolution:** Tenants identified by subdomain or custom domain, resolved via middleware
2. **CMS storage:** Block content stored as JSONB for flexibility
3. **i18n approach:** next-intl with URL prefix routing (/en, /lt, /ru)
4. **Image handling:** Supabase Storage with next/image optimization
5. **Payments:** Stripe Checkout for simplicity, migrate to Elements if needed
6. **PDF generation:** React-PDF or similar for invoices/contracts

### 7.5 Performance Targets

| Metric | Target |
|--------|--------|
| Largest Contentful Paint (LCP) | < 2.5s |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Time to First Byte (TTFB) | < 600ms |
| Lighthouse Performance Score | > 90 |

### 7.6 Security Requirements

1. **Authentication:** All mutations require authentication
2. **Authorization:** RLS policies enforce tenant boundaries
3. **Input validation:** Zod schemas for all inputs
4. **CSRF protection:** Built into Next.js
5. **Rate limiting:** Implement for auth and booking endpoints
6. **Secrets management:** Environment variables, never in code
7. **Audit logging:** Track sensitive operations

---

## 8. Success Metrics

### 8.1 Platform Metrics

| Metric | Target |
|--------|--------|
| Tenant onboarding time | < 1 hour (manual setup) |
| Platform uptime | 99.9% |
| Page load time (p95) | < 3 seconds |
| Core Web Vitals pass rate | > 95% of pages |

### 8.2 Tenant Success Metrics

| Metric | Target |
|--------|--------|
| Booking conversion rate | > 3% of website visitors |
| Booking completion rate | > 70% of started bookings |
| Mobile booking share | > 50% of bookings |
| Customer return rate | > 30% |

### 8.3 Business Metrics

| Metric | Target |
|--------|--------|
| Monthly Recurring Revenue (MRR) | Track and grow |
| Tenant churn rate | < 5% monthly |
| Tenant NPS | > 50 |

---

## 9. Milestones & Phases

### Phase 1: MVP (Core Platform)

**Goal:** Launchable product for first tenants

| Component | Features |
|-----------|----------|
| Multi-tenant foundation | Tenant model, RLS, isolation |
| Auth & roles | Supabase Auth, RBAC |
| CMS & page builder | Pages, blocks, media library |
| Public template | Premium mobile-first design |
| i18n | LT/EN/RU support |
| SEO | SSR/SSG, sitemap, schema.org, hreflang |
| Fleet management | Vehicles, categories, branches |
| Availability | Real-time availability, buffers |
| Pricing | Base rates, seasons, add-ons |
| Booking engine | Search, booking flow, Stripe payments |
| Customer account | View bookings, basic self-service |
| Admin dashboard | Bookings, fleet, basic settings |
| Notifications | Email (booking confirmations) |

### Phase 2: Operations & Finance

**Goal:** Complete rental operations workflow

| Component | Features |
|-----------|----------|
| Deposits | Pre-auth, capture, refund |
| Check-in/check-out | Photo documentation, damage notes |
| Damage management | Reports, deposit linking |
| Invoicing | PDF generation, download |
| Long-term rentals | Plans, contracts, monthly billing |
| Maintenance | Tracking, reminders |
| Advanced notifications | More email types, templates |
| Audit log | Action tracking |

### Phase 3: Growth & Scale

**Goal:** Self-service and advanced features

| Component | Features |
|-----------|----------|
| Self-service signup | Trial, onboarding wizard |
| SMS/WhatsApp | Additional notification channels |
| Advanced reports | Analytics, exports |
| API access | Public API for integrations |
| Additional languages | Easy addition framework |
| Premium templates | Purchasable template add-ons |

---

## 10. Open Questions

| # | Question | Status |
|---|----------|--------|
| 1 | What email service to use? (Resend vs Supabase vs SendGrid) | To decide |
| 2 | Specific subscription tier limits (vehicles, bookings, users per tier)? | To define |
| 3 | Tax calculation requirements (VAT handling, multi-country)? | To clarify |
| 4 | Specific report types needed for MVP? | To define |
| 5 | Customer driver's license upload requirement for bookings? | To decide |
| 6 | Minimum rental duration (hourly rentals supported)? | To clarify |
| 7 | Age restrictions handling (minimum/maximum driver age)? | To clarify |
| 8 | Payment retry logic for failed long-term billing? | To define |

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| Tenant | A car rental company using the platform |
| Branch | A physical location where vehicles are picked up/returned |
| Buffer | Time blocked between bookings for cleaning/preparation |
| Add-on | Optional extras (GPS, child seat, insurance) |
| RLS | Row Level Security - Postgres feature for data isolation |
| SSR | Server-Side Rendering |
| SSG | Static Site Generation |
| CMS | Content Management System |
| i18n | Internationalization |

---

## Appendix B: Subscription Tier Outline (Draft)

| Feature | Starter | Pro | Business | Enterprise |
|---------|---------|-----|----------|------------|
| Vehicles | Up to 10 | Up to 50 | Up to 200 | Unlimited |
| Branches | 1 | 3 | 10 | Unlimited |
| Staff users | 2 | 5 | 20 | Unlimited |
| Languages | 1 | 3 | 3 | All |
| Custom domain | No | Yes | Yes | Yes |
| Long-term rentals | No | Yes | Yes | Yes |
| API access | No | No | Yes | Yes |
| Priority support | No | No | Yes | Yes |
| Whitelabel (remove platform branding) | No | No | No | Yes |

*Note: These are draft limits, to be finalized based on business strategy.*

---

**Document End**
