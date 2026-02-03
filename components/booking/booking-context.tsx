'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';

import type {
  BookingFormData,
  BookingStep1Data,
  BookingStep2Data,
  BookingStep3Data,
  BookingStep4Data,
} from '@/lib/booking/types';
import type { PricingBreakdown } from '@/lib/pricing/types';
import type { Vehicle, VehicleCategory, Branch, Addon } from '@/lib/supabase/types';

// ============================================================================
// TYPES
// ============================================================================

export type BookingStep = 1 | 2 | 3 | 4;

export interface VehicleInfo {
  id: string;
  make: string;
  model: string;
  year: number;
  transmission: 'manual' | 'automatic';
  fuelType: string;
  seats: number;
  doors: number;
  photoUrl?: string;
  category?: {
    id: string;
    name: Record<string, string>;
  };
}

export interface BranchInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string | null;
}

export interface BookingState {
  // Current step
  currentStep: BookingStep;

  // Form data for each step
  step1Data: BookingStep1Data | null;
  step2Data: BookingStep2Data | null;
  step3Data: BookingStep3Data | null;
  step4Data: BookingStep4Data | null;

  // Computed/derived data
  vehicle: VehicleInfo | null;
  pickupBranch: BranchInfo | null;
  returnBranch: BranchInfo | null;
  pricing: PricingBreakdown | null;
  rentalDays: number;
  isOneWay: boolean;

  // Available data for forms
  availableAddons: Addon[];

  // UI state
  isLoading: boolean;
  error: string | null;

  // Step completion status
  completedSteps: Set<BookingStep>;
}

type BookingAction =
  | { type: 'SET_STEP'; step: BookingStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_STEP1_DATA'; data: BookingStep1Data }
  | { type: 'SET_STEP2_DATA'; data: BookingStep2Data }
  | { type: 'SET_STEP3_DATA'; data: BookingStep3Data }
  | { type: 'SET_STEP4_DATA'; data: BookingStep4Data }
  | { type: 'SET_VEHICLE'; vehicle: VehicleInfo }
  | { type: 'SET_BRANCHES'; pickup: BranchInfo; return: BranchInfo }
  | { type: 'SET_PRICING'; pricing: PricingBreakdown }
  | { type: 'SET_RENTAL_DAYS'; days: number }
  | { type: 'SET_ADDONS'; addons: Addon[] }
  | { type: 'SET_LOADING'; isLoading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'MARK_STEP_COMPLETE'; step: BookingStep }
  | { type: 'RESET' }
  | { type: 'INITIALIZE'; payload: Partial<BookingState> };

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: BookingState = {
  currentStep: 1,
  step1Data: null,
  step2Data: null,
  step3Data: null,
  step4Data: null,
  vehicle: null,
  pickupBranch: null,
  returnBranch: null,
  pricing: null,
  rentalDays: 0,
  isOneWay: false,
  availableAddons: [],
  isLoading: false,
  error: null,
  completedSteps: new Set(),
};

// ============================================================================
// REDUCER
// ============================================================================

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'NEXT_STEP':
      if (state.currentStep < 4) {
        return { ...state, currentStep: (state.currentStep + 1) as BookingStep };
      }
      return state;

    case 'PREV_STEP':
      if (state.currentStep > 1) {
        return { ...state, currentStep: (state.currentStep - 1) as BookingStep };
      }
      return state;

    case 'SET_STEP1_DATA':
      return {
        ...state,
        step1Data: action.data,
        isOneWay: action.data.pickupBranchId !== action.data.returnBranchId,
      };

    case 'SET_STEP2_DATA':
      return { ...state, step2Data: action.data };

    case 'SET_STEP3_DATA':
      return { ...state, step3Data: action.data };

    case 'SET_STEP4_DATA':
      return { ...state, step4Data: action.data };

    case 'SET_VEHICLE':
      return { ...state, vehicle: action.vehicle };

    case 'SET_BRANCHES':
      return {
        ...state,
        pickupBranch: action.pickup,
        returnBranch: action.return,
        isOneWay: action.pickup.id !== action.return.id,
      };

    case 'SET_PRICING':
      return { ...state, pricing: action.pricing };

    case 'SET_RENTAL_DAYS':
      return { ...state, rentalDays: action.days };

    case 'SET_ADDONS':
      return { ...state, availableAddons: action.addons };

    case 'SET_LOADING':
      return { ...state, isLoading: action.isLoading };

    case 'SET_ERROR':
      return { ...state, error: action.error };

    case 'MARK_STEP_COMPLETE': {
      const newCompletedSteps = new Set(state.completedSteps);
      newCompletedSteps.add(action.step);
      return { ...state, completedSteps: newCompletedSteps };
    }

    case 'RESET':
      return initialState;

    case 'INITIALIZE':
      return { ...state, ...action.payload };

    default:
      return state;
  }
}

// ============================================================================
// CONTEXT
// ============================================================================

interface BookingContextValue {
  state: BookingState;

