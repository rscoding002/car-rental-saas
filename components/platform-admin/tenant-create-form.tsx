'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  RefreshCw,
  Check,
  AlertCircle,
  Building2,
  Mail,
  Globe,
  CreditCard,
  User,
  Link as LinkIcon,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { getSubdomainDisplay, getSubdomainUrl, validateSlugFormat } from '@/lib/tenant/subdomain';

interface TenantCreateFormProps {
  locale: string;
}

interface FormData {
  name: string;
  slug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  subscriptionTier: string;
  domain: string;
}

// Subscription tier options
const SUBSCRIPTION_TIERS = [
  { value: 'trial', label: 'Trial', description: '14-day free trial' },
  { value: 'free', label: 'Free', description: 'Basic features, limited usage' },
  { value: 'starter', label: 'Starter', description: 'For small businesses' },
  { value: 'professional', label: 'Professional', description: 'For growing companies' },
  { value: 'enterprise', label: 'Enterprise', description: 'Unlimited features' },
];

// Tier option component
function TierOption({
  tier,
  label,
  description,
  isSelected,
  onSelect,
}: {
  tier: string;
  label: string;
  description: string;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const tierColors: Record<string, string> = {
    trial: 'border-cyan-500 bg-cyan-500/10',
    free: 'border-gray-500 bg-gray-500/10',
    starter: 'border-blue-500 bg-blue-500/10',
    professional: 'border-purple-500 bg-purple-500/10',
    enterprise: 'border-amber-500 bg-amber-500/10',
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex-1 p-3 rounded-lg border-2 text-left transition-all touch-manipulation min-w-[120px]',
        isSelected
          ? `${tierColors[tier]} ring-2 ring-offset-2`
          : 'border-border hover:border-muted-foreground/50'
      )}
    >
      <p className={cn('font-medium text-sm', isSelected && 'text-foreground')}>
        {label}
      </p>
      <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
    </button>
  );
}

// Generate slug from name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// Slug availability status
type SlugStatus = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';

interface SlugCheckResult {
  available: boolean;
  valid: boolean;
  error?: string;
  subdomain?: {
    subdomainUrl: string;
    subdomainDisplay: string;
  };
}

