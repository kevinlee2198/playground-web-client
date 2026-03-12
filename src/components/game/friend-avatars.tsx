"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { TypographySmall } from "@/components/ui/typography";
import type { FeedPlayerNode } from "@/lib/types/feed";
import { useTranslations } from "next-intl";

interface FriendAvatarsProps {
  friends: FeedPlayerNode[];
  totalCount: number;
}

function getInitials(player: FeedPlayerNode): string {
  return `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase();
}

function getDisplayName(player: FeedPlayerNode): string {
  return player.user.displayName ?? `${player.firstName} ${player.lastName}`;
}

export function FriendAvatars({
  friends,
  totalCount,
}: FriendAvatarsProps) {
  const t = useTranslations();

  let summaryText: string;
  if (friends.length === 0) {
    summaryText = t("feed.youPlayed");
  } else if (friends.length === 1) {
    const othersCount = totalCount - 1;
    if (othersCount > 0) {
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      summaryText = `${getDisplayName(friends[0])} ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")}`;
    } else {
      summaryText = `${getDisplayName(friends[0])} ${t("feed.played")}`;
    }
  } else {
    const othersCount = totalCount - 2;
    if (othersCount > 0) {
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      summaryText = `${getDisplayName(friends[0])}, ${getDisplayName(friends[1])}, ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")}`;
    } else {
      summaryText = `${getDisplayName(friends[0])} ${t("feed.and")} ${getDisplayName(friends[1])} ${t("feed.played")}`;
    }
  }

  const visibleFriends = friends.slice(0, 3);

  return (
    <div className="flex items-center gap-3">
      {visibleFriends.length > 0 ? (
        <AvatarGroup>
          {visibleFriends.map((friend) => (
            <Avatar key={friend.id} size="sm">
              {friend.user.profilePicture?.thumbnailUrl ? (
                <AvatarImage
                  src={friend.user.profilePicture.thumbnailUrl}
                  alt={getDisplayName(friend)}
                />
              ) : null}
              <AvatarFallback>{getInitials(friend)}</AvatarFallback>
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