  // Navigation
  goToStep: (step: BookingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoToStep: (step: BookingStep) => boolean;

  // Data setters
  setStep1Data: (data: BookingStep1Data) => void;
  setStep2Data: (data: BookingStep2Data) => void;
  setStep3Data: (data: BookingStep3Data) => void;
  setStep4Data: (data: BookingStep4Data) => void;
  setVehicle: (vehicle: VehicleInfo) => void;
  setBranches: (pickup: BranchInfo, returnBranch: BranchInfo) => void;
  setPricing: (pricing: PricingBreakdown) => void;
  setRentalDays: (days: number) => void;
  setAddons: (addons: Addon[]) => void;

  // UI state
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Step management
  markStepComplete: (step: BookingStep) => void;
  isStepComplete: (step: BookingStep) => boolean;

  // Get complete form data
  getFormData: () => Partial<BookingFormData>;

  // Reset
  reset: () => void;
  initialize: (data: Partial<BookingState>) => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface BookingProviderProps {
  children: ReactNode;
  initialData?: Partial<BookingState>;
}

export function BookingProvider({ children, initialData }: BookingProviderProps) {
  const [state, dispatch] = useReducer(
    bookingReducer,
    initialData ? { ...initialState, ...initialData } : initialState
  );

  // Navigation
  const goToStep = useCallback((step: BookingStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: 'PREV_STEP' });
  }, []);

  const canGoToStep = useCallback((step: BookingStep): boolean => {
    // Can always go to step 1
    if (step === 1) return true;

    // For other steps, all previous steps must be complete
    for (let i = 1; i < step; i++) {
      if (!state.completedSteps.has(i as BookingStep)) {
        return false;
      }
    }
    return true;
  }, [state.completedSteps]);

  // Data setters
  const setStep1Data = useCallback((data: BookingStep1Data) => {
    dispatch({ type: 'SET_STEP1_DATA', data });
  }, []);

  const setStep2Data = useCallback((data: BookingStep2Data) => {
    dispatch({ type: 'SET_STEP2_DATA', data });
  }, []);

  const setStep3Data = useCallback((data: BookingStep3Data) => {
    dispatch({ type: 'SET_STEP3_DATA', data });
  }, []);

  const setStep4Data = useCallback((data: BookingStep4Data) => {
    dispatch({ type: 'SET_STEP4_DATA', data });
  }, []);

  const setVehicle = useCallback((vehicle: VehicleInfo) => {
    dispatch({ type: 'SET_VEHICLE', vehicle });
  }, []);

  const setBranches = useCallback((pickup: BranchInfo, returnBranch: BranchInfo) => {
    dispatch({ type: 'SET_BRANCHES', pickup, return: returnBranch });
  }, []);

  const setPricing = useCallback((pricing: PricingBreakdown) => {
    dispatch({ type: 'SET_PRICING', pricing });
  }, []);

  const setRentalDays = useCallback((days: number) => {
    dispatch({ type: 'SET_RENTAL_DAYS', days });
  }, []);

  const setAddons = useCallback((addons: Addon[]) => {
    dispatch({ type: 'SET_ADDONS', addons });
  }, []);

  // UI state
  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', isLoading });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', error });
  }, []);

  // Step management
  const markStepComplete = useCallback((step: BookingStep) => {
    dispatch({ type: 'MARK_STEP_COMPLETE', step });
  }, []);

  const isStepComplete = useCallback((step: BookingStep): boolean => {
    return state.completedSteps.has(step);
  }, [state.completedSteps]);

  // Get complete form data
  const getFormData = useCallback((): Partial<BookingFormData> => {
    return {
      ...state.step1Data,
      ...state.step2Data,
      ...state.step3Data,
      ...state.step4Data,
    };
  }, [state.step1Data, state.step2Data, state.step3Data, state.step4Data]);

  // Reset
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const initialize = useCallback((data: Partial<BookingState>) => {
    dispatch({ type: 'INITIALIZE', payload: data });
  }, []);

  const value = useMemo<BookingContextValue>(() => ({
    state,
    goToStep,
    nextStep,
    prevStep,
    canGoToStep,
    setStep1Data,
    setStep2Data,
    setStep3Data,
    setStep4Data,
    setVehicle,
    setBranches,
    setPricing,
    setRentalDays,
    setAddons,
    setLoading,
    setError,
    markStepComplete,
    isStepComplete,
    getFormData,
    reset,
    initialize,
  }), [
    state,
    goToStep,
    nextStep,
    prevStep,
    canGoToStep,
    setStep1Data,
    setStep2Data,
    setStep3Data,
    setStep4Data,
    setVehicle,
    setBranches,
    setPricing,
    setRentalDays,
    setAddons,
    setLoading,
    setError,
    markStepComplete,
    isStepComplete,
    getFormData,
    reset,
    initialize,
  ]);

  return (
    <BookingContext.Provider value={value}>
      {children}
    </BookingContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useBooking(): BookingContextValue {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
}

// Optional hook that returns null if outside provider (for components that may or may not be in booking flow)
export function useBookingOptional(): BookingContextValue | null {
  return useContext(BookingContext);
}
