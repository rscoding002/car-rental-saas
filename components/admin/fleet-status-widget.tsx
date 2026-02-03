'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Car,
  CheckCircle,
  XCircle,
  Wrench,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

export interface FleetStatusData {
  total: number;
  available: number;
  rented: number;
  maintenance: number;
  retired: number;
  utilizationRate: number;
}

export interface FleetCategoryStatus {
  id: string;
  name: string;
  total: number;
  available: number;
  rented: number;
}

export interface FleetStatusWidgetProps {
  status: FleetStatusData | null;
  categories?: FleetCategoryStatus[];
  isLoading?: boolean;
  locale: string;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showViewAll?: boolean;
  showCategories?: boolean;
}

// ============================================================================
// STATUS ITEM COMPONENT
// ============================================================================

interface StatusItemProps {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  variant?: 'default' | 'compact';
}

function StatusItem({ label, value, icon: Icon, color, bgColor, variant = 'default' }: StatusItemProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn('w-3.5 h-3.5', color)} />
        <span className="text-xs text-muted-foreground">{label}:</span>
        <span className="text-xs font-medium">{value}</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-lg', bgColor)}>
      <Icon className={cn('w-4 h-4', color)} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}

// ============================================================================
// UTILIZATION BAR COMPONENT
// ============================================================================

interface UtilizationBarProps {
  rate: number;
  variant?: 'default' | 'compact';
}

