"use client";

import {
  followUser,
  unfollowUser,
} from "@/app/[locale]/user/[username]/actions";
import { cancelFollowRequest } from "@/components/profile/follow-request-actions";
import { Button } from "@/components/ui/button";
import type { FollowStateChange } from "@/lib/types/follow";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

type FollowButtonState =
  | { type: "not-following" }
  | { type: "requested"; requestId: string }
  | { type: "following" };

interface FollowButtonProps {
  userId: number;
  displayName: string;
  initialViewerFollowsUser: boolean;
  initialViewerSentFollowRequest?: { id: string } | null;
  onFollowChange?: (change: FollowStateChange) => void;
}

export function FollowButton({
  userId,
  displayName,
  initialViewerFollowsUser,
  initialViewerSentFollowRequest = null,
  onFollowChange,
}: FollowButtonProps) {
  const t = useTranslations("profile.follow");
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<FollowButtonState>(() => {
    if (initialViewerSentFollowRequest) {
      return { type: "requested", requestId: initialViewerSentFollowRequest.id };
    }
    return initialViewerFollowsUser
      ? { type: "following" }
      : { type: "not-following" };
  });
  const [isHovered, setIsHovered] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const announcementTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

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

  function executeFollow(previousState: FollowButtonState) {
    startTransition(async () => {
      const result = await followUser(userId);

      if (!result.success) {
        setState(previousState);
        toast.add({ title: t("error"), type: "error" });
        return;
      }

      if (result.type === "followed") {
        setState({ type: "following" });
        announce(t("nowFollowing", { name: displayName }));
        onFollowChange?.({ type: "followed" });
      } else {
        // result.type === "requested"
        setState({ type: "requested", requestId: result.requestId });
        announce(t("requestSent", { name: displayName }));
        onFollowChange?.({ type: "requested", requestId: result.requestId });
      }
    });
  }

  function handleFollow() {
    executeFollow(state);
  }

  function handleUnfollow() {
    const previousState = state;
    setState({ type: "not-following" });
    setIsHovered(false);

    startTransition(async () => {
      const result = await unfollowUser(userId);

      if (result.success) {
        setState(result.user.viewerFollowsUser ? { type: "following" } : { type: "not-following" });
        onFollowChange?.({ type: "unfollowed" });

        if (result.wasMutualFollow) {
          const toastId = toast.add({
            title: t("unfollowedUndo", { name: displayName }),
            timeout: 5000,
            actionProps: {
              children: t("undo"),
              onClick: () => {
                toast.close(toastId);
                executeFollow({ type: "not-following" });
              },
            },
          });
        } else {
          announce(t("unfollowedName", { name: displayName }));
        }
      } else {
        setState(previousState);
        toast.add({ title: t("error"), type: "error" });
      }
    });
  }

  function handleCancelRequest() {
    const previousState = state;
    setState({ type: "not-following" });

    startTransition(async () => {
      if (previousState.type !== "requested") return;

      const result = await cancelFollowRequest(previousState.requestId);

      if (result.success) {
        announce(t("requestCancelled"));
        onFollowChange?.({ type: "cancelled" });
      } else {
        setState(previousState);
        toast.add({ title: t("error"), type: "error" });
      }
    });
  }

  function getButtonText(): string {
    if (state.type === "not-following") return t("follow");
    if (state.type === "requested") return t("requested");
    if (isHovered) return t("unfollow");
    return t("following");
  }

  function getButtonVariant(): "default" | "destructive" | "outline" {
    if (state.type === "not-following") return "default";
    if (state.type === "requested") return "outline";
    if (isHovered) return "destructive";
    return "outline";
  }

  function getHandler() {
    if (state.type === "not-following") return handleFollow;
    if (state.type === "requested") return handleCancelRequest;
    return handleUnfollow;
  }

  function getAriaLabel(): string {
    if (state.type === "requested") {
      return t("cancelRequest", { name: displayName });
    }
    if (state.type === "following") {
      return `${t("unfollow")} ${displayName}`;
    }
    return `${t("follow")} ${displayName}`;
  }

  return (
    <>
      <span className="sr-only" aria-live="polite" role="status">
        {announcement}
      </span>

      <Button
        variant={getButtonVariant()}
        onClick={getHandler()}
        disabled={isPending}
        aria-label={getAriaLabel()}
        aria-pressed={state.type === "requested" ? undefined : state.type === "following"}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="min-w-[6rem]"
      >
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : null}
        {getButtonText()}
      </Button>
    </>
  );
}
