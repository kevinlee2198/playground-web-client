import "server-only";

import type { Dictionary } from "./types";

const dictionaries = {
  en: () =>
    import("@/dictionaries/en.json").then(
      (module) => module.default as Dictionary,
    ),
};

export type Locale = keyof typeof dictionaries;

export const hasLocale = (locale: string): locale is Locale =>
  locale in dictionaries;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export function defaultLocal(): Locale {
  return "en";
}
