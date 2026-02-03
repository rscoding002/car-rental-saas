import { redirect } from 'next/navigation';

import { defaultLocale } from '@/i18n/config';

/**
 * Root Page
 *
 * Redirects to the default locale.
 * All actual content lives under /[locale]/ routes.
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
