"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnitPreference } from "@/lib/constants";
import { useTranslations } from "next-intl";
import type { Control } from "react-hook-form";
import { z } from "zod";

export const countWords = (text: string): number => {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

export const createPlayerFormSchema = (
  t: ReturnType<typeof useTranslations>,
) =>
  z.object({
    firstName: z.string().min(1).max(255),
    lastName: z.string().min(1).max(255),
    age: z.coerce.number().int().positive().min(1).optional(),
    heightCm: z.coerce.number().int().min(1).optional(),
    heightFeet: z.coerce.number().int().min(0).optional(),
    heightInches: z.coerce.number().int().min(0).max(11).optional(),
    weightKg: z.coerce.number().int().min(1).optional(),
    weightLbs: z.coerce.number().int().min(1).optional(),
    biography: z
      .string()
      .nullable()
      .optional()
      .refine((val) => !val || countWords(val) <= 1000, {
        message: t("player.validation.biographyMaxWords"),
      }),
  });

export type PlayerFormInput = {
  firstName: string;
  lastName: string;
  age?: unknown;
  heightCm?: unknown;
  heightFeet?: unknown;
  heightInches?: unknown;
  weightKg?: unknown;
  weightLbs?: unknown;
  biography?: string | null;
};

export type PlayerFormOutput = z.infer<ReturnType<typeof createPlayerFormSchema>>;

interface PlayerFieldProps {
  control: Control<PlayerFormInput>;
  isPending: boolean;
}

export function NameFields({ control, isPending }: PlayerFieldProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        control={control}
        name="firstName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("player.form.firstName")}
              <span className="ml-1 text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled={isPending}
                placeholder={t("player.form.firstName")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="lastName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("player.form.lastName")}
              <span className="ml-1 text-destructive">*</span>
            </FormLabel>
            <FormControl>
              <Input
                {...field}
                disabled={isPending}
                placeholder={t("player.form.lastName")}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface PhysicalFieldProps extends PlayerFieldProps {
  unitPreference: UnitPreference;
}

export function PhysicalFields({
  control,
  isPending,
  unitPreference,
}: PhysicalFieldProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <FormField
        control={control}
        name="age"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("player.form.age")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                type="number"
                disabled={isPending}
                placeholder={t("player.form.age")}
                value={
                  typeof field.value === "string" ||
                  typeof field.value === "number"
                    ? field.value
                    : ""
                }
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? undefined : e.target.value,
                  )
                }
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {unitPreference === UnitPreference.METRIC ? (
        <FormField
          control={control}
          name="heightCm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("player.form.height")} ({t("units.cm")})
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  disabled={isPending}
                  placeholder="170"
                  value={
                    typeof field.value === "string" ||
                    typeof field.value === "number"
                      ? field.value
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : e.target.value,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <>
          <FormField
            control={control}
            name="heightFeet"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("player.form.height")} ({t("units.ft")})
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    disabled={isPending}
                    placeholder="5"
                    value={
                      typeof field.value === "string" ||
                      typeof field.value === "number"
                        ? field.value
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? undefined : e.target.value,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="heightInches"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("units.in")}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    disabled={isPending}
                    placeholder="10"
                    value={
                      typeof field.value === "string" ||
                      typeof field.value === "number"
                        ? field.value
                        : ""
                    }
                    onChange={(e) =>
                      field.onChange(
                        e.target.value === "" ? undefined : e.target.value,
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </>
      )}
    </div>
  );
}

interface WeightFieldProps extends PlayerFieldProps {
  unitPreference: UnitPreference;
}

export function WeightFields({
  control,
  isPending,
  unitPreference,
}: WeightFieldProps) {
  const t = useTranslations();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {unitPreference === UnitPreference.METRIC ? (
        <FormField
          control={control}
          name="weightKg"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("player.form.weight")} ({t("units.kg")})
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  disabled={isPending}
                  placeholder="70"
                  value={
                    typeof field.value === "string" ||
                    typeof field.value === "number"
                      ? field.value
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : e.target.value,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
        <FormField
          control={control}
          name="weightLbs"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("player.form.weight")} ({t("units.lbs")})
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  disabled={isPending}
                  placeholder="154"
                  value={
                    typeof field.value === "string" ||
                    typeof field.value === "number"
                      ? field.value
                      : ""
                  }
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : e.target.value,
                    )
                  }
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}

interface BiographyFieldProps extends PlayerFieldProps {
  wordCount: number;
}

export function BiographyField({
  control,
  isPending,
  wordCount,
}: BiographyFieldProps) {
  const t = useTranslations();

  return (
    <FormField
      control={control}
      name="biography"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t("player.form.biography")}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              disabled={isPending}
              placeholder={t("player.form.biography")}
              rows={5}
              value={field.value || ""}
            />
          </FormControl>
          <div className="text-sm text-muted-foreground">
            {t("player.form.biographyWordCount", { count: wordCount })}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
