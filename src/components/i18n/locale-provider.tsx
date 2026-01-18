"use client";

import type { Dictionary } from "@/lib/i18n/types";
import { createTranslator } from "@/lib/i18n/translator";
import { createContext, useContext, useMemo, type ReactNode } from "react";

const LocaleContext = createContext<Dictionary | null>(null);

export function LocaleProvider({
  dict,
  children,
}: {
  dict: Dictionary;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={dict}>{children}</LocaleContext.Provider>
  );
}

export function useDictionary(): Dictionary {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useDictionary must be used inside <LocaleProvider>");
  }
  return ctx;
}

export function useTranslator() {
  const dict = useDictionary();
  return useMemo(() => createTranslator(dict), [dict]);
}
