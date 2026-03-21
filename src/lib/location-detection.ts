/**
 * Parsed location from URL search params.
 */
export interface ParsedLocation {
  latitude: number;
  longitude: number;
  locationName: string | null;
}

/** Distance preset options in miles (converted to meters before sending to API). */
export const DISTANCE_PRESETS_MILES = [5, 10, 25, 50] as const;

/** Default distance preset in miles. */
export const DEFAULT_DISTANCE_MILES = 25;

/** Meters per mile — exact conversion factor. */
const METERS_PER_MILE = 1609.344;

export function isValidCoordinates(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function parseLocationParams(
  params: Record<string, string | string[] | undefined>,
): ParsedLocation | null {
  const latStr = typeof params.lat === "string" ? params.lat : null;
  const lngStr = typeof params.lng === "string" ? params.lng : null;

  if (!latStr || !lngStr) return null;

  const lat = Number(latStr);
  const lng = Number(lngStr);

  if (!isValidCoordinates(lat, lng)) return null;

  const loc = typeof params.loc === "string" ? params.loc : null;

  return { latitude: lat, longitude: lng, locationName: loc };
}

/**
 * Parse the radius URL param. Returns a valid preset value or the default.
 */
export function parseRadiusParam(
  value: string | string[] | undefined,
): number {
  if (typeof value !== "string") return DEFAULT_DISTANCE_MILES;
  const num = Number(value);
  if (
    DISTANCE_PRESETS_MILES.includes(
      num as (typeof DISTANCE_PRESETS_MILES)[number],
    )
  ) {
    return num;
  }
  return DEFAULT_DISTANCE_MILES;
}

export function milesToMeters(miles: number): number {
  return miles * METERS_PER_MILE;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function metersToKm(meters: number): number {
  return meters / 1000;
}

export function formatDistance(
  meters: number,
  unit: "IMPERIAL" | "METRIC",
): string {
  if (unit === "IMPERIAL") {
    const miles = metersToMiles(meters);
    if (miles < 0.1) return "< 0.1 mi";
    return `${miles.toFixed(1)} mi`;
  }
  const km = metersToKm(meters);
  if (km < 0.1) return "< 0.1 km";
  return `${km.toFixed(1)} km`;
}
