"use client";

import { unblockUser } from "@/app/[locale]/user/[username]/actions";
import { Button } from "@/components/ui/button";
import { TypographyMuted, TypographyP } from "@/components/ui/typography";
import { Loader2, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

export interface BlockedUserEntry {
  userId: number;
  displayName: string;
  username: string;
}

function BlockedUserItem({ entry }: { entry: BlockedUserEntry }) {
  const t = useTranslations("settings.blocked");
  const [isPending, startTransition] = useTransition();
  const [isUnblocked, setIsUnblocked] = useState(false);

  const handleUnblock = () => {
    startTransition(async () => {
      const result = await unblockUser(entry.userId);
      if (result.success) {
        setIsUnblocked(true);
        toast.success(t("unblockSuccess"));
      } else {
        toast.error(t("unblockError"));
      }
    });
  };

  if (isUnblocked) {
    return null;
  }

  return (
    <div className="flex items-center justify-between rounded-lg border px-4 py-3">
      <TypographyP className="font-medium">{entry.displayName}</TypographyP>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUnblock}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldOff className="mr-2 h-4 w-4" />
        )}
        {t("unblock")}
      </Button>
    </div>
  );
}

interface BlockedUsersListProps {
  entries: BlockedUserEntry[];
}

export function BlockedUsersList({ entries }: BlockedUsersListProps) {
  const t = useTranslations("settings.blocked");

  if (entries.length === 0) {
    return (
      <TypographyMuted>{t("empty")}</TypographyMuted>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map((entry) => (
        <BlockedUserItem key={entry.userId} entry={entry} />
      ))}
    </div>
  );
}
