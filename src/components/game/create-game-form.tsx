"use client";

import { createGame } from "@/app/[locale]/game/actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useRouter } from "@/i18n/navigation";
import {
  getSubtypes,
  SportSubtype,
  SportType,
} from "@/lib/constants";
import type { CreateGameInput } from "@/lib/types/game";

const sportTypeKeys = Object.keys(SportType) as [SportType, ...SportType[]];
const sportSubtypeKeys = Object.values(SportSubtype) as [SportSubtype, ...SportSubtype[]];
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface CreateGameFormProps {
  onSuccess?: () => void;
}

export function CreateGameForm({ onSuccess }: CreateGameFormProps) {
  const t = useTranslations();
  const format = useFormatter();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Create zod schema with translations
  const createGameSchema = z
    .object({
      sportType: z.enum(sportTypeKeys, {
        message: t("game.validation.sportTypeRequired"),
      }),
      subtype: z.enum(sportSubtypeKeys, {
        message: t("game.validation.subtypeRequired"),
      }),
      startDate: z.date({
        message: t("game.validation.startDateRequired"),
      }),
    })
    .refine(
      (data) => {
        if (!data.sportType || !data.subtype) return true;
        const validSubtypes = getSubtypes(data.sportType as SportType);
        return (validSubtypes as readonly SportSubtype[]).includes(data.subtype);
      },
      {
        message: t("game.validation.invalidSubtype"),
        path: ["subtype"],
      },
    );

  type FormData = z.infer<typeof createGameSchema>;

  const form = useForm<FormData>({
    resolver: zodResolver(createGameSchema),
    defaultValues: {
      sportType: undefined,
      subtype: undefined,
      startDate: new Date(),
    },
  });

  // Watch sport type to reset subtype when sport changes
  const selectedSportType = form.watch("sportType");

  useEffect(() => {
    // Reset subtype when sport type changes
    form.setValue("subtype", "" as SportSubtype);
  }, [selectedSportType, form]);

  const handleSubmit = async (values: FormData) => {
    setError(null);

    startTransition(async () => {
      const input: CreateGameInput = {
        sportType: values.sportType as SportType,
        subtype: values.subtype,
        startDate: values.startDate.toISOString(),
      };

      const result = await createGame(input);

      if (result.success && result.gameId) {
        toast.success(t("game.success.created"));
        router.push(`/game/${result.gameId}`);
        onSuccess?.();
      } else {
        setError(result.error || t("game.errors.createError"));
        toast.error(result.error || t("game.errors.createError"));
      }
    });
  };

  // Get available subtypes for the selected sport
  const availableSubtypes =
    selectedSportType && selectedSportType in SportType
      ? getSubtypes(selectedSportType as SportType)
      : [];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* Sport Type Field */}
        <FormField
          control={form.control}
          name="sportType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("game.form.sportType")}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("game.form.selectSport")} />
                  </SelectTrigger>
                  <SelectContent>
                    {sportTypeKeys.map((sport) => (
                      <SelectItem key={sport} value={sport}>
                        {t(`sports.${sport}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sport Subtype Field */}
        <FormField
          control={form.control}
          name="subtype"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("game.form.sportSubtype")}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isPending || !selectedSportType}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("game.form.selectFormat")} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubtypes.map((subtype) => (
                      <SelectItem key={subtype} value={subtype}>
                        {t(`sportSubtypes.${subtype}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                        date.setHours(
                          current.getHours(),
                          current.getMinutes(),
                        );
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
            {isPending ? t("game.actions.saving") : t("game.actions.create")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
