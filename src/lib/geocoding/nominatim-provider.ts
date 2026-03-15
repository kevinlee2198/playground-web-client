import type { GeocodingProvider } from "./geocode-provider";
import type { GeocodeSuggestion } from "./types";

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "PlaygroundWebClient/1.0";

function mapNominatimResult(result: NominatimResult): GeocodeSuggestion | null {
  const { address } = result;

  const country = address.country;
  if (!country) {
    return null;
  }

  const street =
    address.house_number && address.road
      ? `${address.house_number} ${address.road}`
      : (address.road ?? undefined);

  const city =
    address.city ?? address.town ?? address.village ?? address.municipality;

  if (!city) {
    return null;
  }

  const state = address.state;
  const postalCode = address.postcode;

  const displayParts = [street, city, state, postalCode, country].filter(
    (part): part is string => part !== undefined,
  );
  const displayName = displayParts.join(", ");

  return {
    id: String(result.place_id),
    displayName,
    address: {
      street,
      city,
      state,
      postalCode,
      country,
    },
    coordinates: {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    },
  };
}

export class NominatimProvider implements GeocodingProvider {
  async search(query: string, limit: number): Promise<GeocodeSuggestion[]> {
    const params = new URLSearchParams({
      q: query,
      format: "jsonv2",
      addressdetails: "1",
      limit: String(limit),
    });

    const url = `${NOMINATIM_BASE_URL}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim request failed: ${response.status} ${response.statusText}`,
      );
    }

    const results: NominatimResult[] = await response.json();

    return results
      .map(mapNominatimResult)
      .filter(
        (suggestion): suggestion is GeocodeSuggestion => suggestion !== null,
      );
  }
}