function UtilizationBar({ rate, variant = 'default' }: UtilizationBarProps) {
  const t = useTranslations('admin.widgets');

  // Color based on utilization rate
  const getBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 50) return 'bg-primary';
    if (rate >= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', getBarColor(rate))}
            style={{ width: `${Math.min(rate, 100)}%` }}
          />
        </div>
        <span className="text-xs font-medium shrink-0">{Math.round(rate)}%</span>
      </div>
    );
  }

  return (
    <div className="p-3 bg-muted/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{t('utilizationRate')}</span>
        <span className="text-lg font-bold">{Math.round(rate)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', getBarColor(rate))}
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// CATEGORY ROW COMPONENT
// ============================================================================

interface CategoryRowProps {
  category: FleetCategoryStatus;
  locale: string;
}

function CategoryRow({ category, locale }: CategoryRowProps) {
  const utilization = category.total > 0
    ? Math.round((category.rented / category.total) * 100)
    : 0;

  return (
    <Link
      href={`/${locale}/admin/fleet?category=${category.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.name}</p>
        <p className="text-xs text-muted-foreground">
          {category.available} / {category.total} available
        </p>
      </div>
      <div className="w-16 shrink-0">
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${utilization}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right mt-0.5">{utilization}%</p>
      </div>
    </Link>
  );
}

// ============================================================================
// LOADING STATE
// ============================================================================

interface LoadingStateProps {
  variant?: 'default' | 'compact' | 'detailed';
}

function LoadingState({ variant = 'default' }: LoadingStateProps) {
  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN WIDGET - DEFAULT VARIANT
// ============================================================================

function FleetStatusDefault({
  status,
  categories,
  locale,
  showViewAll,
  showCategories,
}: FleetStatusWidgetProps) {
  const t = useTranslations('admin');
  const tVehicle = useTranslations('vehicle');
  const tWidgets = useTranslations('admin.widgets');

  if (!status) return null;

  const statusItems = [
    {
      label: tVehicle('available'),
      value: status.available,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      label: tVehicle('rented'),
      value: status.rented,
      icon: Car,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: tVehicle('maintenance'),
      value: status.maintenance,
      icon: Wrench,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      label: tVehicle('retired'),
      value: status.retired,
      icon: XCircle,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    },
  ];

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Car className="w-4 h-4" />
            <span className="truncate">{tWidgets('fleetStatus')}</span>
          </CardTitle>
          {showViewAll && (
            <Link href={`/${locale}/admin/fleet`} className="hidden sm:block">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                {t('overview')}
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Utilization Rate */}
        <UtilizationBar rate={status.utilizationRate} />

        {/* Status Breakdown */}
        <div className="grid grid-cols-2 gap-2">
          {statusItems.map((item) => (
            <StatusItem
              key={item.label}
              label={item.label}
              value={item.value}
              icon={item.icon}
              color={item.color}
              bgColor={item.bgColor}
            />
          ))}
        </div>

        {/* Categories Breakdown */}
        {showCategories && categories && categories.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('categories')}</p>
            <div className="space-y-1">
              {categories.slice(0, 4).map((cat) => (
                <CategoryRow key={cat.id} category={cat} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* Mobile view all button */}
        {showViewAll && (
          <Link href={`/${locale}/admin/fleet`} className="sm:hidden block">
            <Button variant="outline" size="sm" className="w-full text-xs">
              {t('overview')}
              <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </CardContent>
    </>
  );
}

// ============================================================================
// MAIN WIDGET - COMPACT VARIANT
// ============================================================================

function FleetStatusCompact({
  status,
  locale,
}: FleetStatusWidgetProps) {
  const tVehicle = useTranslations('vehicle');
  const tWidgets = useTranslations('admin.widgets');

  if (!status) return null;

  return (
    <>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Car className="w-4 h-4" />
          {tWidgets('fleetStatus')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Utilization Bar */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">{tWidgets('utilizationRate')}</p>
          <UtilizationBar rate={status.utilizationRate} variant="compact" />
        </div>

        {/* Status Summary */}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <StatusItem
            label={tVehicle('available')}
            value={status.available}
            icon={CheckCircle}
            color="text-green-500"
            bgColor=""
            variant="compact"
          />
          <StatusItem
            label={tVehicle('rented')}
            value={status.rented}
            icon={Car}
            color="text-blue-500"
            bgColor=""
            variant="compact"
          />
          {status.maintenance > 0 && (
            <StatusItem
              label={tVehicle('maintenance')}
              value={status.maintenance}
              icon={Wrench}
              color="text-yellow-500"
              bgColor=""
              variant="compact"
            />
          )}
        </div>
      </CardContent>
    </>
  );
}

// ============================================================================
// MAIN WIDGET - DETAILED VARIANT
// ============================================================================

function FleetStatusDetailed({
  status,
  categories,
  locale,
  showViewAll,
}: FleetStatusWidgetProps) {
  const t = useTranslations('admin');
  const tVehicle = useTranslations('vehicle');
  const tWidgets = useTranslations('admin.widgets');

  if (!status) return null;

  const operational = status.total - status.retired;
  const availabilityRate = operational > 0
    ? Math.round((status.available / operational) * 100)
    : 0;

  return (
    <>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="truncate">{tWidgets('fleetStatus')}</span>
          </CardTitle>
          {showViewAll && (
            <Link href={`/${locale}/admin/fleet`}>
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
                {t('overview')}
                <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <p className="text-2xl font-bold">{status.total}</p>
            <p className="text-xs text-muted-foreground">Total Fleet</p>
          </div>
          <div className="text-center p-3 bg-green-500/10 rounded-lg">
            <p className="text-2xl font-bold text-green-600">{status.available}</p>
            <p className="text-xs text-muted-foreground">{tVehicle('available')}</p>
          </div>
          <div className="text-center p-3 bg-blue-500/10 rounded-lg">
            <p className="text-2xl font-bold text-blue-600">{status.rented}</p>
            <p className="text-xs text-muted-foreground">{tVehicle('rented')}</p>
          </div>
          <div className="text-center p-3 bg-yellow-500/10 rounded-lg">
            <p className="text-2xl font-bold text-yellow-600">{status.maintenance}</p>
            <p className="text-xs text-muted-foreground">{tVehicle('maintenance')}</p>
          </div>
        </div>

        {/* Utilization and Availability Bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{tWidgets('utilizationRate')}</span>
              <span className="text-sm font-bold">{Math.round(status.utilizationRate)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${status.utilizationRate}%` }}
              />
            </div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Availability Rate</span>
              <span className="text-sm font-bold">{availabilityRate}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${availabilityRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories && categories.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('categories')}</p>
            <div className="space-y-1">
              {categories.map((cat) => (
                <CategoryRow key={cat.id} category={cat} locale={locale} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </>
  );
}

// ============================================================================
// MAIN WIDGET COMPONENT
// ============================================================================

export function FleetStatusWidget({
  status,
  categories,
  isLoading = false,
  locale,
  className,
  variant = 'default',
  showViewAll = true,
  showCategories = false,
}: FleetStatusWidgetProps) {
  const tWidgets = useTranslations('admin.widgets');

  return (
    <Card className={className}>
      {isLoading ? (
        <>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Car className="w-4 h-4" />
              {tWidgets('fleetStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <LoadingState variant={variant} />
          </CardContent>
        </>
      ) : variant === 'compact' ? (
        <FleetStatusCompact
          status={status}
          locale={locale}
          isLoading={isLoading}
        />
      ) : variant === 'detailed' ? (
        <FleetStatusDetailed
          status={status}
          categories={categories}
          locale={locale}
          showViewAll={showViewAll}
          isLoading={isLoading}
        />
      ) : (
        <FleetStatusDefault
          status={status}
          categories={categories}
          locale={locale}
          showViewAll={showViewAll}
          showCategories={showCategories}
          isLoading={isLoading}
        />
      )}
    </Card>
  );
}

export default FleetStatusWidget;
