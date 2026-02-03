'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Bell,
  Check,
  AlertCircle,
  RotateCcw,
  Send,
  Clock,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert } from '@/components/ui/alert';
import type { TenantEmailSettings } from '@/lib/tenant/types';
import { DEFAULT_EMAIL_SETTINGS } from '@/lib/tenant/types';

interface EmailSettingsFormProps {
  locale: string;
  tenantName: string;
  initialData: TenantEmailSettings;
}

export function EmailSettingsForm({
  locale,
  tenantName,
  initialData,
}: EmailSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState<TenantEmailSettings>({
    fromName: initialData.fromName || '',
    replyToEmail: initialData.replyToEmail || '',
    sendBookingConfirmation: initialData.sendBookingConfirmation ?? true,
    sendBookingModification: initialData.sendBookingModification ?? true,
    sendBookingCancellation: initialData.sendBookingCancellation ?? true,
    sendBookingReminder: initialData.sendBookingReminder ?? true,
    reminderHoursBefore: initialData.reminderHoursBefore ?? 24,
  });

  // Track if form has changed
  const hasChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/settings/email', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: {
              ...formData,
              // Clean up empty strings
              fromName: formData.fromName?.trim() || undefined,
              replyToEmail: formData.replyToEmail?.trim() || undefined,
            },
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save settings');
        }

        setSuccess(true);
        router.refresh();

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    });
  };

  const handleReset = () => {
    setFormData({
      ...DEFAULT_EMAIL_SETTINGS,
      fromName: '',
      replyToEmail: '',
    });
  };

  const handleCheckboxChange = (
    field: keyof TenantEmailSettings,
    checked: boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: checked }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error/Success Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2">{error}</span>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400">
          <Check className="h-4 w-4" />
          <span className="ml-2">Email settings saved successfully</span>
        </Alert>
      )}

      {/* Sender Information */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium text-foreground">Sender Information</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Customize how your emails appear to customers
        </p>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fromName">From Name</Label>
            <Input
              id="fromName"
              type="text"
              placeholder={tenantName || 'Your Company Name'}
              value={formData.fromName || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fromName: e.target.value }))
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The name that appears in the &quot;From&quot; field. Leave empty to use your
              company name.
            </p>
          </div>

          <div>
            <Label htmlFor="replyToEmail">Reply-To Email</Label>
            <Input
              id="replyToEmail"
              type="email"
              placeholder="support@yourcompany.com"
              value={formData.replyToEmail || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, replyToEmail: e.target.value }))
              }
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              When customers reply to emails, responses will go to this address.
            </p>
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-medium text-foreground">
            Email Notifications
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Choose which emails to send to your customers
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Checkbox
              id="sendBookingConfirmation"
              checked={formData.sendBookingConfirmation}
              onCheckedChange={(checked) =>
                handleCheckboxChange('sendBookingConfirmation', checked === true)
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="sendBookingConfirmation"
                className="text-sm font-medium cursor-pointer"
              >
                Booking Confirmation
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send email when a booking is successfully created and paid
              </p>
            </div>
            <Send className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Checkbox
              id="sendBookingModification"
              checked={formData.sendBookingModification}
              onCheckedChange={(checked) =>
                handleCheckboxChange('sendBookingModification', checked === true)
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="sendBookingModification"
                className="text-sm font-medium cursor-pointer"
              >
                Booking Modification
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send email when a booking is modified (dates, location, add-ons)
              </p>
            </div>
            <Send className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Checkbox
              id="sendBookingCancellation"
              checked={formData.sendBookingCancellation}
              onCheckedChange={(checked) =>
                handleCheckboxChange('sendBookingCancellation', checked === true)
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="sendBookingCancellation"
                className="text-sm font-medium cursor-pointer"
              >
                Booking Cancellation
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send email when a booking is cancelled with refund details
              </p>
            </div>
            <Send className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
            <Checkbox
              id="sendBookingReminder"
              checked={formData.sendBookingReminder}
              onCheckedChange={(checked) =>
                handleCheckboxChange('sendBookingReminder', checked === true)
              }
              className="mt-0.5"
            />
            <div className="flex-1">
              <Label
                htmlFor="sendBookingReminder"
                className="text-sm font-medium cursor-pointer"
              >
                Pickup Reminder
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send reminder email before scheduled pickup time
              </p>
            </div>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </div>

          {/* Reminder timing - only shown when reminders are enabled */}
          {formData.sendBookingReminder && (
            <div className="ml-8 pl-4 border-l-2 border-border">
              <Label htmlFor="reminderHoursBefore">Reminder Timing</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="reminderHoursBefore"
                  type="number"
                  min={1}
                  max={168}
                  value={formData.reminderHoursBefore}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      reminderHoursBefore: parseInt(e.target.value) || 24,
                    }))
                  }
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">
                  hours before pickup
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Recommended: 24 hours. Maximum: 168 hours (7 days).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-start gap-3">
          <Mail className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-700 dark:text-blue-400">
              Email Delivery
            </p>
            <p className="text-blue-600 dark:text-blue-500 mt-1">
              All emails are sent from your configured email provider. Make sure your
              domain is verified for best delivery rates. The system email address is
              used as the &quot;From&quot; address, while your reply-to address receives responses.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border">
        <Button
          type="submit"
          disabled={isPending || !hasChanges}
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <span className="animate-spin mr-2">
                <RotateCcw className="w-4 h-4" />
              </span>
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={isPending}
          className="w-full sm:w-auto"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>

        {hasChanges && (
          <span className="text-sm text-amber-600 dark:text-amber-400">
            You have unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}
