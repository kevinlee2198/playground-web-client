import { describe, it, expect } from "vitest";
import {
  formatAddress,
  formatLocationShort,
  locationToValue,
} from "@/lib/location-utils";
import type { Location } from "@/lib/types/location";

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    name: "Test Park",
    address: {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    },
    coordinates: { latitude: 39.78, longitude: -89.65 },
    ...overrides,
  };
}

describe("formatAddress", () => {
  it("joins all present address parts with commas", () => {
    const result = formatAddress({
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    });
    expect(result).toBe("123 Main St, Springfield, IL, 62701, US");
  });

  it("omits null fields", () => {
    const result = formatAddress({
      street: null,
      city: "Springfield",
      state: null,
      postalCode: null,
      country: "US",
    });
    expect(result).toBe("Springfield, US");
  });

  it("returns only country when all other fields are null", () => {
    const result = formatAddress({
      street: null,
      city: null,
      state: null,
      postalCode: null,
      country: "US",
    });
    expect(result).toBe("US");
  });
});

describe("formatLocationShort", () => {
  it("returns city and state when both present", () => {
    const loc = makeLocation();
    expect(formatLocationShort(loc)).toBe("Springfield, IL");
  });

  it("returns city only when state is missing", () => {
    const loc = makeLocation({
      address: {
        street: "123 Main St",
        city: "Springfield",
        state: null,
        postalCode: null,
        country: "US",
      },
    });
    expect(formatLocationShort(loc)).toBe("Springfield");
  });

  it("returns state and country when city is empty", () => {
    const loc = makeLocation({
      address: {
        street: null,
        city: "",
        state: "IL",
        postalCode: null,
        country: "US",
      },
    });
    expect(formatLocationShort(loc)).toBe("IL, US");
  });

  it("returns country only when city is empty and state is missing", () => {
    const loc = makeLocation({
      address: {
        street: null,
        city: "",
        state: null,
        postalCode: null,
        country: "US",
      },
    });
    expect(formatLocationShort(loc)).toBe("US");
  });
});

describe("locationToValue", () => {
  it("maps a full location to a LocationValue with displayName", () => {
    const result = locationToValue(makeLocation());
    expect(result).toEqual({
      address: {
        street: "123 Main St",
        city: "Springfield",
        state: "IL",
        postalCode: "62701",
        country: "US",
      },
      coordinates: { latitude: 39.78, longitude: -89.65 },
      displayName: "123 Main St, Springfield, IL, 62701, US",
    });
  });

  it("maps null coordinates to undefined", () => {
    expect(locationToValue(makeLocation({ coordinates: null })).coordinates).toBeUndefined();
  });

  it("converts null address fields to undefined", () => {
    const loc = makeLocation({
      address: {
        street: null,
        city: "Springfield",
        state: null,
        postalCode: null,
        country: "US",
      },
    });
    expect(locationToValue(loc).address).toEqual({
      city: "Springfield",
      country: "US",
      street: undefined,
      state: undefined,
      postalCode: undefined,
    });
  });

  it("preserves city directly from the location", () => {
    expect(locationToValue(makeLocation()).address.city).toBe("Springfield");
  });
});