export function TenantCreateForm({ locale }: TenantCreateFormProps) {
  const router = useRouter();
  const t = useTranslations('platformAdmin');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>('idle');
  const [slugCheckResult, setSlugCheckResult] = useState<SlugCheckResult | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    adminEmail: '',
    adminFirstName: '',
    adminLastName: '',
    subscriptionTier: 'trial',
    domain: '',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Debounced slug availability check
  const checkSlugAvailability = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugStatus('idle');
      setSlugCheckResult(null);
      return;
    }

    // Validate format first (client-side)
    const formatError = validateSlugFormat(slug);
    if (formatError) {
      setSlugStatus('invalid');
      setSlugCheckResult({
        available: false,
        valid: false,
        error: formatError,
      });
      return;
    }

    setSlugStatus('checking');

    try {
      const response = await fetch(
        `/api/platform-admin/tenants/check-slug?slug=${encodeURIComponent(slug)}`
      );
      const data = await response.json();

      if (data.available) {
        setSlugStatus('available');
        setSlugCheckResult(data);
      } else if (!data.valid) {
        setSlugStatus('invalid');
        setSlugCheckResult(data);
      } else {
        setSlugStatus('unavailable');
        setSlugCheckResult(data);
      }
    } catch {
      // On error, don't show status (will be validated on submit)
      setSlugStatus('idle');
      setSlugCheckResult(null);
    }
  }, []);

  // Debounce slug check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.slug) {
        checkSlugAvailability(formData.slug);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.slug, checkSlugAvailability]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!slugManuallyEdited && formData.name) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(prev.name),
      }));
    }
  }, [formData.name, slugManuallyEdited]);

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is edited
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Handle slug change
  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    updateField('slug', generateSlug(value));
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Company name must be at least 2 characters';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug must be at least 3 characters';
    } else if (slugStatus === 'unavailable') {
      newErrors.slug = 'This slug is already in use';
    } else if (slugStatus === 'invalid' && slugCheckResult?.error) {
      newErrors.slug = slugCheckResult.error;
    }

    if (!formData.adminEmail) {
      newErrors.adminEmail = 'Admin email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.adminEmail)) {
      newErrors.adminEmail = 'Invalid email address';
    }

    if (!formData.adminFirstName.trim()) {
      newErrors.adminFirstName = 'Admin first name is required';
    }

    if (!formData.adminLastName.trim()) {
      newErrors.adminLastName = 'Admin last name is required';
    }

    if (formData.domain && !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(formData.domain.toLowerCase())) {
      newErrors.domain = 'Invalid domain format';
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
        const response = await fetch('/api/platform-admin/tenants', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            adminEmail: formData.adminEmail.trim().toLowerCase(),
            adminFirstName: formData.adminFirstName.trim(),
            adminLastName: formData.adminLastName.trim(),
            subscriptionTier: formData.subscriptionTier,
            domain: formData.domain.trim().toLowerCase() || null,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create tenant');
        }

        setSuccess(true);

        // Redirect to tenant detail page after short delay
        setTimeout(() => {
          router.push(`/${locale}/platform-admin/tenants/${data.tenant.id}`);
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  // Success state
  if (success) {
    const subdomainUrl = getSubdomainUrl(formData.slug);
    const subdomainDisplay = getSubdomainDisplay(formData.slug);

    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tenant Created Successfully</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>{formData.name}</strong> has been created. An invitation email will be sent to the admin.
            </p>

            {/* Provisioned Subdomain */}
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4 text-left">
              <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">
                Provisioned Subdomain
              </p>
              <a
                href={subdomainUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-green-800 dark:text-green-200 hover:underline font-mono text-sm"
              >
                <Globe className="w-4 h-4" />
                {subdomainDisplay}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-muted-foreground">Redirecting to tenant details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* Tenant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-600" />
            Tenant Information
          </CardTitle>
          <CardDescription>
            Basic information about the rental company
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Company Name */}
          <div className="space-y-2">
            <Label htmlFor="name">
              Company Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Acme Car Rentals"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Slug */}
          <div className="space-y-2">
            <Label htmlFor="slug">
              Slug <span className="text-red-500">*</span>
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="acme-car-rentals"
                  className={cn(
                    'pl-9 pr-10',
                    errors.slug ? 'border-red-500' : '',
                    slugStatus === 'available' ? 'border-green-500' : '',
                    slugStatus === 'unavailable' || slugStatus === 'invalid' ? 'border-red-500' : ''
                  )}
                />
                {/* Slug status indicator */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && (
                    <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                  )}
                  {slugStatus === 'available' && (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  )}
                  {(slugStatus === 'unavailable' || slugStatus === 'invalid') && (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Subdomain URL Preview */}
            {formData.slug && (
              <div className={cn(
                'p-3 rounded-lg border text-sm',
                slugStatus === 'available'
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-muted/50 border-border'
              )}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Tenant URL (Subdomain)
                    </p>
                    <p className="font-mono text-sm flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                      {getSubdomainDisplay(formData.slug)}
                    </p>
                  </div>
                  {slugStatus === 'available' && (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Available
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Slug status message */}
            {slugStatus === 'unavailable' && slugCheckResult?.error && (
              <p className="text-xs text-red-500">{slugCheckResult.error}</p>
            )}
            {slugStatus === 'invalid' && slugCheckResult?.error && (
              <p className="text-xs text-red-500">{slugCheckResult.error}</p>
            )}
            {errors.slug && slugStatus !== 'invalid' && slugStatus !== 'unavailable' && (
              <p className="text-xs text-red-500">{errors.slug}</p>
            )}

            <p className="text-xs text-muted-foreground">
              This will be the subdomain for the tenant&apos;s website.
            </p>
          </div>

          {/* Custom Domain */}
          <div className="space-y-2">
            <Label htmlFor="domain">
              Custom Domain <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="domain"
                value={formData.domain}
                onChange={(e) => updateField('domain', e.target.value)}
                placeholder="rentals.acme.com"
                className={cn('pl-9', errors.domain ? 'border-red-500' : '')}
              />
            </div>
            {errors.domain && (
              <p className="text-xs text-red-500">{errors.domain}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Admin User
          </CardTitle>
          <CardDescription>
            The initial administrator for this tenant. They will receive an invitation email.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Admin Name */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminFirstName">
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminFirstName"
                value={formData.adminFirstName}
                onChange={(e) => updateField('adminFirstName', e.target.value)}
                placeholder="John"
                className={errors.adminFirstName ? 'border-red-500' : ''}
              />
              {errors.adminFirstName && (
                <p className="text-xs text-red-500">{errors.adminFirstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminLastName">
                Last Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminLastName"
                value={formData.adminLastName}
                onChange={(e) => updateField('adminLastName', e.target.value)}
                placeholder="Doe"
                className={errors.adminLastName ? 'border-red-500' : ''}
              />
              {errors.adminLastName && (
                <p className="text-xs text-red-500">{errors.adminLastName}</p>
              )}
            </div>
          </div>

          {/* Admin Email */}
          <div className="space-y-2">
            <Label htmlFor="adminEmail">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={(e) => updateField('adminEmail', e.target.value)}
                placeholder="admin@acme.com"
                className={cn('pl-9', errors.adminEmail ? 'border-red-500' : '')}
              />
            </div>
            {errors.adminEmail && (
              <p className="text-xs text-red-500">{errors.adminEmail}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-green-600" />
            Subscription Tier
          </CardTitle>
          <CardDescription>
            Select the subscription plan for this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {SUBSCRIPTION_TIERS.map((tier) => (
              <TierOption
                key={tier.value}
                tier={tier.value}
                label={tier.label}
                description={tier.description}
                isSelected={formData.subscriptionTier === tier.value}
                onSelect={() => updateField('subscriptionTier', tier.value)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-purple-600 hover:bg-purple-700 gap-2"
        >
          {isPending ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {t('createTenant')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
