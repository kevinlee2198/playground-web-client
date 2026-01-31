"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { UnitPreference } from "@/lib/constants";
import type { CreatePlayerInput } from "@/lib/types/player";
import { feetInchesToCm, lbsToKg } from "@/lib/unit-conversion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  BiographyField,
  countWords,
  createPlayerFormSchema,
  NameFields,
  PhysicalFields,
  type PlayerFormInput,
  type PlayerFormOutput,
  WeightFields,
} from "./player-form-fields";

interface CreatePlayerFormProps {
  userDefaults?: { firstName: string; lastName: string };
  onSubmit: (data: CreatePlayerInput) => Promise<void>;
  isPending?: boolean;
}

export function CreatePlayerForm({
  userDefaults,
  onSubmit,
  isPending = false,
}: CreatePlayerFormProps) {
  const t = useTranslations();
  const { preference: unitPreference } = useUnitPreference();
  const playerFormSchema = useMemo(() => createPlayerFormSchema(t), [t]);

  const defaultValues = useMemo(
    () => ({
      firstName: userDefaults?.firstName ?? "",
      lastName: userDefaults?.lastName ?? "",
      age: undefined,
      heightCm: undefined,
      heightFeet: undefined,
      heightInches: undefined,
      weightKg: undefined,
      weightLbs: undefined,
      biography: "",
    }),
    [userDefaults],
  );

  const form = useForm<PlayerFormInput, unknown, PlayerFormOutput>({
    resolver: zodResolver(playerFormSchema),
    defaultValues,
  });

  const handleFormSubmit = async (values: PlayerFormOutput) => {
    let height: number | null | undefined = undefined;
    if (unitPreference === UnitPreference.METRIC) {
      height = values.heightCm ?? undefined;
    } else {
      const feet = values.heightFeet ?? 0;
      const inches = values.heightInches ?? 0;
      if (feet > 0 || inches > 0) {
        height = feetInchesToCm(feet, inches);
      }
    }

    let weight: number | null | undefined = undefined;
    if (unitPreference === UnitPreference.METRIC) {
      weight = values.weightKg ?? undefined;
    } else {
      weight = values.weightLbs ? lbsToKg(values.weightLbs) : undefined;
    }

    const input: CreatePlayerInput = {
      firstName: values.firstName,
      lastName: values.lastName,
      age: values.age ?? undefined,
      height,
      weight,
      biography: values.biography || undefined,
    };

    await onSubmit(input);
  };

  const biographyValue = form.watch("biography");
  const wordCount = useMemo(
    () => countWords(biographyValue || ""),
    [biographyValue],
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <NameFields control={form.control} isPending={isPending} />
        <PhysicalFields
          control={form.control}
          isPending={isPending}
          unitPreference={unitPreference}
        />
        <WeightFields
          control={form.control}
          isPending={isPending}
          unitPreference={unitPreference}
        />
        <BiographyField
          control={form.control}
          isPending={isPending}
          wordCount={wordCount}
        />

        <div className="flex justify-end gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t("player.actions.saving")
              : t("player.actions.create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
