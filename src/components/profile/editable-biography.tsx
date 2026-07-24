"use client";

import { updateUser } from "@/app/[locale]/user/[username]/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

const MAX_WORDS = 1000;

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

interface EditableBiographyProps {
  initialBiography: string | null;
}

export function EditableBiography({
  initialBiography,
}: EditableBiographyProps) {
  const t = useTranslations("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [biography, setBiography] = useState<string | null>(initialBiography);
  const [inputValue, setInputValue] = useState(initialBiography ?? "");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const wordCount = countWords(inputValue);

  const handleEdit = () => {
    setInputValue(biography ?? "");
    setIsEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue(biography ?? "");
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    const newBiography = trimmed || null;

    const previousBiography = biography;
    setBiography(newBiography);
    setStatusMessage(null);

    startTransition(async () => {
      const result = await updateUser({ biography: newBiography });
      if (!result.success) {
        setBiography(previousBiography);
        setInputValue(trimmed);
        setStatusMessage(result.message ?? t("errors.loadError"));
        toast.add({ title: result.message ?? t("errors.loadError"), type: "error" });
      } else {
        setIsEditing(false);
        requestAnimationFrame(() => editButtonRef.current?.focus());
        if (result.user) {
          setBiography(result.user.biography);
        }
        setStatusMessage(t("biography.saved"));
        toast.add({ title: t("biography.saved"), type: "success" });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const isOverLimit = wordCount > MAX_WORDS;
  const isSaveDisabled = isPending || isOverLimit;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="resize-none"
          aria-label={t("biography.editLabel")}
          disabled={isPending}
          rows={4}
        />
        <p
          className={cn(
            "text-sm",
            isOverLimit ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {t("biography.wordCount", {
            count: wordCount.toLocaleString(),
            max: MAX_WORDS.toLocaleString(),
          })}
        </p>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={isSaveDisabled}>
            {isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {t("biography.saving")}
              </>
            ) : (
              t("biography.save")
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isPending}
          >
            {t("cancel")}
          </Button>
        </div>
        <span aria-live="polite" className="sr-only">
          {statusMessage}
        </span>
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        ref={editButtonRef}
        onClick={handleEdit}
        className={cn(
          "flex cursor-pointer items-start gap-2 rounded-md text-left",
          "min-h-[44px] min-w-[44px] w-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label={t("biography.editLabel")}
        type="button"
      >
        {biography ? (
          <p className="leading-7 text-sm">{biography}</p>
        ) : (
          <p className="text-muted-foreground text-sm italic">
            {t("biography.placeholder")}
          </p>
        )}
        <Pencil className="mt-0.5 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground" />
      </button>
      <span aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}
