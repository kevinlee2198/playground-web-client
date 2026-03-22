"use client";

import { getInitials } from "@/components/game/player-avatar";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { TypographySmall } from "@/components/ui/typography";
import type { ViewerFollowingPlayers } from "@/lib/types/feed";
import { useTranslations } from "next-intl";

interface FollowingAvatarsProps {
  followingPlayers: ViewerFollowingPlayers;
}

export function FollowingAvatars({ followingPlayers }: FollowingAvatarsProps) {
  const t = useTranslations();

  const { nodes, totalCount } = followingPlayers;

  function buildSummaryText(): string {
    if (nodes.length === 0) {
      return t("feed.youPlayed");
    }

    const name0 = nodes[0].user.displayName;

    if (nodes.length === 1) {
      const othersCount = totalCount - 1;
      if (othersCount === 0) {
        return `${name0} ${t("feed.played")}`;
      }
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      return `${name0} ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")}`;
    }

    const name1 = nodes[1].user.displayName;
    const othersCount = totalCount - 2;
    if (othersCount === 0) {
      return `${name0} ${t("feed.and")} ${name1} ${t("feed.played")}`;
    }
    const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
    return `${name0}, ${name1}, ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")}`;
  }

  const summaryText = buildSummaryText();

  const visiblePlayers = nodes.slice(0, 3);

  return (
    <div className="flex items-center gap-3">
      {visiblePlayers.length > 0 ? (
        <AvatarGroup>
          {visiblePlayers.map((player) => (
            <Avatar key={player.id} size="sm">
              {player.user.profilePicture?.thumbnailUrl ? (
                <AvatarImage
                  src={player.user.profilePicture.thumbnailUrl}
                  alt={player.user.displayName}
                />
              ) : null}
              <AvatarFallback>{getInitials(player.user.displayName)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      ) : null}
      <TypographySmall className="text-muted-foreground font-normal">
        {summaryText}
      </TypographySmall>
    </div>
  );
}
