export interface Player {
  id: number;
  age: number | null;
  height: number | null; // stored in cm
  weight: number | null; // stored in kg
}

export interface CreatePlayerInput {
  age?: number;
  height?: number;
  weight?: number;
}

/**
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set age/height/weight to null to clear the value in the database
 */
export interface UpdatePlayerInput {
  id: number;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
}

export interface HeightImperial {
  feet: number;
  inches: number;
}
