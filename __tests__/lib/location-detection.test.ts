import { describe, expect, it } from "vitest";
import {
  isValidCoordinates,
  parseLocationParams,
  parseRadiusParam,
  formatDistance,
  milesToMeters,
  metersToMiles,
  metersToKm,
  DISTANCE_PRESETS_MILES,
  DEFAULT_DISTANCE_MILES,
} from "@/lib/location-detection";

describe("isValidCoordinates", () => {
  it("accepts valid lat/lng", () => {
    expect(isValidCoordinates(40.7128, -74.006)).toBe(true);
  });
  it("rejects latitude out of range", () => {
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(-91, 0)).toBe(false);
  });
  it("rejects longitude out of range", () => {
    expect(isValidCoordinates(0, 181)).toBe(false);
    expect(isValidCoordinates(0, -181)).toBe(false);
  });
  it("rejects NaN", () => {
    expect(isValidCoordinates(NaN, 0)).toBe(false);
  });
  it("accepts boundary values", () => {
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
  });
});

describe("parseLocationParams", () => {
  it("parses valid lat/lng/loc from search params", () => {
    const result = parseLocationParams({
      lat: "40.7128",
      lng: "-74.006",
      loc: "New York, NY",
    });
    expect(result).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
      locationName: "New York, NY",
    });
  });
  it("returns null for missing lat", () => {
    expect(parseLocationParams({ lng: "-74.006" })).toBeNull();
  });
  it("returns null for invalid lat", () => {
    expect(parseLocationParams({ lat: "abc", lng: "-74.006" })).toBeNull();
  });
  it("returns null for out-of-range coordinates", () => {
    expect(parseLocationParams({ lat: "91", lng: "0" })).toBeNull();
  });
  it("returns result without locationName if loc is missing", () => {
    const result = parseLocationParams({ lat: "40.7128", lng: "-74.006" });
    expect(result).toEqual({
      latitude: 40.7128,
      longitude: -74.006,
      locationName: null,
    });
  });
});

describe("parseRadiusParam", () => {
  it("parses valid radius", () => {
    expect(parseRadiusParam("10")).toBe(10);
  });
  it("returns default for missing param", () => {
    expect(parseRadiusParam(undefined)).toBe(DEFAULT_DISTANCE_MILES);
  });
  it("returns default for invalid param", () => {
    expect(parseRadiusParam("abc")).toBe(DEFAULT_DISTANCE_MILES);
  });
  it("returns default for out-of-preset value", () => {
    expect(parseRadiusParam("7")).toBe(DEFAULT_DISTANCE_MILES);
  });
});

describe("milesToMeters", () => {
  it("converts 25 miles to ~40234 meters", () => {
    expect(milesToMeters(25)).toBeCloseTo(40233.6, 0);
  });
  it("converts 0 miles to 0 meters", () => {
    expect(milesToMeters(0)).toBe(0);
  });
});

describe("metersToMiles", () => {
  it("converts 1609.34 meters to ~1 mile", () => {
    expect(metersToMiles(1609.34)).toBeCloseTo(1, 1);
  });
});

describe("metersToKm", () => {
  it("converts 1000 meters to 1 km", () => {
    expect(metersToKm(1000)).toBe(1);
  });
});

describe("formatDistance", () => {
  it("formats meters as miles for IMPERIAL", () => {
    expect(formatDistance(8046.7, "IMPERIAL")).toBe("5.0 mi");
  });
  it("formats meters as km for METRIC", () => {
    expect(formatDistance(3700, "METRIC")).toBe("3.7 km");
  });
  it("shows < 0.1 mi for very short distances in IMPERIAL", () => {
    expect(formatDistance(100, "IMPERIAL")).toBe("< 0.1 mi");
  });
  it("shows < 0.1 km for very short distances in METRIC", () => {
    expect(formatDistance(50, "METRIC")).toBe("< 0.1 km");
  });
});

describe("DISTANCE_PRESETS_MILES", () => {
  it("has the expected presets", () => {
    expect(DISTANCE_PRESETS_MILES).toEqual([5, 10, 25, 50]);
  });
});
