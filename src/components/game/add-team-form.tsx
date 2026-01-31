"use client";

import { addTeamParticipant } from "@/app/[locale]/game/participant-actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AddTeamInput } from "@/lib/types/game";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface AddTeamFormProps {
  gameId: number;
  onSuccess?: () => void;
}

export function AddTeamForm({ gameId, onSuccess }: AddTeamFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const addTeamSchema = z.object({
    name: z
      .string()
      .min(1, t("game.validation.teamNameRequired"))
      .max(255, "Team name must be 255 characters or less"),
    description: z.string().max(1000, "Description must be 1000 characters or less").optional(),
  });

  type FormData = z.infer<typeof addTeamSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(addTeamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const handleSubmit = async (values: FormData) => {
    setError(null);

    startTransition(async () => {
      const input: AddTeamInput = {
        gameId,
        name: values.name,
        description: values.description || undefined,
      };

      const result = await addTeamParticipant(input);

      if (result.success) {
        toast.success(t("game.success.participantAdded"));
        form.reset();
        onSuccess?.();
      } else {
        setError(result.error || t("game.errors.participantError"));
        toast.error(result.error || t("game.errors.participantError"));
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Team Name Field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("game.participants.teamName")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  disabled={isPending}
                  placeholder="Enter team name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Team Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("game.participants.teamDescription")}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  disabled={isPending}
                  placeholder="Enter team description (optional)"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Error message */}
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? t("game.actions.saving") : t("game.participants.addTeam")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
