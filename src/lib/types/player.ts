export interface Player {
  id: number;
  age: number | null;
  height: number | null; // stored in cm
  weight: number | null; // stored in kg
}

/**
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set age/height/weight to null to clear the value in the database
 */
export interface UpdatePlayerInput {
  age?: number | null;
  height?: number | null;
  weight?: number | null;
}

export interface HeightImperial {
  feet: number;
  inches: number;
}
