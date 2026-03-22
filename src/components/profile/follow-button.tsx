"use client";

import {
  followUser,
  unfollowUser,
} from "@/app/[locale]/user/[username]/actions";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

interface FollowButtonProps {
  userId: string;
  displayName: string;
  initialViewerFollowsUser: boolean;
  onFollowChange?: (viewerFollowsUser: boolean) => void;
}

export function FollowButton({
  userId,
  displayName,
  initialViewerFollowsUser,
  onFollowChange,
}: FollowButtonProps) {
  const t = useTranslations("profile.follow");
  const [isPending, startTransition] = useTransition();
  const [isFollowing, setIsFollowing] = useState(initialViewerFollowsUser);
  const [isHovered, setIsHovered] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    };
  }, []);

  function announce(message: string) {
    if (announcementTimerRef.current) clearTimeout(announcementTimerRef.current);
    setAnnouncement(message);
    announcementTimerRef.current = setTimeout(() => setAnnouncement(""), 1000);
  }

  function executeFollow(previousIsFollowing: boolean) {
    setIsFollowing(true);

    startTransition(async () => {
      const result = await followUser(userId);

      if (result.success) {
        setIsFollowing(result.user.viewerFollowsUser);
        announce(t("nowFollowing", { name: displayName }));
        onFollowChange?.(true);
      } else {
        setIsFollowing(previousIsFollowing);
        toast.error(t("error"));
      }
    });
  }

  function handleFollow() {
    executeFollow(isFollowing);
  }

  function handleUnfollow() {
    const previousIsFollowing = isFollowing;
    setIsFollowing(false);
    setIsHovered(false);

    startTransition(async () => {
      const result = await unfollowUser(userId);

      if (result.success) {
        setIsFollowing(result.user.viewerFollowsUser);
        onFollowChange?.(false);

        if (result.wasMutualFollow) {
          toast(t("unfollowedUndo", { name: displayName }), {
            duration: 5000,
            action: {
              label: t("undo"),
              onClick: () => executeFollow(false),
            },
          });
        } else {
          announce(t("unfollowedName", { name: displayName }));
        }
      } else {
        setIsFollowing(previousIsFollowing);
        toast.error(t("error"));
      }
    });
  }

  const buttonText = isFollowing
    ? isHovered
      ? t("unfollow")
      : t("following")
    : t("follow");

  const ariaLabel = isFollowing
    ? `${t("unfollow")} ${displayName}`
    : `${t("follow")} ${displayName}`;

  return (
    <>
      <span className="sr-only" aria-live="polite" role="status">
        {announcement}
      </span>

      <Button
        variant={
          isFollowing ? (isHovered ? "destructive" : "outline") : "default"
        }
        onClick={isFollowing ? handleUnfollow : handleFollow}
        disabled={isPending}
        aria-label={ariaLabel}
        aria-pressed={isFollowing}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="min-w-[6rem]"
      >
        {isPending ? (
          <span className="mr-2 inline-flex h-4 w-4 animate-spin">
            <Loader2 className="h-4 w-4" />
          </span>
        ) : null}
        {buttonText}
      </Button>
    </>
  );
}
