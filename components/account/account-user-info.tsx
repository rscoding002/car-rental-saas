'use client';

import { useTranslations } from 'next-intl';
import { User as UserIcon } from 'lucide-react';

import { useAuthContext } from '@/lib/auth/auth-context';
import { Avatar } from '@/components/ui/avatar';

/**
 * Account User Info Component
 *
 * Displays user avatar, name, and member since date
 * Used in the account sidebar
 */
export function AccountUserInfo() {
  const t = useTranslations('account');
  const { user, authUser, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 animate-pulse">
        <div className="h-12 w-12 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.first_name || authUser?.email?.split('@')[0] || 'User';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div className="flex items-center gap-3">
      <Avatar
        src={null}
        alt={displayName}
        fallback={displayName.charAt(0).toUpperCase()}
        size="lg"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{displayName}</p>
        {memberSince && (
          <p className="text-sm text-muted-foreground">
            {t('memberSince')} {memberSince}
          </p>
        )}
      </div>
    </div>
  );
}
