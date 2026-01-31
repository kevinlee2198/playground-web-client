"use client";

import { saveBasketballBoxScore } from "@/app/[locale]/game/box-score-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
import type { SaveBasketballBoxScoreInput } from "@/lib/types/stats/basketball";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

interface BasketballBoxScoreFormProps {
  gameId: number;
  initialData: BasketballBoxScoreNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BasketballBoxScoreForm({
  gameId,
  initialData,
  open,
  onOpenChange,
}: BasketballBoxScoreFormProps) {
  const t = useTranslations();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Schema for form validation (strings for input fields)
  const basketballBoxScoreSchema = z.object({
    assists: z.string().optional(),
    steals: z.string().optional(),
    blocks: z.string().optional(),
    turnovers: z.string().optional(),
    personalFouls: z.string().optional(),
    offensiveRebounds: z.string().optional(),
    defensiveRebounds: z.string().optional(),
    threePointersMade: z.string().optional(),
    threePointersAttempted: z.string().optional(),
    twoPointersMade: z.string().optional(),
    twoPointersAttempted: z.string().optional(),
    freeThrowsMade: z.string().optional(),
    freeThrowsAttempted: z.string().optional(),
  });

  type FormData = z.infer<typeof basketballBoxScoreSchema>;

  // Helper to convert string to number or null
  const toNumber = (val: string | undefined): number | null => {
    if (!val || val === "") return null;
    const num = parseInt(val, 10);
    return isNaN(num) || num < 0 ? null : num;
  };

  const form = useForm<FormData>({
    resolver: zodResolver(basketballBoxScoreSchema),
    defaultValues: {
      assists: initialData.assists?.toString() ?? "",
      steals: initialData.steals?.toString() ?? "",
      blocks: initialData.blocks?.toString() ?? "",
      turnovers: initialData.turnovers?.toString() ?? "",
      personalFouls: initialData.personalFouls?.toString() ?? "",
      offensiveRebounds: initialData.offensiveRebounds?.toString() ?? "",
      defensiveRebounds: initialData.defensiveRebounds?.toString() ?? "",
      threePointersMade: initialData.threePointersMade?.toString() ?? "",
      threePointersAttempted: initialData.threePointersAttempted?.toString() ?? "",
      twoPointersMade: initialData.twoPointersMade?.toString() ?? "",
      twoPointersAttempted: initialData.twoPointersAttempted?.toString() ?? "",
      freeThrowsMade: initialData.freeThrowsMade?.toString() ?? "",
      freeThrowsAttempted: initialData.freeThrowsAttempted?.toString() ?? "",
    },
  });

  const handleSubmit = async (values: FormData) => {
    setError(null);

    // Convert string values to numbers for the API
    const threePointersMade = toNumber(values.threePointersMade);
    const threePointersAttempted = toNumber(values.threePointersAttempted);
    const twoPointersMade = toNumber(values.twoPointersMade);
    const twoPointersAttempted = toNumber(values.twoPointersAttempted);
    const freeThrowsMade = toNumber(values.freeThrowsMade);
    const freeThrowsAttempted = toNumber(values.freeThrowsAttempted);

    // Validate made <= attempted
    if (
      threePointersMade !== null &&
      threePointersAttempted !== null &&
      threePointersMade > threePointersAttempted
    ) {
      setError("3PT made cannot exceed attempted");
      return;
    }
    if (
      twoPointersMade !== null &&
      twoPointersAttempted !== null &&
      twoPointersMade > twoPointersAttempted
    ) {
      setError("2PT made cannot exceed attempted");
      return;
    }
    if (
      freeThrowsMade !== null &&
      freeThrowsAttempted !== null &&
      freeThrowsMade > freeThrowsAttempted
    ) {
      setError("FT made cannot exceed attempted");
      return;
    }

    startTransition(async () => {
      const input: SaveBasketballBoxScoreInput = {
        playerId: initialData.player.id,
        gameId,
        assists: toNumber(values.assists),
        steals: toNumber(values.steals),
        blocks: toNumber(values.blocks),
        turnovers: toNumber(values.turnovers),
        personalFouls: toNumber(values.personalFouls),
        offensiveRebounds: toNumber(values.offensiveRebounds),
        defensiveRebounds: toNumber(values.defensiveRebounds),
        threePointersMade,
        threePointersAttempted,
        twoPointersMade,
        twoPointersAttempted,
        freeThrowsMade,
        freeThrowsAttempted,
      };

      const result = await saveBasketballBoxScore(input);

      if (result.success) {
        toast.success(t("game.success.boxScoresSaved"));
        onOpenChange(false);
      } else {
        setError(result.error || t("game.errors.boxScoreError"));
        toast.error(result.error || t("game.errors.boxScoreError"));
      }
    });
  };

  const playerName = `${initialData.player.firstName} ${initialData.player.lastName}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("game.boxScore.editBoxScores")} - {playerName}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Assists */}
              <FormField
                control={form.control}
                name="assists"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.assists")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Steals */}
              <FormField
                control={form.control}
                name="steals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.steals")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Blocks */}
              <FormField
                control={form.control}
                name="blocks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.blocks")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Turnovers */}
              <FormField
                control={form.control}
                name="turnovers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.turnovers")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Personal Fouls */}
              <FormField
                control={form.control}
                name="personalFouls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.personalFouls")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Offensive Rebounds */}
              <FormField
                control={form.control}
                name="offensiveRebounds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.offensiveRebounds")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Defensive Rebounds */}
              <FormField
                control={form.control}
                name="defensiveRebounds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("game.boxScore.basketball.defensiveRebounds")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="0"
                        disabled={isPending}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Three Pointers Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("game.boxScore.basketball.threePointers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="threePointersMade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Made</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={isPending}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="threePointersAttempted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attempted</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={isPending}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Two Pointers Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("game.boxScore.basketball.twoPointers")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="twoPointersMade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Made</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={isPending}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="twoPointersAttempted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attempted</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={isPending}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Free Throws Section */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t("game.boxScore.basketball.freeThrows")}</h4>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="freeThrowsMade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Made</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={isPending}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="freeThrowsAttempted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attempted</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min="0"
                          disabled={isPending}
                          placeholder="0"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                {t("actions.cancel")}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t("game.actions.saving") : t("actions.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
