"use client";

import { updateGame } from "@/app/[locale]/game/actions";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import type { SportType } from "@/lib/constants";
import type { GameMetadata, UpdateGameInput } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
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
  metadata: _metadata,
  sportType: _sportType,
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
  });

  type FormData = z.infer<typeof updateGameSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(updateGameSchema),
    defaultValues: {
      startDate: new Date(currentStartDate),
    },
  });

  const handleSubmit = async (values: FormData) => {
    setError(null);

    startTransition(async () => {
      const input: UpdateGameInput = {
        id: gameId,
        startDate: values.startDate.toISOString(),
      };

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
