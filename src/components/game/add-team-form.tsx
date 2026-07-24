"use client";

import { addTeamParticipant } from "@/app/[locale]/game/participant-actions";
import { Button } from "@/components/ui/button";
import { FormTextareaField, FormTextField } from "@/components/ui/form-field";
import type { AddTeamInput } from "@/lib/types/game";
import { useForm } from "@tanstack/react-form";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";
import { z } from "zod";

const addTeamSchema = z.object({
  name: z
    .string()
    .min(1, "Required")
    .max(255, "Team name must be 255 characters or less"),
  description: z
    .string()
    .max(1000, "Description must be 1000 characters or less"),
});

interface AddTeamFormProps {
  gameId: number;
  onSuccess?: () => void;
}

export function AddTeamForm({ gameId, onSuccess }: AddTeamFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
    },
    validators: {
      onBlur: addTeamSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      startTransition(async () => {
        const input: AddTeamInput = {
          gameId,
          name: value.name,
          description: value.description || undefined,
        };

        const result = await addTeamParticipant(input);

        if (result.success) {
          toast.add({ title: t("game.success.participantAdded"), type: "success" });
          form.reset();
          onSuccess?.();
        } else {
          setError(result.message || t("game.errors.participantError"));
          toast.add({ title: result.message || t("game.errors.participantError"), type: "error" });
        }
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
      className="space-y-4"
    >
      <form.Field name="name">
        {(field) => (
          <FormTextField
            field={field}
            label={t("game.participants.teamName")}
            required
            disabled={isPending}
            placeholder="Enter team name"
          />
        )}
      </form.Field>

      <form.Field name="description">
        {(field) => (
          <FormTextareaField
            field={field}
            label={t("game.participants.teamDescription")}
            disabled={isPending}
            placeholder="Enter team description (optional)"
            rows={3}
          />
        )}
      </form.Field>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? t("game.actions.saving")
            : t("game.participants.addTeam")}
        </Button>
      </div>
    </form>
  );
}
