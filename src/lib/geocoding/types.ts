/**
 * A standardized geocoding suggestion returned by the API route.
 * Intentionally aligned with the backend LocationInput shape
 * so the frontend can pass it through with minimal transformation.
 */
export interface GeocodeSuggestion {
  /** Unique identifier for this suggestion (used as React key / ARIA option id) */
  id: string;
  /** Human-readable formatted address for display */
  displayName: string;
  address: {
    street?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/** The JSON shape returned by GET /api/geocode/search */
export interface GeocodeSearchResponse {
  suggestions: GeocodeSuggestion[];
}
