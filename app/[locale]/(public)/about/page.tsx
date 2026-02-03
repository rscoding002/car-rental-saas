import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { Metadata } from 'next';
import Image from 'next/image';
import { Users, Award, MapPin, Clock, Shield, Heart, Target, Eye } from 'lucide-react';

import { createServerClient } from '@/lib/supabase/server';
import { BlockListRenderer } from '@/components/page-builder/block-renderer';
import { Skeleton } from '@/components/ui/skeleton';
import { generatePageMetadata } from '@/lib/seo/metadata';
import type { Locale } from '@/lib/utils/constants';
import type { PageBlock } from '@/lib/supabase/types';

interface AboutPageProps {
  params: Promise<{ locale: string }>;
}

// Generate metadata
export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });

  return generatePageMetadata({
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    locale: locale as Locale,
    pathname: '/about',
    keywords: ['about us', 'car rental company', 'our mission', 'our team'],
  });
}

// Fetch about page data
async function getAboutPageData() {
  const supabase = await createServerClient();

  let blocks: PageBlock[] = [];

  try {
    // Get about page by slug
    const { data: page } = await supabase
      .from('pages')
      .select('id, status')
      .eq('slug', 'about')
      .eq('status', 'published')
      .maybeSingle();

    if (page) {
      // Get blocks for about page
      const { data: pageBlocks } = await supabase
        .from('page_blocks')
        .select('*')
        .eq('page_id', page.id)
        .order('sort_order', { ascending: true });

      blocks = pageBlocks || [];
    }
  } catch (error) {
    console.error('Failed to fetch about page data:', error);
  }

  return { blocks };
}

/**
 * About Page
 *
 * Displays company information, mission, team, etc.
 * CMS-driven with fallback content.
 * Mobile-first responsive design.
 */
export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { blocks } = await getAboutPageData();
  const hasCmsBlocks = blocks.length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* CMS Blocks */}
      {hasCmsBlocks ? (
        <Suspense fallback={<AboutSkeleton />}>
          <BlockListRenderer blocks={blocks} locale={locale} />
        </Suspense>
      ) : (
        /* Fallback Content */
        <>
          <HeroSection locale={locale} />
          <StatsSection locale={locale} />
          <MissionSection locale={locale} />
          <ValuesSection locale={locale} />
          <TeamSection locale={locale} />
          <CtaSection locale={locale} />
        </>
      )}
    </div>
  );
}

// Hero Section
async function HeroSection({ locale }: { locale: string }) {
  const t = await getTranslations('about');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground sm:text-xl">
            Your trusted partner for premium car rentals since 2014. We believe in making
            every journey memorable with quality vehicles and exceptional service.
          </p>
        </div>
      </div>

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-1/4 top-0 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
      </div>
    </section>
  );
}

// Stats Section
async function StatsSection({ locale }: { locale: string }) {
  const t = await getTranslations('about');

  const stats = [
    { value: '10+', label: t('yearsExperience'), icon: Clock },
    { value: '5,000+', label: t('satisfiedCustomers'), icon: Users },
    { value: '100+', label: t('vehiclesInFleet'), icon: Award },
    { value: '5', label: t('locationsCount'), icon: MapPin },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="text-3xl font-bold text-primary">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Mission & Vision Section
async function MissionSection({ locale }: { locale: string }) {
  const t = await getTranslations('about');

  return (
    <section className="border-y bg-muted/30 py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Mission */}
          <div className="rounded-xl bg-card p-6 sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Target className="h-6 w-6" />
            </div>
            <h2 className="mb-4 text-2xl font-bold">{t('ourMission')}</h2>
            <p className="text-muted-foreground">
              To provide exceptional car rental experiences that exceed expectations.
              We are committed to offering a diverse fleet of well-maintained vehicles,
              transparent pricing, and outstanding customer service that makes every
              rental journey smooth and enjoyable.
            </p>
          </div>

          {/* Vision */}
          <div className="rounded-xl bg-card p-6 sm:p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Eye className="h-6 w-6" />
            </div>
            <h2 className="mb-4 text-2xl font-bold">{t('ourVision')}</h2>
            <p className="text-muted-foreground">
              To become the most trusted and customer-centric car rental company
              in the region. We envision a future where mobility is accessible,
              sustainable, and tailored to individual needs, powered by innovation
              and a genuine commitment to our customers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Values Section
async function ValuesSection({ locale }: { locale: string }) {
  const t = await getTranslations('about');

  const values = [
    {
      icon: Shield,
      title: 'Trust & Reliability',
      description: 'We build lasting relationships through honest communication and dependable service.',
    },
    {
      icon: Heart,
      title: 'Customer First',
      description: 'Every decision we make is guided by what\'s best for our customers.',
    },
    {
      icon: Award,
      title: 'Quality Excellence',
      description: 'We maintain the highest standards in our fleet and service delivery.',
    },
    {
      icon: Users,
      title: 'Community',
      description: 'We\'re committed to giving back and supporting the communities we serve.',
    },
  ];

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{t('ourValues')}</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            The principles that guide everything we do
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => (
            <div
              key={value.title}
              className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <value.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 font-semibold">{value.title}</h3>
              <p className="text-sm text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Team Section
async function TeamSection({ locale }: { locale: string }) {
  const t = await getTranslations('about');

  const team = [
    {
      name: 'Jonas Kazlauskas',
      role: 'CEO & Founder',
      image: '/images/team/placeholder-1.jpg',
    },
    {
      name: 'Ona Petrauskienė',
      role: 'Operations Manager',
      image: '/images/team/placeholder-2.jpg',
    },
    {
      name: 'Tomas Jonaitis',
      role: 'Fleet Manager',
      image: '/images/team/placeholder-3.jpg',
    },
    {
      name: 'Laura Rimkutė',
      role: 'Customer Relations',
      image: '/images/team/placeholder-4.jpg',
    },
  ];

  return (
    <section className="border-t bg-muted/30 py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center sm:mb-12">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">{t('ourTeam')}</h2>
          <p className="mx-auto max-w-2xl text-muted-foreground">
            Meet the dedicated professionals behind our success
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {team.map((member) => (
            <div
              key={member.name}
              className="group rounded-xl bg-card p-6 text-center transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-4 h-24 w-24 overflow-hidden rounded-full bg-muted">
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                  {member.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
async function CtaSection({ locale }: { locale: string }) {
  const t = await getTranslations('home');

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl rounded-2xl bg-primary p-8 text-center text-primary-foreground sm:p-12">
          <h2 className="mb-4 text-2xl font-bold sm:text-3xl">
            Ready to experience the difference?
          </h2>
          <p className="mb-8 text-primary-foreground/90">
            Join thousands of satisfied customers and discover why we're the preferred
            choice for car rentals.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="/fleet"
              className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 font-medium text-primary hover:bg-white/90 transition-colors"
            >
              {t('browseFleet')}
            </a>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg border border-primary-foreground/20 px-6 py-3 font-medium text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// Loading skeleton
function AboutSkeleton() {
  return (
    <div className="space-y-12 py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <Skeleton className="mx-auto h-12 w-64 mb-6" />
          <Skeleton className="mx-auto h-6 w-full mb-2" />
          <Skeleton className="mx-auto h-6 w-3/4" />
        </div>
      </div>
      <div className="container mx-auto px-4">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
