'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Car, Mail, Phone, MapPin, Facebook, Instagram, Twitter, Linkedin } from 'lucide-react';

import { Link } from '@/i18n/routing';
import { useTenant } from '@/lib/tenant/use-tenant';
import { cn } from '@/lib/utils/cn';

interface FooterProps {
  /** Additional class names */
  className?: string;
}

/**
 * Site Footer Component
 *
 * Main footer for the public website.
 * Mobile-first responsive design.
 *
 * Features:
 * - Company info and logo
 * - Quick links navigation
 * - Contact information
 * - Social media links
 * - Copyright notice
 * - Responsive grid layout
 */
export function Footer({ className }: FooterProps) {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');
  const { tenant } = useTenant();

  const currentYear = new Date().getFullYear();

  // Quick links
  const quickLinks = [
    { href: '/', label: tNav('home') },
    { href: '/fleet', label: tNav('fleet') },
    { href: '/locations', label: tNav('locations') },
    { href: '/about', label: tNav('aboutUs') },
    { href: '/contact', label: tNav('contactUs') },
  ];

  // Support links
  const supportLinks = [
    { href: '/faq', label: tNav('faq') },
    { href: '/terms', label: t('termsOfService') },
    { href: '/privacy', label: t('privacyPolicy') },
  ];

  // Social links (placeholders - would be configurable per tenant)
  const socialLinks = [
    { icon: Facebook, href: '#', label: 'Facebook' },
    { icon: Instagram, href: '#', label: 'Instagram' },
    { icon: Twitter, href: '#', label: 'Twitter' },
    { icon: Linkedin, href: '#', label: 'LinkedIn' },
  ];

  // Get contact info from tenant settings or use defaults
  const contactInfo = tenant?.settings?.contact || {
    email: 'info@carrental.com',
    phone: '+370 600 00000',
    address: 'Vilnius, Lithuania',
  };

  return (
    <footer className={cn('border-t bg-muted/30', className)}>
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2 text-xl font-bold">
              {tenant?.logo_url ? (
                <Image
                  src={tenant.logo_url}
                  alt={tenant?.name || 'Car Rental'}
                  width={140}
                  height={40}
                  loading="lazy"
                  className="h-8 w-auto object-contain"
                />
              ) : (
                <>
                  <Car className="h-7 w-7 text-primary" />
                  <span>{tenant?.name || 'Car Rental'}</span>
                </>
              )}
            </Link>
            <p className="mb-4 text-sm text-muted-foreground">
              Premium car rental service with a wide selection of vehicles.
              Book your perfect rental car today.
            </p>

            {/* Social Links */}
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t('quickLinks')}
            </h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t('support')}
            </h3>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-foreground">
              {t('companyInfo')}
            </h3>
            <ul className="space-y-3">
              {contactInfo.address && (
                <li className="flex items-start gap-3 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{contactInfo.address}</span>
                </li>
              )}
              {contactInfo.phone && (
                <li>
                  <a
                    href={`tel:${contactInfo.phone.replace(/\s/g, '')}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{contactInfo.phone}</span>
                  </a>
                </li>
              )}
              {contactInfo.email && (
                <li>
                  <a
                    href={`mailto:${contactInfo.email}`}
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span>{contactInfo.email}</span>
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {currentYear} {tenant?.name || 'Car Rental'}. {t('copyright')}.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/terms" className="hover:text-foreground">
                {t('terms')}
              </Link>
              <Link href="/privacy" className="hover:text-foreground">
                {t('privacy')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
