'use client';

import {
  RefreshCw,
  Check,
  AlertCircle,
  Mail,
  User,
  Phone,
  Shield,
  ShieldCheck,
  UserCog,
  Send,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

import type { UserRole } from '@/lib/supabase/types';

interface UserInviteFormProps {
  locale: string;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'tenant_admin' | 'tenant_manager' | 'tenant_staff';
  sendInvite: boolean;
}

// Role option component
function RoleOption({
  role,
  title,
  description,
  icon: Icon,
  isSelected,
  onSelect,
}: {
  role: FormData['role'];
  title: string;
  description: string;
  icon: React.ElementType;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all touch-manipulation',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-muted-foreground/50'
      )}
    >
      <div
        className={cn(
          'p-2 rounded-lg shrink-0',
          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className={cn('font-medium', isSelected ? 'text-primary' : 'text-foreground')}>
          {title}
        </p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

export function UserInviteForm({ locale }: UserInviteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    role: 'tenant_staff',
    sendInvite: true,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to invite user');
        }

        setSuccess(true);

        // Redirect to users list after success
        setTimeout(() => {
          router.push(`/${locale}/admin/users`);
          router.refresh();
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  // Handle input change
  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="w-4 h-4" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Enter the user&apos;s contact details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                placeholder="John"
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                placeholder="Doe"
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="john.doe@example.com"
                className={cn('pl-9', errors.email ? 'border-red-500' : '')}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (optional)</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+370 600 12345"
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Role & Permissions
          </CardTitle>
          <CardDescription>
            Choose what this user can access and manage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <RoleOption
              role="tenant_admin"
              title="Administrator"
              description="Full access to all features and settings"
              icon={ShieldCheck}
              isSelected={formData.role === 'tenant_admin'}
              onSelect={() => handleChange('role', 'tenant_admin')}
            />
            <RoleOption
              role="tenant_manager"
              title="Manager"
              description="Manage operations, fleet, bookings, and pricing"
              icon={Shield}
              isSelected={formData.role === 'tenant_manager'}
              onSelect={() => handleChange('role', 'tenant_manager')}
            />
            <RoleOption
              role="tenant_staff"
              title="Staff"
              description="View and create bookings, view customers"
              icon={UserCog}
              isSelected={formData.role === 'tenant_staff'}
              onSelect={() => handleChange('role', 'tenant_staff')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invite Options */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="w-4 h-4" />
            Invite Options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start space-x-3">
            <Checkbox
              id="sendInvite"
              checked={formData.sendInvite}
              onCheckedChange={(checked) => handleChange('sendInvite', !!checked)}
            />
            <div>
              <Label htmlFor="sendInvite" className="cursor-pointer">
                Send email invitation
              </Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                The user will receive an email with a link to set their password and access the system.
              </p>
            </div>
          </div>

          {!formData.sendInvite && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-sm text-amber-700 dark:text-amber-300">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Without an invite, the user will need to use the &quot;Forgot Password&quot; feature to set their password.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          User invited successfully! Redirecting...
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || success}>
          {isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Inviting...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Send Invite
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
