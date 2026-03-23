"use client";

import { TypographySmall } from "@/components/ui/typography";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useState } from "react";

const FollowListDialog = dynamic(
  () =>
    import("./follow-list-dialog").then((m) => m.FollowListDialog),
  { ssr: false },
);

interface FollowCountsProps {
  userId: string;
  followerCount: number;
  followingCount: number;
  isOwnProfile: boolean;
}

export function FollowCounts({
  userId,
  followerCount,
  followingCount,
  isOwnProfile,
}: FollowCountsProps) {
  const t = useTranslations("profile.follow");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<"followers" | "following">(
    "followers",
  );

  function openDialog(type: "followers" | "following") {
    setDialogType(type);
    setDialogOpen(true);
  }

  return (
    <>
      <div className="flex items-center gap-6">
        <button
          type="button"
          onClick={() => openDialog("followers")}
          className="flex min-h-11 items-center gap-1.5 py-3 transition-opacity hover:opacity-70"
        >
          <span className="tabular-nums font-semibold">{followerCount}</span>
          <TypographySmall className="text-muted-foreground">
            {t("followers")}
          </TypographySmall>
        </button>

        <button
          type="button"
          onClick={() => openDialog("following")}
          className="flex min-h-11 items-center gap-1.5 py-3 transition-opacity hover:opacity-70"
        >
          <span className="tabular-nums font-semibold">{followingCount}</span>
          <TypographySmall className="text-muted-foreground">
            {t("followingLabel")}
          </TypographySmall>
        </button>
      </div>

      <FollowListDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={userId}
        type={dialogType}
        isOwnProfile={isOwnProfile}
      />
    </>
  );
}
