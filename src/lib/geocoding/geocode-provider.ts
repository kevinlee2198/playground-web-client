import type { GeocodeSuggestion } from "./types";

export interface GeocodingProvider {
  search(query: string, limit: number): Promise<GeocodeSuggestion[]>;
}
