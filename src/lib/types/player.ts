export interface Player {
  id: number;
  firstName: string;
  lastName: string;
  age: number | null;
  height: number | null; // stored in cm
  weight: number | null; // stored in kg
  biography: string | null;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  age?: number;
  height?: number;
  weight?: number;
  biography?: string;
}

/**
 * Patch semantics:
 * - Omit a field (undefined) to leave it unchanged
 * - Set firstName/lastName to null is not allowed
 * - Set age/height/weight/biography to null to clear the value in the database
 */
export interface UpdatePlayerInput {
  id: number;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

export interface HeightImperial {
  feet: number;
  inches: number;
}
