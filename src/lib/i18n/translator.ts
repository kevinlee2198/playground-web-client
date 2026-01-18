import type { Dictionary } from "./types";

// Primitive types for leaf values
type Primitive = string | number | boolean | null | undefined;

// Depth-limited paths
type PathsDepth1<T> = {
  [K in keyof T & string]: K;
}[keyof T & string];

type PathsDepth2<T> = {
  [K in keyof T & string]: T[K] extends Primitive
    ? never
    : `${K}.${PathsDepth1<T[K]>}`;
}[keyof T & string];

type PathsDepth3<T> = {
  [K in keyof T & string]: T[K] extends Primitive
    ? never
    : `${K}.${PathsDepth2<T[K]>}`;
}[keyof T & string];

export type DictionaryPath =
  | PathsDepth1<Dictionary>
  | PathsDepth2<Dictionary>
  | PathsDepth3<Dictionary>;

// Type-safe value retrieval
export type DictionaryValue = string | number | boolean;

function getNestedValue(obj: unknown, path: string): DictionaryValue {
  const keys = path.split(".");
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      throw new Error(`Key "${path}" not found in dictionary.`);
    }
  }

  if (
    typeof result !== "string" &&
    typeof result !== "number" &&
    typeof result !== "boolean"
  ) {
    throw new Error(`Key "${path}" does not resolve to a primitive value.`);
  }

  return result as DictionaryValue;
}

export type TranslatorFn = (key: DictionaryPath) => DictionaryValue;

export function createTranslator(dict: Dictionary): TranslatorFn {
  return (key: DictionaryPath) => getNestedValue(dict, key);
}
