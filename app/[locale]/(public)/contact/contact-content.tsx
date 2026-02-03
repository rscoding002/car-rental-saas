'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { cn } from '@/lib/utils/cn';
import type { Branch, OperatingHours } from '@/lib/supabase/types';

interface ContactPageContentProps {
  branches: Branch[];
  locale: string;
}

/**
 * Contact Page Content (Client Component)
 *
 * Handles contact form submission and displays branch information.
 */
export function ContactPageContent({
  branches,
  locale,
}: ContactPageContentProps) {
  const t = useTranslations('contact');
  const tBranches = useTranslations('branches');
  const tCommon = useTranslations('common');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle form input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate form submission (replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      setIsSubmitted(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format operating hours for display
  const formatHours = (hours: OperatingHours | undefined) => {
    if (!hours) return null;

    const days = [
      { key: 'monday', label: tBranches('monday') },
      { key: 'tuesday', label: tBranches('tuesday') },
      { key: 'wednesday', label: tBranches('wednesday') },
      { key: 'thursday', label: tBranches('thursday') },
      { key: 'friday', label: tBranches('friday') },
      { key: 'saturday', label: tBranches('saturday') },
      { key: 'sunday', label: tBranches('sunday') },
    ];

    return days.map((day) => {
      const dayHours = hours[day.key as keyof OperatingHours];
      return {
        day: day.label,
        hours: dayHours ? `${dayHours.open} - ${dayHours.close}` : tBranches('closed'),
        isClosed: !dayHours,
      };
    });
  };

  // Get main branch (first one)
  const mainBranch = branches[0];

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Contact Form */}
        <div>
          <h2 className="mb-6 text-xl font-semibold sm:text-2xl">
            {t('sendMessage')}
          </h2>

          {isSubmitted ? (
            <div className="rounded-xl border bg-card p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">{t('messageSent')}</h3>
              <p className="text-muted-foreground">{t('messageSuccess')}</p>
              <Button
                className="mt-6"
                variant="outline"
                onClick={() => setIsSubmitted(false)}
              >
                Send Another Message
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  {error}
                </Alert>
              )}

              <div>
                <Label htmlFor="name">{t('yourName')}</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="email">{t('yourEmail')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="subject">{t('subject')}</Label>
                <Input
                  id="subject"
                  name="subject"
                  type="text"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="How can we help?"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="message">{t('yourMessage')}</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder={t('writeMessage')}
                  className="mt-1"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                isLoading={isSubmitting}
                className="w-full sm:w-auto"
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? t('sending') : t('sendMessage')}
              </Button>
            </form>
          )}
        </div>

        {/* Contact Info & Map */}
        <div className="space-y-6">
          {/* Map Placeholder */}
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
            {mainBranch?.latitude && mainBranch?.longitude ? (
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${mainBranch.longitude - 0.01},${mainBranch.latitude - 0.01},${mainBranch.longitude + 0.01},${mainBranch.latitude + 0.01}&layer=mapnik&marker=${mainBranch.latitude},${mainBranch.longitude}`}
                className="h-full w-full border-0"
                title="Location Map"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Map loading...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Contact Cards */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Phone */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{t('callUs')}</h3>
                  <a
                    href={`tel:${mainBranch?.phone || '+370 600 00000'}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {mainBranch?.phone || '+370 600 00000'}
                  </a>
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{t('emailUs')}</h3>
                  <a
                    href={`mailto:${mainBranch?.email || 'info@carrental.lt'}`}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    {mainBranch?.email || 'info@carrental.lt'}
                  </a>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{t('visitUs')}</h3>
                  <p className="text-sm text-muted-foreground">
                    {mainBranch?.address || '123 Main Street'}<br />
                    {mainBranch?.city || 'Vilnius'}, {mainBranch?.country || 'Lithuania'}
                  </p>
                </div>
              </div>
            </div>

            {/* Hours */}
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium">{t('businessHours')}</h3>
                  <p className="text-sm text-muted-foreground">
                    Mon - Fri: 8:00 - 18:00<br />
                    Sat: 9:00 - 15:00
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Branch List */}
          {branches.length > 1 && (
            <div>
              <h3 className="mb-4 font-semibold">{tBranches('ourLocations')}</h3>
              <div className="space-y-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3"
                  >
                    <div>
                      <h4 className="font-medium">{branch.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {branch.address}, {branch.city}
                      </p>
                    </div>
                    {branch.latitude && branch.longitude && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {tBranches('getDirections')}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
