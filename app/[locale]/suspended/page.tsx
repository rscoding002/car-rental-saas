'use client';

import { AlertTriangle, Mail, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function SuspendedPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('common');
  const locale = params.locale as string;

  const [isChecking, setIsChecking] = useState(false);
  const [tenantName, setTenantName] = useState<string | null>(null);

  // Fetch tenant info
  useEffect(() => {
    const fetchTenantInfo = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('tenant_id')
          .eq('auth_id', user.id)
          .single();

        if (userData?.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('name, status')
            .eq('id', userData.tenant_id)
            .single();

          if (tenantData) {
            setTenantName(tenantData.name);

            // If tenant is no longer suspended, redirect to appropriate page
            if (tenantData.status !== 'suspended') {
              router.push(`/${locale}/admin`);
            }
          }
        }
      }
    };

    fetchTenantInfo();
  }, [locale, router]);

  // Check if suspension has been lifted
  const checkStatus = async () => {
    setIsChecking(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single();

      if (userData?.tenant_id) {
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('status')
          .eq('id', userData.tenant_id)
          .single();

        if (tenantData?.status !== 'suspended') {
          router.push(`/${locale}/admin`);
          return;
        }
      }
    }

    setIsChecking(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 px-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            Account Suspended
          </h1>

          {/* Description */}
          <p className="text-center text-muted-foreground mb-6">
            {tenantName ? (
              <>
                Access to <strong>{tenantName}</strong> has been temporarily suspended.
              </>
            ) : (
              'Your organization\'s account has been temporarily suspended.'
            )}
          </p>

          {/* Reasons */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              This may be due to:
            </p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>• Billing or payment issues</li>
              <li>• Terms of service violation</li>
              <li>• Administrative action</li>
            </ul>
          </div>

          {/* Contact info */}
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground mb-2">
              Please contact support for assistance:
            </p>
            <a
              href="mailto:support@example.com"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              support@example.com
            </a>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={checkStatus}
              disabled={isChecking}
              className="w-full gap-2"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Check Status
                </>
              )}
            </Button>

            <Button
              variant="outline"
              asChild
              className="w-full gap-2"
            >
              <Link href={`/${locale}`}>
                <ArrowLeft className="w-4 h-4" />
                {t('backToHome')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
