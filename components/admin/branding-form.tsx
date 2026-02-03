'use client';

import {
  RefreshCw,
  Check,
  AlertCircle,
  Upload,
  Trash2,
  Palette,
  Type,
  Image as ImageIcon,
  Sparkles,
  RotateCcw,
  ExternalLink,
  Monitor,
  Smartphone,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useState, useTransition, useRef, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import {
  DEFAULT_BRANDING,
  AVAILABLE_FONTS,
  PRESET_PALETTES,
  generateColorPalette,
  getContrastColor,
} from '@/lib/tenant/theme';
import { cn } from '@/lib/utils';

import type { TenantBranding } from '@/lib/supabase/types';

interface BrandingFormProps {
  locale: string;
  initialData: {
    logoUrl: string | null;
    branding: TenantBranding | null;
  };
  tenantId: string;
}

// Color swatch component for preset palettes
function ColorSwatch({
  colors,
  name,
  isSelected,
  onClick,
}: {
  colors: { primary: string; secondary: string; accent: string };
  name: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all touch-manipulation',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-muted-foreground/50'
      )}
    >
      <div className="flex gap-1">
        <div
          className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: colors.primary }}
        />
        <div
          className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: colors.secondary }}
        />
        <div
          className="w-6 h-6 rounded-full border border-white/20 shadow-sm"
          style={{ backgroundColor: colors.accent }}
        />
      </div>
      <span className="text-xs font-medium text-muted-foreground">{name}</span>
    </button>
  );
}

// Color input with preview
function ColorInput({
  label,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  defaultValue: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const palette = generateColorPalette(value || defaultValue);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-12 h-12 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden relative"
          style={{ backgroundColor: value || defaultValue }}
        >
          <input
            ref={inputRef}
            type="color"
            value={value || defaultValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        </button>
        <div className="flex-1">
          <Input
            type="text"
            value={value || defaultValue}
            onChange={(e) => {
              const val = e.target.value;
              if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                onChange(val);
              }
            }}
            placeholder="#000000"
            className="font-mono uppercase"
          />
        </div>
        {value && value !== defaultValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="text-muted-foreground"
          >
            Reset
          </Button>
        )}
      </div>
      {/* Color palette preview */}
      <div className="flex gap-0.5 mt-2">
        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
          <div
            key={shade}
            className="flex-1 h-4 first:rounded-l last:rounded-r"
            style={{ backgroundColor: palette[shade] }}
            title={`${shade}: ${palette[shade]}`}
          />
        ))}
      </div>
    </div>
  );
}

