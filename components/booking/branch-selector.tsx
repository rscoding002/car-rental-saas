'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Clock, Check, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Branch } from '@/lib/supabase/types';
import { isBranchOpen, getTodayHours, formatOperatingHours } from '@/lib/branches/types';

interface BranchSelectorProps {
  /** Available branches to select from */
  branches: Branch[];
  /** Currently selected branch ID */
  value?: string;
  /** Callback when selection changes */
  onChange: (branchId: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Label for the selector */
  label?: string;
  /** Error message */
  error?: string;
  /** Hint text */
  hint?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Whether the selector is required */
  required?: boolean;
  /** Additional class names */
  className?: string;
  /** Show open/closed status */
  showStatus?: boolean;
  /** Filter to only active branches */
  activeOnly?: boolean;
  /** Group branches by city */
  groupByCity?: boolean;
}

/**
 * Branch Selector Component
 *
 * A dropdown selector for choosing pickup/return locations.
 * Features:
 * - Groups branches by city
 * - Shows open/closed status with today's hours
 * - Search/filter functionality
 * - Mobile-friendly touch targets
 * - Keyboard navigation
 */
export function BranchSelector({
  branches,
  value,
  onChange,
  placeholder = 'Select location',
  label,
  error,
  hint,
  disabled = false,
  required = false,
  className,
  showStatus = true,
  activeOnly = true,
  groupByCity = true,
}: BranchSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter branches
  const filteredBranches = useMemo(() => {
    let result = branches;

    // Filter active only
    if (activeOnly) {
      result = result.filter((b) => b.status === 'active');
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(searchLower) ||
          b.city.toLowerCase().includes(searchLower) ||
          b.address.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [branches, activeOnly, search]);

  // Group branches by city
  const groupedBranches = useMemo(() => {
    if (!groupByCity) {
      return { '': filteredBranches };
    }

    return filteredBranches.reduce(
      (acc, branch) => {
        const city = branch.city;
        if (!acc[city]) {
          acc[city] = [];
        }
        acc[city].push(branch);
        return acc;
      },
      {} as Record<string, Branch[]>
    );
  }, [filteredBranches, groupByCity]);

  // Get selected branch
  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === value);
  }, [branches, value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Handle selection
  const handleSelect = (branchId: string) => {
    onChange(branchId);
    setIsOpen(false);
    setSearch('');
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
    if (event.key === 'Enter' && !isOpen) {
      setIsOpen(true);
    }
  };

  // Get branch status info
  const getBranchStatusInfo = (branch: Branch) => {
    if (!branch.operating_hours) return null;

    const isOpen = isBranchOpen(branch.operating_hours);
    const todayHours = getTodayHours(branch.operating_hours);
    const hoursText = formatOperatingHours(todayHours);

    return { isOpen, hoursText };
  };

  const cities = Object.keys(groupedBranches).sort();

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex h-12 w-full items-center justify-between rounded-lg border bg-background px-3 text-left text-sm transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-destructive' : 'border-input',
          isOpen && 'ring-2 ring-ring ring-offset-2'
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <MapPin className="h-5 w-5 shrink-0 text-muted-foreground" />
          {selectedBranch ? (
            <div className="truncate">
              <span className="font-medium">{selectedBranch.name}</span>
              <span className="text-muted-foreground"> - {selectedBranch.city}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-5 w-5 shrink-0 text-muted-foreground transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg',
            'max-h-[min(400px,60vh)] overflow-hidden'
          )}
          role="listbox"
        >
          {/* Search Input */}
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search locations..."
                className={cn(
                  'h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Branch List */}
          <div className="max-h-[min(300px,50vh)] overflow-y-auto p-1">
            {filteredBranches.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No locations found
              </div>
            ) : (
              cities.map((city) => (
                <div key={city || 'all'}>
                  {/* City Header */}
                  {groupByCity && city && (
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {city}
                    </div>
                  )}

                  {/* Branches in City */}
                  {groupedBranches[city].map((branch) => {
                    const statusInfo = showStatus ? getBranchStatusInfo(branch) : null;
                    const isSelected = branch.id === value;

                    return (
                      <button
                        key={branch.id}
                        type="button"
                        onClick={() => handleSelect(branch.id)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-md px-3 py-3 text-left transition-colors',
                          'hover:bg-accent focus:bg-accent focus:outline-none',
                          isSelected && 'bg-accent'
                        )}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{branch.name}</span>
                            {isSelected && (
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">
                            {branch.address}
                          </div>
                          {statusInfo && (
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <Clock className="h-3 w-3" />
                              <span
                                className={cn(
                                  statusInfo.isOpen ? 'text-green-600' : 'text-muted-foreground'
                                )}
                              >
                                {statusInfo.isOpen ? 'Open' : 'Closed'}
                              </span>
                              <span className="text-muted-foreground">
                                · Today: {statusInfo.hoursText}
                              </span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}

      {/* Hint */}
      {hint && !error && (
        <p className="mt-1.5 text-sm text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

/**
 * Lightweight branch option for use in simple selects
 */
export interface BranchOption {
  id: string;
  name: string;
  city: string;
}

/**
 * Simple branch select using native select element
 * For simpler use cases or better mobile experience
 */
export function SimpleBranchSelect({
  branches,
  value,
  onChange,
  placeholder = 'Select location',
  label,
  error,
  disabled = false,
  required = false,
  className,
}: {
  branches: BranchOption[];
  value?: string;
  onChange: (branchId: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}) {
  // Group by city
  const groupedBranches = useMemo(() => {
    return branches.reduce(
      (acc, branch) => {
        if (!acc[branch.city]) {
          acc[branch.city] = [];
        }
        acc[branch.city].push(branch);
        return acc;
      },
      {} as Record<string, BranchOption[]>
    );
  }, [branches]);

  const cities = Object.keys(groupedBranches).sort();

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          required={required}
          className={cn(
            'h-12 w-full appearance-none rounded-lg border bg-background pl-10 pr-10 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-destructive' : 'border-input',
            !value && 'text-muted-foreground'
          )}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {cities.map((city) => (
            <optgroup key={city} label={city}>
              {groupedBranches[city].map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
      </div>
      {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
    </div>
  );
}
