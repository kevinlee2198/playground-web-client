import { z } from "zod";

export function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

export const playerFormSchema = z.object({
  firstName: z.string().min(1, "Required").max(255),
  lastName: z.string().min(1, "Required").max(255),

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

  biography: z.string().refine((val) => countWords(val) <= 1000, {
    message: "Biography must be 1000 words or fewer",
  }),
});

export type PlayerFormValues = {
  firstName: string;
  lastName: string;
  age?: number;
  heightCm?: number;
  heightFeet?: number;
  heightInches?: number;
  weightKg?: number;
  weightLbs?: number;
  biography: string;
};
