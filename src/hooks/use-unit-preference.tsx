"use client";

import { UnitPreference } from "@/lib/constants";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const DEFAULT_PREFERENCE = UnitPreference.IMPERIAL;

interface UnitPreferenceContextValue {
  preference: UnitPreference;
  setPreference: (preference: UnitPreference) => void;
}

const UnitPreferenceContext = createContext<UnitPreferenceContextValue | null>(
  null,
);

// This might change to be for account values in general
interface UnitPreferenceProviderProps {
  children: ReactNode;
  /**
   * Initial preference from user account.
   * When account-level storage is implemented, pass the user's preference here.
   * Falls back to IMPERIAL if not provided.
   */
  initialPreference?: UnitPreference;
  /**
   * Callback when preference changes.
   * When account-level storage is implemented, this can trigger a mutation.
   */
  onPreferenceChange?: (preference: UnitPreference) => void;
}

export function UnitPreferenceProvider({
  children,
  initialPreference = DEFAULT_PREFERENCE,
  onPreferenceChange,
}: UnitPreferenceProviderProps) {
  const [preference, setPreferenceState] =
    useState<UnitPreference>(initialPreference);

  const setPreference = useCallback(
    (newPreference: UnitPreference) => {
      setPreferenceState(newPreference);
      onPreferenceChange?.(newPreference);
    },
    [onPreferenceChange],
  );

  return (
    <UnitPreferenceContext.Provider value={{ preference, setPreference }}>
      {children}
    </UnitPreferenceContext.Provider>
  );
}

export function useUnitPreference(): UnitPreferenceContextValue {
  const context = useContext(UnitPreferenceContext);
  if (!context) {
    throw new Error(
      "useUnitPreference must be used within a UnitPreferenceProvider",
    );
  }
  return context;
}
