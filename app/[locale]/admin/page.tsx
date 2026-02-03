'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Calendar,
  Car,
  DollarSign,
  TrendingUp,
  Clock,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';
import { TodaysActivityWidget, type ActivityBooking } from '@/components/admin/todays-activity-widget';
import { RecentBookingsWidget, type RecentBooking } from '@/components/admin/recent-bookings-widget';
import { FleetStatusWidget, type FleetStatusData } from '@/components/admin/fleet-status-widget';
import type { BookingStatus } from '@/lib/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardStats {
  todayBookings: number;
  activeRentals: number;
  availableVehicles: number;
  totalVehicles: number;
  pendingBookings: number;
  monthlyRevenue: number;
  currency: string;
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  href?: string;
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  href,
  isLoading,
}: StatCardProps) {
  const variantStyles = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-500/10 text-green-600 dark:text-green-400',
    warning: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
    destructive: 'bg-red-500/10 text-red-600 dark:text-red-400',
  };

  const content = (
    <Card className={cn('relative overflow-hidden', href && 'hover:shadow-md transition-shadow cursor-pointer')}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-2xl sm:text-3xl font-bold">{value}</p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 text-xs">
                <TrendingUp className={cn(
                  'w-3 h-3',
                  trend.value >= 0 ? 'text-green-500' : 'text-red-500 rotate-180'
                )} />
                <span className={trend.value >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {trend.value >= 0 ? '+' : ''}{trend.value}%
                </span>
                <span className="text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className={cn('p-2.5 rounded-lg', variantStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

// ============================================================================
// MAIN DASHBOARD PAGE
// ============================================================================

export default function AdminDashboardPage() {
  const t = useTranslations('admin');

  const [isLoading, setIsLoading] = useState(true);
  const [locale, setLocale] = useState('en');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayPickups, setTodayPickups] = useState<ActivityBooking[]>([]);
  const [todayReturns, setTodayReturns] = useState<ActivityBooking[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [fleetStatus, setFleetStatus] = useState<FleetStatusData | null>(null);

  useEffect(() => {
    // Extract locale from URL
    const pathLocale = window.location.pathname.split('/')[1];
    if (['en', 'lt', 'ru'].includes(pathLocale)) {
      setLocale(pathLocale);
    }

    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setIsLoading(true);
    const supabase = createClient();

    try {
      // Get current user's tenant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('auth_id', user.id)
        .single() as { data: { tenant_id: string } | null };

      if (!profile?.tenant_id) return;

      const tenantId = profile.tenant_id;
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch all data in parallel
      const [
        bookingsResult,
        vehiclesResult,
        todayPickupsResult,
        todayReturnsResult,
        recentBookingsResult,
        monthlyRevenueResult,
      ] = await Promise.all([
        // Bookings stats
        supabase
          .from('bookings')
          .select('status, pricing, pickup_at')
          .eq('tenant_id', tenantId),

        // Vehicles stats
        supabase
          .from('vehicles')
          .select('status')
          .eq('tenant_id', tenantId),

        // Today's pickups
        supabase
          .from('bookings')
          .select(`
            id, reference, status, pickup_at, return_at, pricing,
            vehicle:vehicles(make, model, photos),
            customer:users!bookings_customer_id_fkey(first_name, last_name, email),
            pickup_branch:branches!bookings_pickup_branch_id_fkey(name),
            return_branch:branches!bookings_return_branch_id_fkey(name)
          `)
          .eq('tenant_id', tenantId)
          .gte('pickup_at', startOfDay)
          .lte('pickup_at', endOfDay)
          .in('status', ['pending', 'confirmed'])
          .order('pickup_at', { ascending: true })
          .limit(5),

        // Today's returns
        supabase
          .from('bookings')
          .select(`
            id, reference, status, pickup_at, return_at, pricing,
            vehicle:vehicles(make, model, photos),
            customer:users!bookings_customer_id_fkey(first_name, last_name, email),
            pickup_branch:branches!bookings_pickup_branch_id_fkey(name),
            return_branch:branches!bookings_return_branch_id_fkey(name)
          `)
          .eq('tenant_id', tenantId)
          .gte('return_at', startOfDay)
          .lte('return_at', endOfDay)
          .eq('status', 'active')
          .order('return_at', { ascending: true })
          .limit(5),

        // Recent bookings
        supabase
          .from('bookings')
          .select(`
            id, reference, status, pickup_at, return_at, pricing,
            vehicle:vehicles(make, model, photos),
            customer:users!bookings_customer_id_fkey(first_name, last_name, email),
            pickup_branch:branches!bookings_pickup_branch_id_fkey(name),
            return_branch:branches!bookings_return_branch_id_fkey(name)
          `)
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(5),

        // Monthly revenue
        supabase
          .from('bookings')
          .select('pricing')
          .eq('tenant_id', tenantId)
          .eq('status', 'completed')
          .gte('created_at', startOfMonth),
      ]);

      // Calculate stats
      const bookings = (bookingsResult.data || []) as Array<{
        status: BookingStatus;
        pricing: { total: number; currency: string } | null;
        pickup_at: string;
      }>;
      const vehicles = (vehiclesResult.data || []) as Array<{
        status: string;
      }>;

      const todayBookingsCount = bookings.filter(b => {
        const pickupDate = new Date(b.pickup_at).toDateString();
        return pickupDate === new Date().toDateString();
      }).length;

      const activeRentals = bookings.filter(b => b.status === 'active').length;
      const pendingBookings = bookings.filter(b => b.status === 'pending').length;
      const availableVehicles = vehicles.filter(v => v.status === 'available').length;
      const totalVehicles = vehicles.filter(v => v.status !== 'retired').length;

      const monthlyRevenueData = (monthlyRevenueResult.data || []) as Array<{
        pricing: { total: number } | null;
      }>;
      const monthlyRevenue = monthlyRevenueData.reduce(
        (sum, b) => sum + (b.pricing?.total || 0), 0
      );

      setStats({
        todayBookings: todayBookingsCount,
        activeRentals,
        availableVehicles,
        totalVehicles,
        pendingBookings,
        monthlyRevenue,
        currency: 'EUR', // Default, could be fetched from tenant settings
      });

      // Fleet status
      const rented = vehicles.filter(v => v.status === 'rented').length;
      const maintenance = vehicles.filter(v => v.status === 'maintenance').length;
      const retired = vehicles.filter(v => v.status === 'retired').length;
      const operational = totalVehicles - retired;
      const utilizationRate = operational > 0 ? (rented / operational) * 100 : 0;

      setFleetStatus({
        total: vehicles.length,
        available: availableVehicles,
        rented,
        maintenance,
        retired,
        utilizationRate,
      });

      // Transform booking data
      const transformBooking = (booking: any): ActivityBooking => {
        const vehicle = booking.vehicle as any;
        const customer = booking.customer as any;
        const pickupBranch = booking.pickup_branch as any;
        const returnBranch = booking.return_branch as any;
        const pricing = booking.pricing as any;

        return {
          id: booking.id,
          reference: booking.reference,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
          vehiclePhoto: vehicle?.photos?.[0]?.url,
          customerName: customer ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() : undefined,
          customerEmail: customer?.email,
          pickupBranch: pickupBranch?.name || '',
          returnBranch: returnBranch?.name || '',
          pickupAt: booking.pickup_at,
          returnAt: booking.return_at,
          status: booking.status,
          total: pricing?.total || 0,
          currency: pricing?.currency || 'EUR',
        };
      };

      setTodayPickups((todayPickupsResult.data || []).map(transformBooking));
      setTodayReturns((todayReturnsResult.data || []).map(transformBooking));
      setRecentBookings((recentBookingsResult.data || []).map(transformBooking));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString(locale, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/${locale}/admin/bookings/new`}>
            <Button size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              {t('actions.createBooking')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('stats.todayBookings')}
          value={stats?.todayBookings ?? 0}
          icon={Calendar}
          variant="default"
          href={`/${locale}/admin/bookings`}
          isLoading={isLoading}
        />
        <StatCard
          title={t('stats.activeRentals')}
          value={stats?.activeRentals ?? 0}
          icon={Car}
          variant="success"
          href={`/${locale}/admin/bookings?status=active`}
          isLoading={isLoading}
        />
        <StatCard
          title={t('stats.pendingBookings')}
          value={stats?.pendingBookings ?? 0}
          icon={Clock}
          variant="warning"
          href={`/${locale}/admin/bookings?status=pending`}
          isLoading={isLoading}
        />
        <StatCard
          title={t('stats.availableVehicles')}
          value={stats ? `${stats.availableVehicles}/${stats.totalVehicles}` : '0/0'}
          icon={Car}
          href={`/${locale}/admin/fleet`}
          isLoading={isLoading}
        />
      </div>

      {/* Revenue Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard
          title={t('stats.monthlyRevenue')}
          value={stats ? formatCurrency(stats.monthlyRevenue, stats.currency) : '-'}
          subtitle={new Date().toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          icon={DollarSign}
          variant="success"
          isLoading={isLoading}
        />
        <div className="lg:col-span-2">
          <FleetStatusWidget
            status={fleetStatus}
            isLoading={isLoading}
            locale={locale}
          />
        </div>
      </div>

      {/* Today's Activity Widget */}
      <TodaysActivityWidget
        pickups={todayPickups}
        returns={todayReturns}
        isLoading={isLoading}
        locale={locale}
        maxItems={5}
      />

      {/* Recent Bookings Widget */}
      <RecentBookingsWidget
        bookings={recentBookings}
        isLoading={isLoading}
        locale={locale}
        maxItems={5}
      />
    </div>
  );
}
