import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Converts a snake_case string (upper or lower) to camelCase
 * Examples:
 *  "snake_case" -> "snakeCase"
 *  "SNAKE_CASE" -> "snakeCase"
 */
export function snakeToCamel(input: string): string {
  return input
    .toLowerCase()
    .replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
}

/**
 * Converts a camelCase or PascalCase string to snake_case (lowercase)
 * Examples:
 *  "camelCase" -> "camel_case"
 *  "PascalCase" -> "pascal_case"
 */
export function camelToSnake(input: string): string {
  return input.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
