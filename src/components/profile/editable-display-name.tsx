"use client";

import { updateUser } from "@/app/[locale]/user/[username]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Loader2, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

interface EditableDisplayNameProps {
  initialDisplayName: string;
}

export function EditableDisplayName({
  initialDisplayName,
}: EditableDisplayNameProps) {
  const t = useTranslations("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [inputValue, setInputValue] = useState(initialDisplayName);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);

  const handleEdit = () => {
    setInputValue(displayName);
    setIsEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue(displayName);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  const handleSave = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const previousDisplayName = displayName;
    setDisplayName(trimmed);
    setStatusMessage(null);

    startTransition(async () => {
      const result = await updateUser({ displayName: trimmed });
      if (!result.success) {
        setDisplayName(previousDisplayName);
        setInputValue(trimmed);
        setStatusMessage(result.message ?? t("errors.loadError"));
        toast.error(result.message ?? t("errors.loadError"));
      } else {
        setIsEditing(false);
        requestAnimationFrame(() => editButtonRef.current?.focus());
        if (result.user) {
          setDisplayName(result.user.displayName);
        }
        setStatusMessage(t("displayName.saved"));
        toast.success(t("displayName.saved"));
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const isSaveDisabled = !inputValue.trim() || isPending;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-3xl font-bold tracking-tight h-auto py-1 px-2"
          aria-label={t("displayName.editLabel")}
          disabled={isPending}
        />
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaveDisabled}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                {t("displayName.saving")}
              </>
            ) : (
              t("displayName.save")
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
          "flex cursor-pointer items-center gap-2 rounded-md text-left",
          "min-h-[44px] min-w-[44px]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        )}
        aria-label={t("displayName.editLabel")}
        type="button"
      >
        <h1 className="text-3xl font-bold tracking-tight">{displayName}</h1>
        <Pencil className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground shrink-0" />
      </button>
      <span aria-live="polite" className="sr-only">
        {statusMessage}
      </span>
    </div>
  );
}
