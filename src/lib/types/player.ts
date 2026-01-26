export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null; // stored in cm
  weight?: number | null; // stored in kg
  biography?: string | null;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

export interface UpdatePlayerInput {
  id: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

export type UnitPreference = "metric" | "imperial";

export interface HeightImperial {
  feet: number;
  inches: number;
}
