"use client";

import { getInitials } from "@/components/ui/user-avatar";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { TypographySmall } from "@/components/ui/typography";
import type { ViewerFollowingUsers } from "@/lib/types/feed";
import { useTranslations } from "next-intl";

interface FollowingAvatarsProps {
  followingUsers: ViewerFollowingUsers;
}

export function FollowingAvatars({ followingUsers }: FollowingAvatarsProps) {
  const t = useTranslations();

  const { nodes } = followingUsers;

  // Backend caps `nodes` at 10 and no longer exposes a total count for this
  // field. For v1 migration we use "and others played" instead of the prior
  // "Sarah, Kevin, and 3 others played" pattern. Revisit with a dedicated
  // copy decision if product wants the count back.
  function buildSummaryText(): string {
    if (nodes.length === 0) {
      return t("feed.youPlayed");
    }

    const name0 = nodes[0].displayName;

    if (nodes.length === 1) {
      return `${name0} ${t("feed.played")}`;
    }

    const name1 = nodes[1].displayName;

    if (nodes.length === 2) {
      return `${name0} ${t("feed.and")} ${name1} ${t("feed.played")}`;
    }

    return `${name0}, ${name1}, ${t("feed.and")} ${t("feed.others")} ${t("feed.played")}`;
  }

  const summaryText = buildSummaryText();

  const visibleUsers = nodes.slice(0, 3);

  return (
    <div className="flex items-center gap-3">
      {visibleUsers.length > 0 ? (
        <AvatarGroup>
          {visibleUsers.map((user) => (
            <Avatar key={user.id} size="sm">
              {user.profilePicture?.thumbnailUrl ? (
                <AvatarImage
                  src={user.profilePicture.thumbnailUrl}
                  alt={user.displayName}
                />
              ) : null}
              <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
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
