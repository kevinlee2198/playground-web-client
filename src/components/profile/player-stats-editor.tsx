"use client";

import {
  createPlayer,
  updatePlayer,
} from "@/app/[locale]/user/[username]/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TypographyP } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

export interface PlayerStatsEditorProps {
  initialPlayer: {
    id: number;
    age: number | null;
    height: number | null;
    weight: number | null;
  } | null;
}

function formatHeight(cm: number | null): string | null {
  if (cm == null) return null;
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

function formatWeight(kg: number | null): string | null {
  if (kg == null) return null;
  return `${Math.round(kg)} kg`;
}

function StatCardView({ label, value }: { label: string; value: string | null }) {
  return (
    <div
      className={cn(
        "text-center rounded-lg p-4",
        value == null && "border-2 border-dashed border-muted",
      )}
    >
      <TypographyP className="text-sm text-muted-foreground">{label}</TypographyP>
      <TypographyP
        className={cn(
          "text-2xl font-semibold",
          value == null && "text-muted-foreground",
        )}
      >
        {value ?? "\u2014"}
      </TypographyP>
    </div>
  );
}

interface StatCardEditProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

function StatCardEdit({
  label,
  value,
  onChange,
  placeholder,
  inputRef,
  onKeyDown,
}: StatCardEditProps) {
  return (
    <div className="text-center rounded-lg border-2 border-primary/30 p-4">
      <TypographyP className="text-sm text-muted-foreground mb-2">
        {label}
      </TypographyP>
      <Input
        ref={inputRef}
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={label}
        className="text-center text-lg font-semibold"
        min={0}
      />
    </div>
  );
}

function parseOptionalNumber(val: string): number | undefined {
  const trimmed = val.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return isNaN(n) ? undefined : n;
}

export function PlayerStatsEditor({ initialPlayer }: PlayerStatsEditorProps) {
  const t = useTranslations("profile.stats");
  const tProfile = useTranslations("profile");
  const [player, setPlayer] = useState(initialPlayer);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [ageInput, setAgeInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [weightInput, setWeightInput] = useState("");

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);

  const isCreating = player == null;

  const enterEditMode = () => {
    setAgeInput(player?.age != null ? String(player.age) : "");
    setHeightInput(player?.height != null ? String(player.height) : "");
    setWeightInput(player?.weight != null ? String(player.weight) : "");
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => firstInputRef.current?.focus());
    }
  }, [isEditing]);

  const handleCancel = () => {
    setIsEditing(false);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const handleSave = () => {
    startTransition(async () => {
      const age = parseOptionalNumber(ageInput);
      const height = parseOptionalNumber(heightInput);
      const weight = parseOptionalNumber(weightInput);

      if (isCreating) {
        const result = await createPlayer({ age, height, weight });
        if (!result.success) {
          toast.error(result.message ?? t("error"));
          return;
        }
        if (result.player) {
          setPlayer(result.player);
        }
        setIsEditing(false);
        requestAnimationFrame(() => editButtonRef.current?.focus());
        toast.success(t("created"));
        return;
      }

      // PATCH semantics: only send fields that changed
      const input: {
        id: number;
        age?: number | null;
        height?: number | null;
        weight?: number | null;
      } = { id: player.id };
      const newAge = age ?? null;
      const newHeight = height ?? null;
      const newWeight = weight ?? null;
      if (newAge !== player.age) input.age = newAge;
      if (newHeight !== player.height) input.height = newHeight;
      if (newWeight !== player.weight) input.weight = newWeight;

      const result = await updatePlayer(input);
      if (!result.success) {
        toast.error(result.message ?? t("error"));
        return;
      }
      if (result.player) {
        setPlayer(result.player);
      }
      setIsEditing(false);
      requestAnimationFrame(() => editButtonRef.current?.focus());
      toast.success(t("saved"));
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleCancel();
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  // No player profile yet -- show creation prompt
  if (player == null && !isEditing) {
    return (
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-4">
              <TypographyP className="text-muted-foreground text-sm">
                {t("addStats")}
              </TypographyP>
              <Button ref={editButtonRef} variant="outline" size="sm" onClick={enterEditMode}>
                {t("createPlayer")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // Edit mode -- shared between create and update
  if (isEditing) {
    const submitLabel = isCreating ? t("createPlayer") : t("save");
    const pendingLabel = isCreating ? t("creating") : t("saving");

    return (
      <section className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-4">
              <StatCardEdit
                label={t("age")}
                value={ageInput}
                onChange={setAgeInput}
                placeholder={t("agePlaceholder")}
                inputRef={firstInputRef}
                onKeyDown={handleKeyDown}
              />
              <StatCardEdit
                label={t("height")}
                value={heightInput}
                onChange={setHeightInput}
                placeholder={t("heightPlaceholder")}
                onKeyDown={handleKeyDown}
              />
              <StatCardEdit
                label={t("weight")}
                value={weightInput}
                onChange={setWeightInput}
                placeholder={t("weightPlaceholder")}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={isPending} size="sm">
                {isPending ? (
                  <>
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    {pendingLabel}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isPending}
              >
                {tProfile("cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    );
  }

  // View mode -- shows current stats (or dashes when empty)
  // player is guaranteed non-null: the null+!editing case returns above,
  // and the editing case returns above that. Guard satisfies TypeScript.
  if (player == null) return null;

  return (
    <section className="mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("title")}</CardTitle>
          <Button ref={editButtonRef} variant="outline" size="sm" onClick={enterEditMode}>
            <Pencil className="mr-1 h-3 w-3" />
            {t("edit")}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <StatCardView
              label={t("age")}
              value={player.age != null ? `${player.age} ${t("years")}` : null}
            />
            <StatCardView
              label={t("height")}
              value={formatHeight(player.height)}
            />
            <StatCardView
              label={t("weight")}
              value={formatWeight(player.weight)}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
