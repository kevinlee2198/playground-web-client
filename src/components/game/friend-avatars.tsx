"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { TypographySmall } from "@/components/ui/typography";
import type { SportType } from "@/lib/constants";
import type { FeedPlayerNode } from "@/lib/types/feed";
import { useTranslations } from "next-intl";

interface FriendAvatarsProps {
  friends: FeedPlayerNode[];
  totalCount: number;
  sportType: SportType;
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
  sportType,
}: FriendAvatarsProps) {
  const t = useTranslations();

  const sportLabel = t(`sports.${sportType}`);

  let summaryText: string;
  if (friends.length === 0) {
    summaryText = `${t("feed.youPlayed")} ${sportLabel}`;
  } else if (friends.length === 1) {
    const othersCount = totalCount - 1;
    if (othersCount > 0) {
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      summaryText = `${getDisplayName(friends[0])} ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")} ${sportLabel}`;
    } else {
      summaryText = `${getDisplayName(friends[0])} ${t("feed.played")} ${sportLabel}`;
    }
  } else {
    const othersCount = totalCount - 2;
    if (othersCount > 0) {
      const othersKey = othersCount === 1 ? "feed.other" : "feed.others";
      summaryText = `${getDisplayName(friends[0])}, ${getDisplayName(friends[1])}, ${t("feed.and")} ${othersCount} ${t(othersKey)} ${t("feed.played")} ${sportLabel}`;
    } else {
      summaryText = `${getDisplayName(friends[0])} ${t("feed.and")} ${getDisplayName(friends[1])} ${t("feed.played")} ${sportLabel}`;
    }
  }

  // Show up to 3 avatars to avoid visual clutter
  const visibleFriends = friends.slice(0, 3);

  return (
    <div className="flex items-center gap-3">
      {visibleFriends.length > 0 && (
        <AvatarGroup>
          {visibleFriends.map((friend) => (
            <Avatar key={friend.id} size="sm">
              {friend.user.profilePicture?.thumbnailUrl && (
                <AvatarImage
                  src={friend.user.profilePicture.thumbnailUrl}
                  alt={getDisplayName(friend)}
                />
              )}
              <AvatarFallback>{getInitials(friend)}</AvatarFallback>
            </Avatar>
          ))}
        </AvatarGroup>
      )}
      <TypographySmall className="text-muted-foreground font-normal">
        {summaryText}
      </TypographySmall>
    </div>
  );
}
