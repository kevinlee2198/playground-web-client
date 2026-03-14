import { z } from "zod";

export const playerFormSchema = z.object({
  age: z.number().positive("Age must be a positive number").optional(),
  heightCm: z.number().positive("Height must be a positive number").optional(),
  heightFeet: z
    .number()
    .positive("Height must be a positive number")
    .optional(),
  heightInches: z
    .number()
    .nonnegative("Inches must be a non-negative number")
    .optional(),
  weightKg: z.number().positive("Weight must be a positive number").optional(),
  weightLbs: z.number().positive("Weight must be a positive number").optional(),
});

export type PlayerFormValues = z.infer<typeof playerFormSchema>;
