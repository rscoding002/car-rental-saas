import type { ReactNode } from 'react';

/**
 * Root Layout
 *
 * Minimal wrapper that allows the [locale] layout to handle
 * the actual HTML structure with proper lang attribute.
 *
 * Note: This layout exists to satisfy Next.js requirements.
 * All styling and providers are in app/[locale]/layout.tsx.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
