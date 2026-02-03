import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { UserInviteForm } from '@/components/admin/user-invite-form';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

import type { UserRole } from '@/lib/supabase/types';

interface NewUserPageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewUserPage({ params }: NewUserPageProps) {
  const { locale } = await params;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?redirect=/admin/users/new`);
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id, role')
    .eq('auth_id', user.id)
    .single();

  if (!profile?.tenant_id) {
    redirect(`/${locale}/admin`);
  }

  // Check role - only admins can invite users
  const allowedRoles: UserRole[] = ['platform_admin', 'tenant_admin'];
  if (!allowedRoles.includes(profile.role as UserRole)) {
    redirect(`/${locale}/admin/users`);
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/${locale}/admin/users`}>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invite Team Member</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Add a new staff member to your organization
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <UserPlus className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              About Team Invitations
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
              New team members will receive an email invitation to set up their account.
              You can choose their role to control what they can access in the system.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <UserInviteForm locale={locale} />
    </div>
  );
}
