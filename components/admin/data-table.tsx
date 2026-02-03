'use client';

import * as React from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Filter,
  X,
  Inbox,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

// ============================================================================
// TYPES
// ============================================================================

export type SortDirection = 'asc' | 'desc' | null;

export interface SortState {
  column: string | null;
  direction: SortDirection;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ColumnDef<TData> {
  /** Unique identifier for the column */
  id: string;
  /** Header text or render function */
  header: string | React.ReactNode | ((props: { sortState?: SortState }) => React.ReactNode);
  /** Cell render function */
  cell: (props: { row: TData; rowIndex: number }) => React.ReactNode;
  /** Enable sorting for this column */
  sortable?: boolean;
  /** Sort key (defaults to id) */
  sortKey?: string;
  /** Desktop column span (out of 12) */
  colSpan?: number;
  /** Hide on mobile */
  hideOnMobile?: boolean;
  /** Align content */
  align?: 'left' | 'center' | 'right';
  /** Custom className for header */
  headerClassName?: string;
  /** Custom className for cell */
  cellClassName?: string;
}

export interface DataTableProps<TData> {
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Data array */
  data: TData[];
  /** Get unique key for each row */
  getRowKey: (row: TData) => string;
  /** Loading state */
  isLoading?: boolean;
  /** Current sort state */
  sortState?: SortState;
  /** Sort change handler */
  onSortChange?: (sortState: SortState) => void;
  /** Pagination state */
  pagination?: PaginationState;
  /** Page change handler */
  onPageChange?: (page: number) => void;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Page size change handler */
  onPageSizeChange?: (pageSize: number) => void;
  /** Custom empty state */
  emptyState?: React.ReactNode;
  /** Empty state icon */
  emptyIcon?: React.ReactNode;
  /** Empty state title */
  emptyTitle?: string;
  /** Empty state description */
  emptyDescription?: string;
  /** Empty state action */
  emptyAction?: React.ReactNode;
  /** Mobile row render function (optional custom mobile layout) */
  mobileRowRender?: (props: { row: TData; rowIndex: number }) => React.ReactNode;
  /** Row click handler */
  onRowClick?: (row: TData) => void;
  /** Row className */
  rowClassName?: string | ((row: TData) => string);
  /** Table className */
  className?: string;
  /** Number of skeleton rows to show */
  skeletonRows?: number;
  /** Search input props */
  searchProps?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  /** Filter section (custom filter components) */
  filterSection?: React.ReactNode;
  /** Show filter toggle button */
  showFilterToggle?: boolean;
  /** Filter toggle state */
  filtersExpanded?: boolean;
  /** Filter toggle handler */
  onFiltersToggle?: () => void;
  /** Has active filters (shows clear button) */
  hasActiveFilters?: boolean;
  /** Clear filters handler */
  onClearFilters?: () => void;
}

// ============================================================================
// SORT HEADER COMPONENT
// ============================================================================

interface SortHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  sortState?: SortState;
  onSortChange?: (sortState: SortState) => void;
}

function SortHeader({ children, sortKey, sortState, onSortChange }: SortHeaderProps) {
  const isActive = sortState?.column === sortKey;
  const direction = isActive ? sortState?.direction : null;

  const handleClick = () => {
    if (!onSortChange) return;

    let newDirection: SortDirection;
    if (!isActive || direction === null) {
      newDirection = 'asc';
    } else if (direction === 'asc') {
      newDirection = 'desc';
    } else {
      newDirection = null;
    }

    onSortChange({
      column: newDirection ? sortKey : null,
      direction: newDirection,
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-left font-medium transition-colors',
        'hover:text-foreground',
        isActive ? 'text-foreground' : 'text-muted-foreground'
      )}
    >
      {children}
      {!isActive && <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />}
      {isActive && direction === 'asc' && <ArrowUp className="w-3.5 h-3.5" />}
      {isActive && direction === 'desc' && <ArrowDown className="w-3.5 h-3.5" />}
    </button>
  );
}

// ============================================================================
// PAGINATION COMPONENT
// ============================================================================

interface TablePaginationProps {
  pagination: PaginationState;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  itemLabel?: string;
}

