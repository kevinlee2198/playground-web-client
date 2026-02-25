"use client";

import { Loader2, MapPin, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import type { GeocodeSuggestion } from "@/lib/geocoding/types";
import type { LocationValue } from "@/lib/types/location";
import { cn } from "@/lib/utils";
import { useLocationSearch } from "./use-location-search";

interface LocationAutocompleteProps {
  /** Currently selected location, or null if none */
  value: LocationValue | null;
  /** Called when a location is selected from the dropdown */
  onSelect: (location: LocationValue) => void;
  /** Called when the clear button is clicked */
  onClear: () => void;
  /** Disabled state */
  disabled?: boolean;
}

function suggestionToLocationValue(
  suggestion: GeocodeSuggestion,
): LocationValue {
  return {
    address: suggestion.address,
    coordinates: suggestion.coordinates,
    displayName: suggestion.displayName,
  };
}

export function LocationAutocomplete({
  value,
  onSelect,
  onClear,
  disabled = false,
}: LocationAutocompleteProps) {
  const t = useTranslations("location");
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * `searchText` tracks what the user has typed since the last clear/selection.
   * When `value` is non-null the input shows `value.displayName`; when the user
   * starts typing again we switch to `searchText`.
   * This avoids a useEffect->setState cycle (cascading render lint rule).
   */
  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { suggestions, isLoading, error, search, clearSuggestions } =
    useLocationSearch();

  // The visible input value: show the search text while the user is typing;
  // otherwise show the selected value's display name (or empty for no selection).
  const inputValue = isTyping ? searchText : (value?.displayName ?? "");

  // Close dropdown on outside click (essential for mobile without Escape key)
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const query = e.target.value;
      setSearchText(query);
      setIsTyping(true);
      setActiveIndex(-1);

      if (query.length >= 4) {
        setIsOpen(true);
        search(query);
      } else {
        setIsOpen(false);
        clearSuggestions();
      }
    },
    [search, clearSuggestions],
  );

  const handleSelect = useCallback(
    (suggestion: GeocodeSuggestion) => {
      const location = suggestionToLocationValue(suggestion);
      setIsTyping(false);
      setSearchText("");
      setIsOpen(false);
      setActiveIndex(-1);
      clearSuggestions();
      onSelect(location);
    },
    [onSelect, clearSuggestions],
  );

  const handleClear = useCallback(() => {
    setIsTyping(false);
    setSearchText("");
    setIsOpen(false);
    setActiveIndex(-1);
    clearSuggestions();
    onClear();
    inputRef.current?.focus();
  }, [onClear, clearSuggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            suggestions.length === 0
              ? -1
              : Math.min(prev + 1, suggestions.length - 1),
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, -1));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < suggestions.length) {
            handleSelect(suggestions[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [isOpen, activeIndex, suggestions, handleSelect],
  );

  const showDropdown =
    isOpen && (suggestions.length > 0 || isLoading || error !== null);

  const activeOptionId =
    activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <MapPin className="size-4" aria-hidden="true" />
          )}
        </InputGroupAddon>

        <InputGroupInput
          ref={inputRef}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={t("searchPlaceholder")}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />

        {value !== null && (
          <InputGroupAddon align="inline-end">
            <button
              type="button"
              aria-label={t("clear")}
              className={cn(
                "flex items-center justify-center rounded p-0.5",
                "text-muted-foreground hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              onClick={handleClear}
              disabled={disabled}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </InputGroupAddon>
        )}
      </InputGroup>

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={t("searchPlaceholder")}
          className={cn(
            "absolute z-50 mt-1 w-full",
            "rounded-md border border-input bg-popover shadow-md",
            "max-h-60 overflow-auto py-1",
            "transition-opacity duration-150",
            "[&]:motion-reduce:transition-none",
          )}
        >
          {isLoading && suggestions.length === 0 && (
            <li
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className="flex items-center gap-2 px-3 py-2"
            >
              <Loader2
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
              <TypographyMuted>{t("loading")}</TypographyMuted>
            </li>
          )}

          {!isLoading && error !== null && (
            <li
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className="px-3 py-2"
            >
              <TypographyMuted className="text-destructive">
                {t("error")}
              </TypographyMuted>
            </li>
          )}

          {!isLoading && error === null && suggestions.length === 0 && (
            <li
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className="px-3 py-2"
            >
              <TypographyMuted>{t("noResults")}</TypographyMuted>
            </li>
          )}

          {suggestions.map((suggestion, index) => {
            const optionId = `${listboxId}-option-${index}`;
            const isActive = index === activeIndex;
            return (
              <li
                key={suggestion.id}
                id={optionId}
                role="option"
                aria-selected={isActive}
                className={cn(
                  "touch-manipulation",
                  "cursor-pointer px-3 py-2",
                  "transition-colors duration-100",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent hover:text-accent-foreground",
                )}
                onMouseDown={(e) => {
                  // Prevent input blur before click registers
                  e.preventDefault();
                  handleSelect(suggestion);
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <TypographySmall className="block truncate font-normal leading-snug">
                  {suggestion.displayName}
                </TypographySmall>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
