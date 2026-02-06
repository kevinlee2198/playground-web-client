"use client";

import { updateGame } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { SportType } from "@/lib/constants";
import type { GameMetadata, UpdateGameInput } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface UpdateGameFormProps {
  gameId: number;
  currentStartDate: string;
  metadata: GameMetadata;
  sportType: SportType;
  onSuccess?: () => void;
}

export function UpdateGameForm({
  gameId,
  currentStartDate,
  metadata,
  sportType,
  onSuccess,
}: UpdateGameFormProps) {
  const t = useTranslations();
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const updateGameSchema = z.object({
    startDate: z.date({
      message: t("game.validation.startDateRequired"),
    }),
    // Advanced options
    periods: z
      .number()
      .int()
      .positive({ message: t("game.validation.periodsPositive") })
      .optional(),
    bestOf: z
      .number()
      .refine((v) => v === 3 || v === 5, {
        message: t("game.validation.bestOfRequired"),
      })
      .optional(),
    tiebreakFinalSet: z.boolean().optional(),
  });

  type FormData = z.infer<typeof updateGameSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(updateGameSchema),
    defaultValues: {
      startDate: new Date(currentStartDate),
      periods:
        metadata.__typename === "BasketballGameMetadata" ||
        metadata.__typename === "FootballGameMetadata"
          ? (metadata.periods ?? undefined)
          : undefined,
      bestOf:
        metadata.__typename === "TennisGameMetadata"
          ? metadata.bestOf
          : undefined,
      tiebreakFinalSet:
        metadata.__typename === "TennisGameMetadata"
          ? metadata.tiebreakFinalSet
          : undefined,
    },
  });

  const handleSubmit = async (values: FormData) => {
    setError(null);

    startTransition(async () => {
      const input: UpdateGameInput = {
        id: gameId,
        startDate: values.startDate.toISOString(),
      };

      // Only include metadata if values changed
      const originalPeriods =
        metadata.__typename === "BasketballGameMetadata" ||
        metadata.__typename === "FootballGameMetadata"
          ? metadata.periods
          : null;
      const originalBestOf =
        metadata.__typename === "TennisGameMetadata" ? metadata.bestOf : null;
      const originalTiebreakFinalSet =
        metadata.__typename === "TennisGameMetadata"
          ? metadata.tiebreakFinalSet
          : null;

      const periodsChanged = values.periods !== originalPeriods;
      const bestOfChanged = values.bestOf !== originalBestOf;
      const tiebreakChanged =
        values.tiebreakFinalSet !== originalTiebreakFinalSet;

      if (periodsChanged || bestOfChanged || tiebreakChanged) {
        input.metadata = {};

        if (sportType === "BASKETBALL") {
          input.metadata.basketball = {};
          if (periodsChanged && values.periods !== undefined) {
            input.metadata.basketball.periods = values.periods;
          }
        } else if (sportType === "FOOTBALL") {
          input.metadata.football = {};
          if (periodsChanged && values.periods !== undefined) {
            input.metadata.football.periods = values.periods;
          }
        } else if (sportType === "TENNIS") {
          input.metadata.tennis = {};
          if (bestOfChanged && values.bestOf !== undefined) {
            input.metadata.tennis.bestOf = values.bestOf;
          }
          if (tiebreakChanged && values.tiebreakFinalSet !== undefined) {
            input.metadata.tennis.tiebreakFinalSet = values.tiebreakFinalSet;
          }
        }
      }

      const result = await updateGame(input);

      if (result.success) {
        toast.success(t("game.success.updated"));
        onSuccess?.();
      } else {
        setError(result.error || t("game.errors.updateError"));
        toast.error(result.error || t("game.errors.updateError"));
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Start Date Field */}
        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => {
            const timeValue = field.value
              ? `${String(field.value.getHours()).padStart(2, "0")}:${String(field.value.getMinutes()).padStart(2, "0")}`
              : "";

            return (
              <FormItem>
                <FormLabel>{t("game.form.startDate")}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        disabled={isPending}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value
                          ? format.dateTime(field.value, {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : t("game.form.selectDate")}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (!date) return;
                        const current = field.value ?? new Date();
                        date.setHours(current.getHours(), current.getMinutes());
                        field.onChange(date);
                      }}
                      disabled={isPending}
                    />
                    <div className="border-t p-3">
                      <Input
                        type="time"
                        disabled={isPending}
                        value={timeValue}
                        onChange={(e) => {
                          const [hours, minutes] = e.target.value
                            .split(":")
                            .map(Number);
                          const updated = new Date(field.value ?? new Date());
                          updated.setHours(hours, minutes);
                          field.onChange(updated);
                        }}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Advanced Options */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="link" type="button" className="px-0">
              {t("game.form.advancedOptions")}
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2">
            {/* Basketball / Football: periods */}
            {(sportType === "BASKETBALL" || sportType === "FOOTBALL") && (
              <FormField
                control={form.control}
                name="periods"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.form.periods")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder={sportType === "BASKETBALL" ? "4" : "4"}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? Number(e.target.value) : undefined,
                          )
                        }
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tennis: bestOf + tiebreakFinalSet */}
            {sportType === "TENNIS" && (
              <>
                <FormField
                  control={form.control}
                  name="bestOf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("game.form.bestOf")}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.toString()}
                          onValueChange={(v) => field.onChange(Number(v))}
                          disabled={isPending}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={t("game.form.bestOfPlaceholder")}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tiebreakFinalSet"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch
                          checked={field.value ?? true}
                          onCheckedChange={field.onChange}
                          disabled={isPending}
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">
                        {t("game.form.tiebreakFinalSet")}
                      </FormLabel>
                    </FormItem>
                  )}
                />
              </>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Error message */}
        {error && (
          <div className="rounded-md border border-destructive bg-destructive/10 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? t("game.actions.saving") : t("actions.save")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
