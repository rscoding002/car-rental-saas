'use client';

import {
  RefreshCw,
  Check,
  AlertCircle,
  Globe,
  Star,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { localeNames, localeFlags, locales, type Locale } from '@/i18n/config';
import { cn } from '@/lib/utils';

import type { TenantLanguages } from '@/lib/supabase/types';

interface LanguagesFormProps {
  locale: string;
  initialData: TenantLanguages;
}

// Language card component
function LanguageCard({
  language,
  isEnabled,
  isDefault,
  onToggle,
  onSetDefault,
  canDisable,
}: {
  language: Locale;
  isEnabled: boolean;
  isDefault: boolean;
  onToggle: () => void;
  onSetDefault: () => void;
  canDisable: boolean;
}) {
  const flag = localeFlags[language];
  const name = localeNames[language];

  return (
    <div
      className={cn(
        'relative border rounded-lg p-4 transition-all',
        isEnabled
          ? 'border-primary/50 bg-primary/5'
          : 'border-border bg-muted/30',
        isDefault && 'ring-2 ring-primary/30'
      )}
    >
      {/* Default badge */}
      {isDefault && (
        <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" />
          Default
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label={`${name} flag`}>
            {flag}
          </span>
          <div>
            <p className={cn(
              'font-medium',
              isEnabled ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {name}
            </p>
            <p className="text-xs text-muted-foreground uppercase">
              {language}
            </p>
          </div>
        </div>

        {/* Toggle button */}
        <button
          type="button"
          onClick={onToggle}
          disabled={!canDisable && isEnabled}
          className={cn(
            'p-1 rounded-md transition-colors touch-manipulation',
            isEnabled
              ? 'text-primary hover:bg-primary/10'
              : 'text-muted-foreground hover:bg-muted',
            !canDisable && isEnabled && 'opacity-50 cursor-not-allowed'
          )}
          title={isEnabled ? 'Disable language' : 'Enable language'}
        >
          {isEnabled ? (
            <ToggleRight className="w-6 h-6" />
          ) : (
            <ToggleLeft className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Set as default button */}
      {isEnabled && !isDefault && (
        <button
          type="button"
          onClick={onSetDefault}
          className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 border border-border rounded-md hover:border-primary/50 transition-colors touch-manipulation"
        >
          Set as default
        </button>
      )}

      {/* Status indicator */}
      <div className="mt-3 flex items-center gap-1.5 text-xs">
        <div
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            isEnabled ? 'bg-green-500' : 'bg-muted-foreground/50'
          )}
        />
        <span className="text-muted-foreground">
          {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>
    </div>
  );
}

export function LanguagesForm({ locale: _locale, initialData }: LanguagesFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [enabledLanguages, setEnabledLanguages] = useState<Locale[]>(
    (initialData.enabled as Locale[]) || ['en']
  );
  const [defaultLanguage, setDefaultLanguage] = useState<Locale>(
    (initialData.default as Locale) || 'en'
  );

  // Toggle language enabled state
  const toggleLanguage = useCallback((language: Locale) => {
    setEnabledLanguages((prev) => {
      const isCurrentlyEnabled = prev.includes(language);

      if (isCurrentlyEnabled) {
        // Can't disable if it's the only language or the default
        if (prev.length <= 1) return prev;
        if (language === defaultLanguage) return prev;

        setHasUnsavedChanges(true);
        return prev.filter((l) => l !== language);
      } else {
        setHasUnsavedChanges(true);
        return [...prev, language];
      }
    });
  }, [defaultLanguage]);

  // Set default language
  const setAsDefault = useCallback((language: Locale) => {
    // Can only set enabled languages as default
    if (!enabledLanguages.includes(language)) return;

    setDefaultLanguage(language);
    setHasUnsavedChanges(true);
  }, [enabledLanguages]);

  // Enable all languages
  const enableAll = useCallback(() => {
    setEnabledLanguages([...locales]);
    setHasUnsavedChanges(true);
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setEnabledLanguages(['en', 'lt', 'ru']);
    setDefaultLanguage('en');
    setHasUnsavedChanges(true);
  }, []);

  // Check if language can be disabled
  const canDisable = (language: Locale) => {
    return enabledLanguages.length > 1 && language !== defaultLanguage;
  };

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validate
    if (enabledLanguages.length === 0) {
      setError('At least one language must be enabled');
      return;
    }

    if (!enabledLanguages.includes(defaultLanguage)) {
      setError('Default language must be one of the enabled languages');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/settings/languages', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            languages: {
              enabled: enabledLanguages,
              default: defaultLanguage,
            },
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
      {/* Language Cards */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Available Languages
          </CardTitle>
          <CardDescription>
            Enable or disable languages for your website. The default language will be shown to visitors
            who haven&apos;t selected a preference.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {locales.map((language) => (
              <LanguageCard
                key={language}
                language={language}
                isEnabled={enabledLanguages.includes(language)}
                isDefault={defaultLanguage === language}
                onToggle={() => toggleLanguage(language)}
                onSetDefault={() => setAsDefault(language)}
                canDisable={canDisable(language)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Enabled languages</span>
              <span className="text-sm font-medium">
                {enabledLanguages.length} of {locales.length}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Default language</span>
              <span className="text-sm font-medium flex items-center gap-2">
                <span>{localeFlags[defaultLanguage]}</span>
                {localeNames[defaultLanguage]}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Enabled</span>
              <div className="flex items-center gap-1">
                {enabledLanguages.map((lang) => (
                  <span key={lang} className="text-lg" title={localeNames[lang]}>
                    {localeFlags[lang]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Globe className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
              Language Impact
            </p>
            <ul className="text-sm text-blue-600 dark:text-blue-500 mt-1 space-y-1">
              <li>• Disabled languages will not appear in the language switcher</li>
              <li>• Content in disabled languages will still be preserved</li>
              <li>• Visitors will be redirected to the default language if they access a disabled language URL</li>
            </ul>
          </div>
        </div>
      </div>

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
          Language settings saved successfully!
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={enableAll}
            disabled={isPending || enabledLanguages.length === locales.length}
          >
            Enable All
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            disabled={isPending}
          >
            Reset to Defaults
          </Button>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>
        <Button type="submit" disabled={isPending}>
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
