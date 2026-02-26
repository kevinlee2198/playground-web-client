import { getSubtypes, SportSubtype, SportType } from "@/lib/constants";
import type { LocationValue } from "@/lib/types/location";
import { z } from "zod";

const locationSchema = z
  .object({
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
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
    subtype: z.enum(SportSubtype, { message: "Required" }),
    startDate: z.date({ message: "Required" }),
    periods: z.number().int().positive("Must be positive").optional(),
    bestOf: z
      .number()
      .refine((v) => v === 3 || v === 5, "Must be 3 or 5")
      .optional(),
    tiebreakFinalSet: z.boolean().optional(),
    location: locationSchema,
  })
  .refine(
    (data) => {
      if (!data.sportType || !data.subtype) return true;
      const validSubtypes = getSubtypes(data.sportType);
      return (validSubtypes as readonly SportSubtype[]).includes(data.subtype);
    },
    {
      message: "Invalid subtype for selected sport",
      path: ["subtype"],
    },
  );

export interface CreateGameFormValues {
  sportType: SportType;
  subtype: SportSubtype;
  startDate: Date;
  periods?: number;
  bestOf?: number;
  tiebreakFinalSet?: boolean;
  location?: LocationValue;
}

export const updateGameFormSchema = z.object({
  startDate: z.date({ message: "Required" }),
  periods: z.number().int().positive("Must be positive").optional(),
  bestOf: z
    .number()
    .refine((v) => v === 3 || v === 5, "Must be 3 or 5")
    .optional(),
  tiebreakFinalSet: z.boolean().optional(),
  location: locationSchema.nullable(),
});

export interface UpdateGameFormValues {
  startDate: Date;
  periods?: number;
  bestOf?: number;
  tiebreakFinalSet?: boolean;
  location?: LocationValue | null;
}
