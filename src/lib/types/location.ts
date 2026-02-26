/**
 * Represents a selected location value in the frontend.
 * Aligned with the backend LocationInput (minus `name`).
 * Used as form state for create/update game forms.
 */
export interface LocationValue {
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  /**
   * Optional because a backend Location may have null coordinates.
   * Nominatim always provides coordinates, but pre-populated existing
   * locations may have null coordinates from the backend.
   */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  /** Display string shown in the input field */
  displayName: string;
}

/**
 * Location data as returned by the backend on Game queries.
 * Response type: fields present but nullable per convention.
 * The Address type has all fields as String! (non-nullable) in the backend schema,
 * so empty strings are used for missing fields rather than null.
 */
export interface Location {
  id: string;
  name: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
}
