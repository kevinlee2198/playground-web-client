"use client";

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
  isOwnProfile: boolean;
}

export function ProfileInteractiveSection({
  userId,
  displayName,
  initialFollowerCount,
  initialFollowingCount,
  initialViewerFollowsUser,
  initialUserFollowsViewer,
  isOwnProfile,
}: ProfileInteractiveSectionProps) {
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [viewerFollowsUser, setViewerFollowsUser] = useState(
    initialViewerFollowsUser,
  );

  function handleFollowChange(nowFollowing: boolean) {
    setFollowerCount((prev) => prev + (nowFollowing ? 1 : -1));
    setViewerFollowsUser(nowFollowing);
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
          showMessageButton
          onFollowChange={handleFollowChange}
        />
      ) : null}
    </div>
  );
}