// Live preview component with device toggle
function BrandingPreview({
  branding,
  logoUrl,
  previewDevice,
}: {
  branding: TenantBranding;
  logoUrl: string | null;
  previewDevice: 'desktop' | 'mobile';
}) {
  const primaryColor = branding.primaryColor || DEFAULT_BRANDING.primaryColor;
  const secondaryColor = branding.secondaryColor || DEFAULT_BRANDING.secondaryColor;
  const accentColor = branding.accentColor || DEFAULT_BRANDING.accentColor;
  const primaryPalette = generateColorPalette(primaryColor);
  const fontFamily = branding.fontFamily || DEFAULT_BRANDING.fontFamily;

  const isMobile = previewDevice === 'mobile';

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-border overflow-hidden bg-background shadow-lg mx-auto transition-all duration-300',
        isMobile ? 'max-w-[320px]' : 'w-full'
      )}
      style={{ fontFamily: `"${fontFamily}", sans-serif` }}
    >
      {/* Mock Header */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-border/50',
          isMobile ? 'p-3' : 'p-4'
        )}
        style={{ backgroundColor: primaryPalette[50] }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt="Logo"
              width={32}
              height={32}
              className={cn('object-contain', isMobile ? 'h-6 w-auto' : 'h-8 w-auto')}
            />
          ) : (
            <div
              className={cn(
                'rounded-lg flex items-center justify-center text-white font-bold',
                isMobile ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'
              )}
              style={{ backgroundColor: primaryColor }}
            >
              RC
            </div>
          )}
          <span
            className={cn('font-semibold', isMobile ? 'text-xs' : 'text-sm')}
            style={{ color: primaryColor }}
          >
            Rental Company
          </span>
        </div>
        {!isMobile && (
          <div className="flex gap-3">
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Home</span>
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Fleet</span>
            <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Contact</span>
          </div>
        )}
        {isMobile && (
          <div className="flex gap-0.5">
            <div className="w-4 h-0.5 rounded bg-muted-foreground" />
            <div className="w-4 h-0.5 rounded bg-muted-foreground" />
            <div className="w-4 h-0.5 rounded bg-muted-foreground" />
          </div>
        )}
      </div>

      {/* Mock Hero Section */}
      <div
        className={cn('relative', isMobile ? 'p-4' : 'p-6')}
        style={{ backgroundColor: primaryPalette[100] }}
      >
        <h2
          className={cn('font-bold', isMobile ? 'text-base' : 'text-lg')}
          style={{ color: secondaryColor }}
        >
          Rent Your Perfect Car
        </h2>
        <p className={cn('text-muted-foreground mt-1', isMobile ? 'text-xs' : 'text-sm')}>
          Explore our wide selection of vehicles
        </p>
        <button
          className={cn(
            'mt-3 rounded-md font-medium text-white',
            isMobile ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
          )}
          style={{ backgroundColor: primaryColor }}
        >
          Browse Fleet
        </button>
      </div>

      {/* Mock Content */}
      <div className={cn('space-y-3', isMobile ? 'p-3' : 'p-4')}>
        <h3 className={cn('font-semibold', isMobile ? 'text-sm' : 'text-base')}>Featured Vehicles</h3>

        {/* Mock Vehicle Cards */}
        <div className={cn('grid gap-2', isMobile ? 'grid-cols-1' : 'grid-cols-2')}>
          {[1, 2].map((i) => (
            <div key={i} className="border border-border rounded-lg p-2 bg-card">
              <div className="aspect-video bg-muted rounded mb-2" />
              <p className="text-xs font-medium">Vehicle Model {i}</p>
              <p className="text-xs text-muted-foreground">From €29/day</p>
              <button
                className="mt-2 w-full py-1 rounded text-xs font-medium"
                style={{
                  backgroundColor: accentColor,
                  color: getContrastColor(accentColor),
                }}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Mock Footer */}
      <div
        className={cn('border-t border-border/50', isMobile ? 'p-3' : 'p-4')}
        style={{ backgroundColor: primaryPalette[50] }}
      >
        <div className={cn('flex justify-between items-center', isMobile ? 'flex-col gap-2' : '')}>
          <span className="text-xs text-muted-foreground">© 2024 Rental Company</span>
          <div className="flex gap-2">
            <span className="text-xs" style={{ color: primaryColor }}>Privacy</span>
            <span className="text-xs" style={{ color: primaryColor }}>Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BrandingForm({ locale, initialData, tenantId }: BrandingFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [logoUrl, setLogoUrl] = useState<string | null>(initialData.logoUrl);
  const [branding, setBranding] = useState<TenantBranding>({
    primaryColor: initialData.branding?.primaryColor || '',
    secondaryColor: initialData.branding?.secondaryColor || '',
    accentColor: initialData.branding?.accentColor || '',
    fontFamily: initialData.branding?.fontFamily || DEFAULT_BRANDING.fontFamily,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track changes
  const updateBranding = useCallback((updates: Partial<TenantBranding>) => {
    setBranding((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  }, []);

  // Reset to defaults
  const handleResetToDefaults = useCallback(() => {
    setBranding({
      primaryColor: '',
      secondaryColor: '',
      accentColor: '',
      fontFamily: DEFAULT_BRANDING.fontFamily,
    });
    setLogoUrl(null);
    setHasUnsavedChanges(true);
  }, []);

  // Open preview in new tab
  const handlePreviewSite = useCallback(() => {
    // Extract locale from pathname (e.g., /en/admin/settings/branding -> en)
    const localeMatch = pathname?.match(/^\/([a-z]{2})\//);
    const currentLocale = localeMatch ? localeMatch[1] : locale || 'en';
    window.open(`/${currentLocale}`, '_blank');
  }, [pathname, locale]);

  // Handle logo upload
  const handleLogoUpload = useCallback(
    async (file: File) => {
      if (!file) {return;}

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo must be smaller than 2MB');
        return;
      }

      setIsUploading(true);
      setError(null);

      try {
        const supabase = createClient();

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${tenantId}/branding/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('media')
          .getPublicUrl(filePath);

        setLogoUrl(urlData.publicUrl);
        setHasUnsavedChanges(true);
      } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload logo');
      } finally {
        setIsUploading(false);
      }
    },
    [tenantId]
  );

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleLogoUpload(file);
      }
    },
    [handleLogoUpload]
  );

  // Handle file select
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleLogoUpload(file);
      }
    },
    [handleLogoUpload]
  );

  // Remove logo
  const handleRemoveLogo = useCallback(() => {
    setLogoUrl(null);
    setHasUnsavedChanges(true);
  }, []);

  // Apply preset palette
  const applyPreset = useCallback((preset: typeof PRESET_PALETTES[number]) => {
    setBranding((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
      accentColor: preset.accent,
    }));
    setHasUnsavedChanges(true);
  }, []);

  // Check if a preset is selected
  const isPresetSelected = (preset: typeof PRESET_PALETTES[number]) => {
    return (
      branding.primaryColor === preset.primary &&
      branding.secondaryColor === preset.secondary &&
      branding.accentColor === preset.accent
    );
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Clean up empty values
    const cleanBranding: TenantBranding = {};
    if (branding.primaryColor) {cleanBranding.primaryColor = branding.primaryColor;}
    if (branding.secondaryColor) {cleanBranding.secondaryColor = branding.secondaryColor;}
    if (branding.accentColor) {cleanBranding.accentColor = branding.accentColor;}
    if (branding.fontFamily && branding.fontFamily !== DEFAULT_BRANDING.fontFamily) {
      cleanBranding.fontFamily = branding.fontFamily;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/settings/branding', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            logoUrl,
            branding: Object.keys(cleanBranding).length > 0 ? cleanBranding : null,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save settings');
        }

        setSuccess(true);
        setHasUnsavedChanges(false);
        router.refresh();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Logo
          </CardTitle>
          <CardDescription>
            Upload your company logo (PNG, JPG, SVG, max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'relative border-2 border-dashed rounded-lg p-6 text-center transition-colors',
              'hover:border-primary/50 cursor-pointer',
              isUploading && 'opacity-50 pointer-events-none'
            )}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {logoUrl ? (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Image
                    src={logoUrl}
                    alt="Logo"
                    width={120}
                    height={60}
                    className="h-16 w-auto object-contain"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveLogo();
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Click or drag to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  {isUploading ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {isUploading ? 'Uploading...' : 'Drop your logo here'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preset Palettes */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            Quick Presets
          </CardTitle>
          <CardDescription>
            Select a preset color scheme or customize below
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_PALETTES.map((preset) => (
              <ColorSwatch
                key={preset.name}
                name={preset.name}
                colors={preset}
                isSelected={isPresetSelected(preset)}
                onClick={() => applyPreset(preset)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Colors */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Custom Colors
          </CardTitle>
          <CardDescription>
            Fine-tune your brand colors manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ColorInput
            label="Primary Color"
            value={branding.primaryColor || ''}
            onChange={(value) => updateBranding({ primaryColor: value })}
            defaultValue={DEFAULT_BRANDING.primaryColor}
          />
          <ColorInput
            label="Secondary Color"
            value={branding.secondaryColor || ''}
            onChange={(value) => updateBranding({ secondaryColor: value })}
            defaultValue={DEFAULT_BRANDING.secondaryColor}
          />
          <ColorInput
            label="Accent Color"
            value={branding.accentColor || ''}
            onChange={(value) => updateBranding({ accentColor: value })}
            defaultValue={DEFAULT_BRANDING.accentColor}
          />
        </CardContent>
      </Card>

      {/* Font Family */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="w-4 h-4" />
            Typography
          </CardTitle>
          <CardDescription>Choose a font family for your website</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select
              id="fontFamily"
              value={branding.fontFamily || DEFAULT_BRANDING.fontFamily}
              onChange={(e) => updateBranding({ fontFamily: e.target.value })}
              options={AVAILABLE_FONTS.map((font) => ({
                value: font.value,
                label: font.name,
              }))}
            />
            {/* Font preview */}
            <div
              className="mt-3 p-4 rounded-lg border border-border"
              style={{
                fontFamily: `"${branding.fontFamily || DEFAULT_BRANDING.fontFamily}", sans-serif`,
              }}
            >
              <p className="text-lg font-semibold">The quick brown fox</p>
              <p className="text-sm text-muted-foreground">
                jumps over the lazy dog. 0123456789
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base">Live Preview</CardTitle>
              <CardDescription>See how your branding will look</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Device Toggle */}
              <div className="flex items-center border border-border rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={cn(
                    'p-1.5 rounded transition-colors touch-manipulation',
                    previewDevice === 'desktop'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Desktop preview"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={cn(
                    'p-1.5 rounded transition-colors touch-manipulation',
                    previewDevice === 'mobile'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  title="Mobile preview"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>
              {/* Preview Site Button */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePreviewSite}
                className="gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview Site</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <BrandingPreview
            branding={{
              primaryColor: branding.primaryColor || DEFAULT_BRANDING.primaryColor,
              secondaryColor: branding.secondaryColor || DEFAULT_BRANDING.secondaryColor,
              accentColor: branding.accentColor || DEFAULT_BRANDING.accentColor,
              fontFamily: branding.fontFamily || DEFAULT_BRANDING.fontFamily,
            }}
            logoUrl={logoUrl}
            previewDevice={previewDevice}
          />
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
          Branding saved successfully!
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetToDefaults}
            disabled={isPending}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>
        <Button type="submit" disabled={isPending || isUploading}>
          {isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
