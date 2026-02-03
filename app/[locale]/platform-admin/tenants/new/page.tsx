'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { TenantCreateForm } from '@/components/platform-admin/tenant-create-form';

export default function NewTenantPage() {
  const params = useParams();
  const locale = params.locale as string;
  const t = useTranslations('platformAdmin');

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/${locale}/platform-admin/tenants`}>
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {t('createTenant')}
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up a new rental company on the platform
          </p>
        </div>
      </div>

      {/* Form */}
      <TenantCreateForm locale={locale} />
    </div>
  );
}
