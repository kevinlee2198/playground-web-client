"use client";

import { loadFollowRequests } from "@/app/[locale]/settings/follow-requests/actions";
import {
  approveFollowRequest,
  declineFollowRequest,
} from "@/components/profile/follow-request-actions";
import { getInitials } from "@/components/ui/user-avatar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { TypographyMuted } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/toast";

interface FollowRequestEntry {
  id: string;
  cursor: string;
  requester: {
    id: string;
    username: string;
    displayName: string;
    profilePicture: { __typename: string; thumbnailUrl?: string } | null;
  };
  createdDate: string;
}

const PAGE_SIZE = 20;

interface FollowRequestItemProps {
  item: FollowRequestEntry;
  onRemove: (id: string) => void;
}

function FollowRequestItem({ item, onRemove }: FollowRequestItemProps) {
  const t = useTranslations("profile.follow");
  const [isPending, startTransition] = useTransition();

  function handleApprove() {
    startTransition(async () => {
      const result = await approveFollowRequest(item.id);
      if (result.success) {
        onRemove(item.id);
        toast.add({ title: t("approved") });
      } else {
        toast.add({ title: t("approveError"), type: "error" });
      }
    });
  }

  function handleDecline() {
    startTransition(async () => {
      const result = await declineFollowRequest(item.id);
      if (result.success) {
        onRemove(item.id);
        toast.add({ title: t("declined") });
      } else {
        toast.add({ title: t("declineError"), type: "error" });
      }
    });
  }

  return (
    <li className="flex min-h-[44px] items-center gap-3 rounded-lg border px-4 py-3">
      <Link href={`/user/${item.requester.username}`} className="shrink-0">
        <Avatar>
          {item.requester.profilePicture?.thumbnailUrl ? (
            <AvatarImage
              src={item.requester.profilePicture.thumbnailUrl}
              alt={item.requester.displayName}
            />
          ) : null}
          <AvatarFallback>
            {getInitials(item.requester.displayName)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <Link
          href={`/user/${item.requester.username}`}
          className="block truncate font-medium text-sm hover:underline"
        >
          {item.requester.displayName}
        </Link>
        <p className="truncate text-xs text-muted-foreground">
          @{item.requester.username}
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={isPending}
          aria-label={`${t("approve")} ${item.requester.displayName}`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="mr-1 h-4 w-4" aria-hidden="true" />
          )}
          {t("approve")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDecline}
          disabled={isPending}
          aria-label={`${t("decline")} ${item.requester.displayName}`}
        >
          <X className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("decline")}
        </Button>
      </div>
    </li>
  );
}

export function FollowRequestsList() {
  const tSettings = useTranslations("settings.followRequests");
  const t = useTranslations("profile.follow");
  const [items, setItems] = useState<FollowRequestEntry[]>([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [endCursor, setEndCursor] = useState<string | undefined>(undefined);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [, startPageTransition] = useTransition();
  const isLoadingRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(
    (after?: string) => {
      if (isLoadingRef.current) return;
      isLoadingRef.current = true;

      startPageTransition(async () => {
        const result = await loadFollowRequests(PAGE_SIZE, after);

        if (result) {
          setHasError(false);
          const newItems: FollowRequestEntry[] = result.edges.map(
            (edge: { cursor: string; node: Omit<FollowRequestEntry, "cursor"> }) => ({
              ...edge.node,
              cursor: edge.cursor,
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
    [startPageTransition],
  );

  const handleRemove = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => {
    if (!hasNextPage || isInitialLoad) return;

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
  }, [hasNextPage, endCursor, fetchPage, isInitialLoad]);

  if (isInitialLoad) {
    return (
      <div
        className="flex flex-col gap-2"
        aria-busy="true"
        aria-label={tSettings("title")}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex h-[60px] items-center gap-3 rounded-lg border px-4 py-3 animate-pulse"
          >
            <div className="h-10 w-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-muted" />
              <div className="h-3 w-20 rounded bg-muted" />
            </div>
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
    return <TypographyMuted>{tSettings("empty")}</TypographyMuted>;
  }

  return (
    <div aria-live="polite">
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <FollowRequestItem key={item.id} item={item} onRemove={handleRemove} />
        ))}
      </ul>
      {hasNextPage ? (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Loader2
            className="h-5 w-5 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
