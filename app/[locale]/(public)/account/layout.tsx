import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/supabase/server';
import { AccountNav, AccountUserInfo } from '@/components/account';

interface AccountLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Account Layout
 *
 * Layout for customer account pages.
 * Mobile-first design with:
 * - Horizontal tabs on mobile
 * - Sidebar with user info on desktop
 *
 * Protected route - redirects to login if not authenticated.
 */
export default async function AccountLayout({
  children,
  params,
}: AccountLayoutProps) {
  const { locale } = await params;
  const supabase = await createClient();
  const t = await getTranslations('account');

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect_to=/${locale}/account`);
  }

  return (
    <div className="min-h-[calc(100vh-theme(spacing.16))] bg-muted/30">
      {/* Mobile: Tabs Navigation */}
      <div className="md:hidden">
        <AccountNav locale={locale} variant="tabs" />
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="md:grid md:grid-cols-[280px_1fr] md:gap-8 lg:gap-12">
          {/* Desktop: Sidebar */}
          <aside className="hidden md:block">
            <div className="sticky top-24 space-y-6">
              {/* User Info Card */}
              <div className="rounded-xl bg-card border border-border p-4">
                <AccountUserInfo />
              </div>

              {/* Navigation */}
              <div className="rounded-xl bg-card border border-border p-4">
                <AccountNav locale={locale} variant="sidebar" />
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="mt-6 md:mt-0">
            <div className="rounded-xl bg-card border border-border">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
