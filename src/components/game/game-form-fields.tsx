import { GameVisibility, getFormats, PickleballScoringType, SportFormat, SportType, SportTypeConfig, StatEntryMode } from "@/lib/constants";
import type { LocationValue } from "@/lib/types/location";
import { z } from "zod";

const locationSchema = z
  .object({
    address: z.object({
      street: z.string().optional(),
      city: z.string().min(1, "City is required"),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string(),
    }),
    coordinates: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
      })
      .optional(),
    displayName: z.string(),
  })
  .optional();

export const createGameFormSchema = z
  .object({
    sportType: z.enum(SportType, { message: "Required" }),
    format: z.enum(SportFormat, { message: "Required" }).optional(),
    startDate: z.date({ message: "Required" }),
    periods: z.number().int().positive("Must be positive").optional(),
    bestOf: z.number().int().positive("Must be positive").optional(),
    tiebreakFinalSet: z.boolean().optional(),
    pointsPerGame: z
      .number()
      .refine((v) => v === 11 || v === 15 || v === 21, "Must be 11, 15, or 21")
      .optional(),
    winByTwo: z.boolean().optional(),
    scoringType: z.enum(PickleballScoringType).optional(),
    innings: z.number().int().positive("Must be positive").optional(),
    pointsPerSet: z.number().int().positive("Must be positive").optional(),
    pointsPerFinalSet: z.number().int().positive("Must be positive").optional(),
    location: locationSchema,
    visibility: z.enum(GameVisibility).default(GameVisibility.PUBLIC),
    statEntryMode: z.enum(StatEntryMode).default(StatEntryMode.OPEN),
  })
  .refine(
    (data) => {
      if (!data.sportType) return true;
      const sportConfig = SportTypeConfig[data.sportType];
      if (sportConfig.formats.length === 0) return true;
      if (!data.format) return false;
      const validFormats = getFormats(data.sportType);
      return (validFormats as readonly SportFormat[]).includes(data.format);
    },
    {
      message: "Invalid format for selected sport",
      path: ["format"],
    },
  )
  .refine(
    (data) => {
      if (data.bestOf === undefined) return true;
      if (data.sportType === SportType.TENNIS) return data.bestOf === 3 || data.bestOf === 5;
      if (data.sportType === SportType.PICKLEBALL) return data.bestOf === 1 || data.bestOf === 3 || data.bestOf === 5;
      if (data.sportType === SportType.VOLLEYBALL) return data.bestOf === 3 || data.bestOf === 5;
      return true;
    },
    {
      message: "Invalid best-of value for selected sport",
      path: ["bestOf"],
    },
  );

export interface CreateGameFormValues {
  sportType: SportType;
  format?: SportFormat;
  startDate: Date;
  periods?: number;
  bestOf?: number;
  tiebreakFinalSet?: boolean;
  pointsPerGame?: number;
  winByTwo?: boolean;
  scoringType?: PickleballScoringType;
  innings?: number;
  pointsPerSet?: number;
  pointsPerFinalSet?: number;
  location?: LocationValue;
  visibility: GameVisibility;
  statEntryMode: StatEntryMode;
}

export const updateGameFormSchema = z.object({
  startDate: z.date({ message: "Required" }),
  periods: z.number().int().positive("Must be positive").optional(),
  bestOf: z.number().int().positive("Must be positive").optional(),
  tiebreakFinalSet: z.boolean().optional(),
  pointsPerGame: z
    .number()
    .refine((v) => v === 11 || v === 15 || v === 21, "Must be 11, 15, or 21")
    .optional(),
  winByTwo: z.boolean().optional(),
  scoringType: z.enum(PickleballScoringType).optional(),
  innings: z.number().int().positive("Must be positive").optional(),
  pointsPerSet: z.number().int().positive("Must be positive").optional(),
  pointsPerFinalSet: z.number().int().positive("Must be positive").optional(),
  location: locationSchema.nullable(),
  visibility: z.enum(GameVisibility).optional(),
  statEntryMode: z.enum(StatEntryMode).optional(),
});

export interface UpdateGameFormValues {
  startDate: Date;
  periods?: number;
  bestOf?: number;
  tiebreakFinalSet?: boolean;
  pointsPerGame?: number;
  winByTwo?: boolean;
  scoringType?: PickleballScoringType;
  innings?: number;
  pointsPerSet?: number;
  pointsPerFinalSet?: number;
  location?: LocationValue | null;
  visibility?: GameVisibility;
  statEntryMode?: StatEntryMode;
}
