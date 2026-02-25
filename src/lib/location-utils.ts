import type { Location, LocationValue } from "@/lib/types/location";

/**
 * Formats a full address for display (e.g., in the autocomplete input
 * or on the game detail page).
 *
 * Example: "123 Main St, Springfield, IL 62701, United States"
 *
 * Filters out falsy values so missing optional fields (empty strings or
 * undefined) are simply omitted from the output.
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}): string {
  return [
    address.street,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");
}

/**
 * Short location text for game cards.
 *
 * Priority:
 * 1. "city, state" (e.g., "Springfield, IL")
 * 2. "state, country" (e.g., "IL, United States") -- if city is not available
 * 3. "country" -- if neither city nor state is available
 */
export function formatLocationShort(location: Location): string {
  const { city, state, country } = location.address;
  if (city) {
    return state ? `${city}, ${state}` : city;
  }
  if (state) {
    return `${state}, ${country}`;
  }
  return country;
}

/**
 * Converts a Location (response type from backend) to a LocationValue (form type).
 * Used when pre-populating the update form with an existing game location.
 *
 * Null coordinates are mapped to undefined (omitted) rather than a fallback
 * like (0, 0), to avoid writing bogus data back to the server if the form
 * is re-submitted without changes.
 *
 * Empty string address fields are mapped to undefined so they are omitted
 * from mutation inputs, since the backend treats absent optional fields
 * differently from empty strings.
 */
export function locationToValue(location: Location): LocationValue {
  return {
    address: {
      street: location.address.street || undefined,
      city: location.address.city || undefined,
      state: location.address.state || undefined,
      postalCode: location.address.postalCode || undefined,
      country: location.address.country,
    },
    coordinates: location.coordinates ?? undefined,
    displayName: formatAddress(location.address),
  };
}
