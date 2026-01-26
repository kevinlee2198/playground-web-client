// Height: cm <-> ft/in
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle edge case where inches rounds to 12
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

// Weight: kg <-> lbs
const LBS_PER_KG = 2.20462;

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

// Formatting helpers
export function formatHeightMetric(cm: number): string {
  return `${Math.round(cm)} cm`;
}

export function formatHeightImperial(cm: number): string {
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

export function formatWeightMetric(kg: number): string {
  return `${Math.round(kg)} kg`;
}

export function formatWeightImperial(kg: number): string {
  return `${Math.round(kgToLbs(kg))} lbs`;
}
