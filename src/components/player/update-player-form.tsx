"use client";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { UnitPreference } from "@/lib/constants";
import type { Player, UpdatePlayerInput } from "@/lib/types/player";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg,
} from "@/lib/unit-conversion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import {
  BiographyField,
  countWords,
  NameFields,
  PhysicalFields,
  type PlayerFormInput,
  type PlayerFormOutput,
  playerFormSchema,
  WeightFields,
} from "./player-form-fields";

interface UpdatePlayerFormProps {
  initialData: Player;
  onSubmit: (data: UpdatePlayerInput) => Promise<void>;
  onCancel: () => void;
  isPending?: boolean;
}

export function UpdatePlayerForm({
  initialData,
  onSubmit,
  onCancel,
  isPending = false,
}: UpdatePlayerFormProps) {
  const t = useTranslations();
  const { preference: unitPreference } = useUnitPreference();

  const defaultValues = useMemo(() => {
    const isMetric = unitPreference === UnitPreference.METRIC;
    let heightCm: number | undefined = undefined;
    let heightFeet: number | undefined = undefined;
    let heightInches: number | undefined = undefined;
    let weightKg: number | undefined = undefined;
    let weightLbs: number | undefined = undefined;

    if (initialData.height) {
      if (isMetric) {
        heightCm = initialData.height;
      } else {
        const { feet, inches } = cmToFeetInches(initialData.height);
        heightFeet = feet;
        heightInches = inches;
      }
    }

    if (initialData.weight) {
      if (isMetric) {
        weightKg = initialData.weight;
      } else {
        weightLbs = Math.round(kgToLbs(initialData.weight));
      }
    }

    return {
      firstName: initialData.firstName,
      lastName: initialData.lastName,
      age: initialData.age ?? undefined,
      heightCm,
      heightFeet,
      heightInches,
      weightKg,
      weightLbs,
      biography: initialData.biography ?? "",
    };
  }, [initialData, unitPreference]);

  const form = useForm<PlayerFormInput, unknown, PlayerFormOutput>({
    resolver: zodResolver(playerFormSchema),
    defaultValues,
  });

  const handleFormSubmit = async (values: PlayerFormOutput) => {
    const dirty = form.formState.dirtyFields;
    const input: UpdatePlayerInput = { id: initialData.id };

    if (dirty.firstName) {
      input.firstName = values.firstName;
    }
    if (dirty.lastName) {
      input.lastName = values.lastName;
    }
    if (dirty.age) {
      input.age = values.age ?? null;
    }
    if (dirty.heightCm || dirty.heightFeet || dirty.heightInches) {
      if (unitPreference === UnitPreference.METRIC) {
        input.height = values.heightCm ?? null;
      } else {
        const feet = values.heightFeet ?? 0;
        const inches = values.heightInches ?? 0;
        input.height = feet > 0 || inches > 0 ? feetInchesToCm(feet, inches) : null;
      }
    }
    if (dirty.weightKg || dirty.weightLbs) {
      if (unitPreference === UnitPreference.METRIC) {
        input.weight = values.weightKg ?? null;
      } else {
        input.weight = values.weightLbs ? lbsToKg(values.weightLbs) : null;
      }
    }
    if (dirty.biography) {
      input.biography = values.biography || null;
    }

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
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            {t("actions.cancel")}
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? t("player.actions.saving") : t("actions.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
