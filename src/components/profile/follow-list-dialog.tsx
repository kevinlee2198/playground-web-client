"use client";

import {
  loadFollowers,
  loadFollowing,
  removeFollower,
} from "@/app/[locale]/user/[username]/actions";
import { getInitials } from "@/components/game/player-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import type { FollowStateChange } from "@/lib/types/follow";
import { MoreVertical, UserMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { FollowButton } from "./follow-button";
import { FollowsYouBadge } from "./follows-you-badge";

interface FollowUser {
  id: number;
  username: string;
  displayName: string;
  profilePicture: {
    __typename: string;
    thumbnailUrl?: string;
  } | null;
  viewerFollowsUser: boolean | null;
  userFollowsViewer: boolean | null;
  viewerSentFollowRequest: { id: string } | null;
}

interface FollowListItem {
  id: string;
  cursor: string;
  user: FollowUser;
}

interface FollowListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  type: "followers" | "following";
  isOwnProfile: boolean;
}

const PAGE_SIZE = 20;

export function FollowListDialog({
  open,
  onOpenChange,
  userId,
  type,
  isOwnProfile,
}: FollowListDialogProps) {
  const t = useTranslations("profile.follow");
  const [items, setItems] = useState<FollowListItem[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [, startFetchTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  const fetchPage = useCallback(
    (after?: string) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      startFetchTransition(async () => {
        if (!after) {
          setItems([]);
          setEndCursor(undefined);
          setHasNextPage(false);
          setHasError(false);
          setIsInitialLoad(true);
        }

        const loader = type === "followers" ? loadFollowers : loadFollowing;
        const result = await loader(userId, PAGE_SIZE, after);

        if (result) {
          setHasError(false);
          const newItems: FollowListItem[] = result.edges.map(
            (edge: { cursor: string; node: { id: string; follower: FollowUser; following: FollowUser } }) => ({
              id: edge.node.id,
              cursor: edge.cursor,
              user:
                type === "followers" ? edge.node.follower : edge.node.following,
            }),
          );

          setItems((prev) => (after ? [...prev, ...newItems] : newItems));
          setHasNextPage(result.pageInfo.hasNextPage);
          setEndCursor(result.pageInfo.endCursor ?? undefined);
        } else {
          setHasError(true);
        }

        setIsInitialLoad(false);
        isLoadingRef.current = false;
      });
    },
    // startFetchTransition omitted — React guarantees dispatch functions are stable
    [type, userId],
  );

  useEffect(() => {
    if (!open) return;
    isLoadingRef.current = false;
    fetchPage();
  }, [open, type, userId, fetchPage]);

  useEffect(() => {
    if (!open || !hasNextPage || isInitialLoad) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingRef.current) {
          fetchPage(endCursor);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, hasNextPage, endCursor, fetchPage, isInitialLoad]);

  function handleRemoveFollower(targetUserId: number) {
    startTransition(async () => {
      const result = await removeFollower(targetUserId);
      if (result.success) {
        setItems((prev) => prev.filter((item) => item.user.id !== targetUserId));
        toast.success(t("removeFollowerSuccess"));
      } else {
        toast.error(t("removeFollowerError"));
      }
    });
  }

  function handleFollowChange(itemUserId: number, change: FollowStateChange) {
    if (isOwnProfile && type === "following" && change.type === "unfollowed") {
      setItems((prev) => prev.filter((item) => item.user.id !== itemUserId));
      return;
    }

    if (change.type !== "followed" && change.type !== "unfollowed") return;

    const nowFollowing = change.type === "followed";
    setItems((prev) =>
      prev.map((item) =>
        item.user.id === itemUserId
          ? {
              ...item,
              user: {
                ...item.user,
                viewerFollowsUser: nowFollowing,
                ...(nowFollowing ? { viewerSentFollowRequest: null } : {}),
              },
            }
          : item,
      ),
    );
  }

  const title =
    type === "followers" ? t("followers") : t("followingLabel");

  const emptyMessage =
    type === "followers" ? t("noFollowersYet") : t("notFollowingAnyone");

  function renderContent() {
    if (isInitialLoad) {
      return (
        <div className="flex flex-col gap-3 p-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      );
    }

    if (hasError) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8">
          <TypographyMuted>{t("loadError")}</TypographyMuted>
          <Button variant="outline" size="sm" onClick={() => fetchPage()}>
            {t("retry")}
          </Button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <TypographyMuted>{emptyMessage}</TypographyMuted>
        </div>
      );
    }

    return (
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex min-h-[44px] items-center gap-3 rounded-md px-2 py-2"
          >
            <Link
              href={`/user/${item.user.username}`}
              className="shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <Avatar>
                {item.user.profilePicture?.thumbnailUrl ? (
                  <AvatarImage
                    src={item.user.profilePicture.thumbnailUrl}
                    alt={item.user.displayName}
                  />
                ) : null}
                <AvatarFallback>
                  {getInitials(item.user.displayName)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Link
                href={`/user/${item.user.username}`}
                className="truncate font-medium text-sm hover:underline"
                onClick={() => onOpenChange(false)}
              >
                {item.user.displayName}
              </Link>
              {item.user.userFollowsViewer &&
              !item.user.viewerFollowsUser ? (
                <FollowsYouBadge className="shrink-0" />
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <FollowButton
                userId={item.user.id}
                displayName={item.user.displayName}
                initialViewerFollowsUser={item.user.viewerFollowsUser ?? false}
                initialViewerSentFollowRequest={item.user.viewerSentFollowRequest}
                onFollowChange={(change) =>
                  handleFollowChange(item.user.id, change)
                }
              />

              {isOwnProfile && type === "followers" ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("moreOptionsFor", {
                          name: item.user.displayName,
                        })}
                      />
                    }
                  >
                    <MoreVertical className="h-4 w-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem
                      onClick={() =>
                        handleRemoveFollower(item.user.id)
                      }
                      disabled={isPending}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      {t("removeFollower")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
          </li>
        ))}

        {hasNextPage ? (
          <div ref={sentinelRef} className="flex justify-center py-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ) : null}
      </ul>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div aria-live="polite">{renderContent()}</div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
