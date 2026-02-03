/**
 * Email Components
 *
 * Reusable components for building email templates.
 * These components are styled to work across major email clients.
 *
 * @example
 * import {
 *   BaseLayout,
 *   EmailButton,
 *   EmailHeading,
 *   EmailText,
 *   EmailCard,
 *   EmailDetailRow,
 *   EmailDivider,
 *   EmailAlert,
 * } from '@/emails/components';
 */

// Base layout with header and footer
export { BaseLayout } from './base-layout';
export type { BaseLayoutProps, TenantBrandingProps } from './base-layout';

// Button component
export { EmailButton } from './email-button';
export type { EmailButtonProps } from './email-button';

// Heading component
export { EmailHeading } from './email-heading';
export type { EmailHeadingProps } from './email-heading';

// Text component
export { EmailText } from './email-text';
export type { EmailTextProps } from './email-text';

// Card and detail row components
export { EmailCard, EmailDetailRow } from './email-card';
export type { EmailCardProps, EmailDetailRowProps } from './email-card';

// Divider component
export { EmailDivider } from './email-divider';
export type { EmailDividerProps } from './email-divider';

// Alert component
export { EmailAlert } from './email-alert';
export type { EmailAlertProps } from './email-alert';
