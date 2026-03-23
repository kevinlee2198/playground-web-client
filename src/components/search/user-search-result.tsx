"use client";

import { FollowButton } from "@/components/profile/follow-button";
import { FollowsYouBadge } from "@/components/profile/follows-you-badge";
import { Link } from "@/i18n/navigation";
import type { UserSearchNode } from "@/lib/types/user";
import { cn } from "@/lib/utils";

interface UserSearchResultProps {
  user: UserSearchNode;
  isHighlighted?: boolean;
  isAuthenticated?: boolean;
  onClick?: () => void;
}

export function UserSearchResult({
  user,
  isHighlighted,
  isAuthenticated = false,
  onClick,
}: UserSearchResultProps) {
  const showFollowControls =
    isAuthenticated && user.viewerFollowsUser !== null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted",
        isHighlighted && "bg-muted",
      )}
    >
      <Link
        href={`/user/${user.username}`}
        onClick={onClick}
        className="flex min-w-0 flex-1 flex-col"
      >
        <span className="truncate text-sm font-medium">{user.displayName}</span>
        <span className="truncate text-xs text-muted-foreground">
          @{user.username}
        </span>
      </Link>

      {showFollowControls && (
        <div className="flex shrink-0 items-center gap-2">
          {user.userFollowsViewer === true && <FollowsYouBadge />}
          <FollowButton
            userId={user.id}
            displayName={user.displayName}
            initialViewerFollowsUser={user.viewerFollowsUser!}
          />
        </div>
      )}
    </div>
  );
}
