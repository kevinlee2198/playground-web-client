"use client";

import type { FollowStateChange } from "@/lib/types/follow";
import { useState } from "react";
import { FollowActions } from "./follow-actions";
import { FollowCounts } from "./follow-counts";

interface ProfileInteractiveSectionProps {
  userId: string;
  displayName: string;
  initialFollowerCount: number;
  initialFollowingCount: number;
  initialViewerFollowsUser: boolean;
  initialUserFollowsViewer: boolean;
  initialViewerSentFollowRequest: { id: string } | null;
  isOwnProfile: boolean;
}

export function ProfileInteractiveSection({
  userId,
  displayName,
  initialFollowerCount,
  initialFollowingCount,
  initialViewerFollowsUser,
  initialUserFollowsViewer,
  initialViewerSentFollowRequest,
  isOwnProfile,
}: ProfileInteractiveSectionProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [viewerFollowsUser, setViewerFollowsUser] = useState(
    initialViewerFollowsUser,
  );

  function handleFollowChange(change: FollowStateChange) {
    if (change.type === "followed") {
      setFollowerCount((prev) => prev + 1);
      setViewerFollowsUser(true);
    } else if (change.type === "unfollowed") {
      setFollowerCount((prev) => prev - 1);
      setViewerFollowsUser(false);
    }
    // "requested" and "cancelled" don't change follower counts
  }

  return (
    <div className="flex flex-col gap-4">
      <FollowCounts
        userId={userId}
        followerCount={followerCount}
        followingCount={initialFollowingCount}
        isOwnProfile={isOwnProfile}
      />
      {!isOwnProfile ? (
        <FollowActions
          userId={userId}
          displayName={displayName}
          viewerFollowsUser={viewerFollowsUser}
          userFollowsViewer={initialUserFollowsViewer}
          initialViewerSentFollowRequest={initialViewerSentFollowRequest}
          showMessageButton
          onFollowChange={handleFollowChange}
        />
      ) : null}
    </div>
  );
}
