import { describe, it, expect } from "vitest";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg,
  formatHeightMetric,
  formatHeightImperial,
  formatWeightMetric,
  formatWeightImperial,
} from "@/lib/unit-conversion";

describe("cmToFeetInches", () => {
  it("converts 0 cm to 0 feet 0 inches", () => {
    expect(cmToFeetInches(0)).toEqual({ feet: 0, inches: 0 });
  });

  it("converts 180 cm to 5 feet 11 inches", () => {
    expect(cmToFeetInches(180)).toEqual({ feet: 5, inches: 11 });
  });

  it("converts 152.4 cm to exactly 5 feet 0 inches", () => {
    expect(cmToFeetInches(152.4)).toEqual({ feet: 5, inches: 0 });
  });

  it("never returns inches >= 12", () => {
    const result = cmToFeetInches(182.88);
    expect(result.inches).toBeLessThan(12);
  });
});

describe("feetInchesToCm", () => {
  it("converts 0 feet 0 inches to 0 cm", () => {
    expect(feetInchesToCm(0, 0)).toBe(0);
  });

  it("converts 6 feet 0 inches", () => {
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88, 1);
  });

  it("round-trips with cmToFeetInches", () => {
    const cm = 175;
    const { feet, inches } = cmToFeetInches(cm);
    expect(feetInchesToCm(feet, inches)).toBeCloseTo(cm, 0);
  });
});

describe("kgToLbs", () => {
  it("converts 0 kg to 0 lbs", () => {
    expect(kgToLbs(0)).toBe(0);
  });

  it("converts 100 kg correctly", () => {
    expect(kgToLbs(100)).toBeCloseTo(220.46, 1);
  });
});

describe("lbsToKg", () => {
  it("converts 0 lbs to 0 kg", () => {
    expect(lbsToKg(0)).toBe(0);
  });

  it("round-trips with kgToLbs", () => {
    const kg = 80;
    expect(lbsToKg(kgToLbs(kg))).toBeCloseTo(kg, 1);
  });
});

describe("formatHeightMetric", () => {
  it("formats height in cm", () => {
    expect(formatHeightMetric(180)).toBe("180 cm");
  });
});

describe("formatHeightImperial", () => {
  it("formats 180 cm as feet and inches", () => {
    expect(formatHeightImperial(180)).toBe("5'11\"");
  });
});

describe("formatWeightMetric", () => {
  it("formats weight in kg", () => {
    expect(formatWeightMetric(80)).toBe("80 kg");
  });
});

describe("formatWeightImperial", () => {
  it("formats 80 kg as lbs", () => {
    expect(formatWeightImperial(80)).toBe("176 lbs");
  });
});