function TablePagination({
  pagination,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  itemLabel = 'items',
}: TablePaginationProps) {
  const { page, pageSize, total, totalPages } = pagination;

  if (totalPages <= 1 && !pageSizeOptions) return null;

  const startItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-2">
      <div className="flex items-center gap-4">
        <p className="text-sm text-muted-foreground">
          {total > 0 ? (
            <>
              Showing {startItem}-{endItem} of {total} {itemLabel}
            </>
          ) : (
            `No ${itemLabel}`
          )}
        </p>

        {pageSizeOptions && onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 rounded-md border border-input bg-background text-sm"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            title="First page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="sr-only sm:not-sr-only sm:ml-1">Prev</span>
          </Button>

          {/* Page indicator */}
          <span className="text-sm text-muted-foreground px-3 min-w-[80px] text-center">
            {page} / {totalPages}
          </span>

          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
          >
            <span className="sr-only sm:not-sr-only sm:mr-1">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 hidden sm:flex"
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            title="Last page"
          >
            <ChevronsRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

interface TableSkeletonProps<TData> {
  columns: ColumnDef<TData>[];
  rows: number;
}

function TableSkeleton<TData>({ columns, rows }: TableSkeletonProps<TData>) {
  const desktopColumns = columns.filter((col) => !col.hideOnMobile || true);
  const totalColSpan = desktopColumns.reduce((acc, col) => acc + (col.colSpan || 1), 0);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      {/* Desktop header skeleton */}
      <div
        className="hidden lg:grid gap-4 px-6 py-3 bg-muted/50 border-b border-border"
        style={{
          gridTemplateColumns: desktopColumns
            .map((col) => `${col.colSpan || 1}fr`)
            .join(' '),
        }}
      >
        {desktopColumns.map((col) => (
          <div key={col.id}>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>

      {/* Rows skeleton */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 lg:px-6 py-4">
            {/* Mobile skeleton */}
            <div className="lg:hidden space-y-3">
              <div className="flex justify-between items-start">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-20" />
              </div>
            </div>

            {/* Desktop skeleton */}
            <div
              className="hidden lg:grid gap-4 items-center"
              style={{
                gridTemplateColumns: desktopColumns
                  .map((col) => `${col.colSpan || 1}fr`)
                  .join(' '),
              }}
            >
              {desktopColumns.map((col, colIndex) => (
                <div key={col.id}>
                  {colIndex === 0 ? (
                    <div className="flex gap-3 items-center">
                      <Skeleton className="w-16 h-12 rounded-lg shrink-0" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                  ) : colIndex === desktopColumns.length - 1 ? (
                    <div className="flex justify-end gap-1">
                      <Skeleton className="h-8 w-8 rounded" />
                      <Skeleton className="h-8 w-8 rounded" />
                    </div>
                  ) : (
                    <Skeleton className="h-4 w-20" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EMPTY STATE COMPONENT
// ============================================================================

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

function EmptyState({
  icon,
  title = 'No data found',
  description = 'No items match your current filters.',
  action,
  children,
}: EmptyStateProps) {
  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
        {icon || <Inbox className="w-6 h-6 text-muted-foreground" />}
      </div>
      <h3 className="text-lg font-medium text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        {description}
      </p>
      {action}
    </div>
  );
}

// ============================================================================
// SEARCH AND FILTER BAR COMPONENT
// ============================================================================

interface SearchFilterBarProps {
  searchProps?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  showFilterToggle?: boolean;
  filtersExpanded?: boolean;
  onFiltersToggle?: () => void;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  filterSection?: React.ReactNode;
}

function SearchFilterBar({
  searchProps,
  showFilterToggle,
  filtersExpanded,
  onFiltersToggle,
  hasActiveFilters,
  onClearFilters,
  filterSection,
}: SearchFilterBarProps) {
  const [localSearch, setLocalSearch] = React.useState(searchProps?.value || '');

  React.useEffect(() => {
    setLocalSearch(searchProps?.value || '');
  }, [searchProps?.value]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchProps?.onChange(localSearch);
  };

  if (!searchProps && !showFilterToggle && !filterSection) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Search & Filter Toggle */}
      <div className="flex gap-2">
        {searchProps && (
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchProps.placeholder || 'Search...'}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="pl-9"
            />
          </form>
        )}

        {showFilterToggle && (
          <Button
            variant={filtersExpanded ? 'secondary' : 'outline'}
            size="icon"
            onClick={onFiltersToggle}
            className="shrink-0"
            title="Toggle filters"
          >
            <Filter className="w-4 h-4" />
          </Button>
        )}

        {hasActiveFilters && onClearFilters && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            className="shrink-0"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filter Section */}
      {filterSection && filtersExpanded && (
        <div className="p-4 bg-muted/50 rounded-lg border border-border">
          {filterSection}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN DATA TABLE COMPONENT
// ============================================================================

export function DataTable<TData>({
  columns,
  data,
  getRowKey,
  isLoading = false,
  sortState,
  onSortChange,
  pagination,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
  emptyState,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  mobileRowRender,
  onRowClick,
  rowClassName,
  className,
  skeletonRows = 6,
  searchProps,
  filterSection,
  showFilterToggle,
  filtersExpanded,
  onFiltersToggle,
  hasActiveFilters,
  onClearFilters,
}: DataTableProps<TData>) {
  // Filter columns for desktop (all) and mobile (excluding hideOnMobile)
  const desktopColumns = columns;
  const mobileColumns = columns.filter((col) => !col.hideOnMobile);

  // Calculate grid template
  const gridTemplate = desktopColumns
    .map((col) => `${col.colSpan || 1}fr`)
    .join(' ');

  // Render header cell
  const renderHeaderCell = (column: ColumnDef<TData>) => {
    const content =
      typeof column.header === 'function'
        ? column.header({ sortState })
        : column.header;

    if (column.sortable && onSortChange) {
      return (
        <SortHeader
          sortKey={column.sortKey || column.id}
          sortState={sortState}
          onSortChange={onSortChange}
        >
          {content}
        </SortHeader>
      );
    }

    return content;
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <SearchFilterBar
          searchProps={searchProps}
          showFilterToggle={showFilterToggle}
          filtersExpanded={filtersExpanded}
          onFiltersToggle={onFiltersToggle}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          filterSection={filterSection}
        />
        <TableSkeleton columns={desktopColumns} rows={skeletonRows} />
      </>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <>
        <SearchFilterBar
          searchProps={searchProps}
          showFilterToggle={showFilterToggle}
          filtersExpanded={filtersExpanded}
          onFiltersToggle={onFiltersToggle}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={onClearFilters}
          filterSection={filterSection}
        />
        <div className="bg-card rounded-lg border border-border">
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={emptyAction}
          >
            {emptyState}
          </EmptyState>
        </div>
      </>
    );
  }

  return (
    <>
      <SearchFilterBar
        searchProps={searchProps}
        showFilterToggle={showFilterToggle}
        filtersExpanded={filtersExpanded}
        onFiltersToggle={onFiltersToggle}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={onClearFilters}
        filterSection={filterSection}
      />

      <div
        className={cn(
          'bg-card rounded-lg border border-border overflow-hidden',
          className
        )}
      >
        {/* Desktop Header */}
        <div
          className="hidden lg:grid gap-4 px-6 py-3 bg-muted/50 border-b border-border text-sm font-medium text-muted-foreground"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {desktopColumns.map((column) => (
            <div
              key={column.id}
              className={cn(
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-right',
                column.headerClassName
              )}
            >
              {renderHeaderCell(column)}
            </div>
          ))}
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border">
          {data.map((row, rowIndex) => {
            const rowKey = getRowKey(row);
            const rowClasses =
              typeof rowClassName === 'function'
                ? rowClassName(row)
                : rowClassName;

            return (
              <div
                key={rowKey}
                className={cn(
                  'px-4 lg:px-6 py-4',
                  'hover:bg-muted/30 transition-colors',
                  onRowClick && 'cursor-pointer',
                  rowClasses
                )}
                onClick={() => onRowClick?.(row)}
              >
                {/* Mobile Layout */}
                <div className="lg:hidden">
                  {mobileRowRender ? (
                    mobileRowRender({ row, rowIndex })
                  ) : (
                    <div className="space-y-2">
                      {mobileColumns.map((column) => (
                        <div key={column.id}>
                          {column.cell({ row, rowIndex })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Desktop Layout */}
                <div
                  className="hidden lg:grid gap-4 items-center"
                  style={{ gridTemplateColumns: gridTemplate }}
                >
                  {desktopColumns.map((column) => (
                    <div
                      key={column.id}
                      className={cn(
                        'min-w-0',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.cellClassName
                      )}
                    >
                      {column.cell({ row, rowIndex })}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <TablePagination
          pagination={pagination}
          onPageChange={onPageChange}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </>
  );
}

// ============================================================================
// HELPER COMPONENTS FOR COMMON PATTERNS
// ============================================================================

/** Status chip/badge column helper */
export interface StatusConfig {
  label: string;
  variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';
}

/** Text with truncation */
export function TruncatedText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn('truncate block', className)}>{children}</span>;
}

/** Action buttons wrapper (right-aligned) */
export function ActionCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-end gap-1', className)}>
      {children}
    </div>
  );
}

/** Primary cell with optional subtitle */
export function PrimaryCell({
  primary,
  secondary,
  image,
  imageAlt,
  imageFallback,
  className,
}: {
  primary: React.ReactNode;
  secondary?: React.ReactNode;
  image?: string | null;
  imageAlt?: string;
  imageFallback?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {(image !== undefined || imageFallback) && (
        <div className="relative w-12 h-10 lg:w-16 lg:h-12 rounded-lg overflow-hidden bg-muted shrink-0">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={imageAlt || ''}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {imageFallback}
            </div>
          )}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground truncate">{primary}</div>
        {secondary && (
          <div className="text-sm text-muted-foreground truncate">
            {secondary}
          </div>
        )}
      </div>
    </div>
  );
}

// Re-export for convenience
export { TablePagination, TableSkeleton, EmptyState, SearchFilterBar };
