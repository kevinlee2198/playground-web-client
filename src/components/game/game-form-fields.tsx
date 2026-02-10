import { getSubtypes, SportSubtype, SportType } from "@/lib/constants";
import { z } from "zod";

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
}

export const updateGameFormSchema = z.object({
  startDate: z.date({ message: "Required" }),
  periods: z.number().int().positive("Must be positive").optional(),
  bestOf: z
    .number()
    .refine((v) => v === 3 || v === 5, "Must be 3 or 5")
    .optional(),
  tiebreakFinalSet: z.boolean().optional(),
});

export interface UpdateGameFormValues {
  startDate: Date;
  periods?: number;
  bestOf?: number;
  tiebreakFinalSet?: boolean;
}
