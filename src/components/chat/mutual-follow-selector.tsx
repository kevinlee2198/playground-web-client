"use client";

import { loadMutualFollows } from "@/app/[locale]/chat/actions";
import { getInitials } from "@/components/game/player-avatar";
import { FollowButton } from "@/components/profile/follow-button";
import { searchUsers } from "@/components/search/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { useDebounce } from "@/hooks/use-debounce";
import type { Edge } from "@/lib/graphql-connection";
import type { MutualFollowUser } from "@/lib/types/chat";
import type { UserSearchNode } from "@/lib/types/user";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

interface MutualFollowSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  excludeUserIds?: string[];
  currentUserId: string;
}

export function MutualFollowSelector({
  selectedIds,
  onSelectionChange,
  excludeUserIds = [],
  currentUserId,
}: MutualFollowSelectorProps) {
  const t = useTranslations("chat");

  const [mutualFollows, setMutualFollows] = useState<MutualFollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);

  const [searchResults, setSearchResults] = useState<UserSearchNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const fetchMutualFollows = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await loadMutualFollows(50);
      if (result) {
        setMutualFollows(
          result.edges.map((edge: Edge<MutualFollowUser>) => edge.node),
        );
      }
    } catch (error) {
      console.error("Failed to load mutual follows:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load mutual follows on mount
  useEffect(() => {
    fetchMutualFollows();
  }, [fetchMutualFollows]);

  // Client-side filtered mutual follows
  const filteredMutualFollows = useMemo(() => {
    return mutualFollows.filter((user) => {
      if (user.id === currentUserId) return false;
      if (excludeUserIds.includes(user.id)) return false;
      if (debouncedQuery.trim()) {
        const q = debouncedQuery.toLowerCase();
        return (
          user.displayName.toLowerCase().includes(q) ||
          user.username.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mutualFollows, debouncedQuery, excludeUserIds, currentUserId]);

  const mutualFollowIds = useMemo(
    () => new Set(mutualFollows.map((u) => u.id)),
    [mutualFollows],
  );

  // Fall back to server-side search when client-side filtering yields no matches
  const shouldSearchServer =
    debouncedQuery.trim().length > 0 && filteredMutualFollows.length === 0;

  useEffect(() => {
    if (!shouldSearchServer) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setIsSearching(true);
      try {
        const result = await searchUsers(debouncedQuery.trim(), 20);
        if (!cancelled && result.success && result.edges) {
          setSearchResults(result.edges.map((e) => e.node));
        }
      } catch (error) {
        console.error("Search failed:", error);
      } finally {
        if (!cancelled) setIsSearching(false);
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [shouldSearchServer, debouncedQuery]);

  const nonMutualSearchResults = useMemo(
    () =>
      searchResults.filter(
        (u) =>
          !mutualFollowIds.has(u.id) &&
          !excludeUserIds.includes(u.id) &&
          u.id !== currentUserId,
      ),
    [searchResults, mutualFollowIds, excludeUserIds, currentUserId],
  );

  const handleToggle = useCallback(
    (userId: string) => {
      if (selectedIds.includes(userId)) {
        onSelectionChange(selectedIds.filter((id) => id !== userId));
      } else {
        onSelectionChange([...selectedIds, userId]);
      }
    },
    [selectedIds, onSelectionChange],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (mutualFollows.length === 0 && !searchQuery.trim()) {
    return (
      <Empty className="border-none py-8">
        <EmptyHeader>
          <EmptyDescription>{t("noMutualFollows")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const hasClientResults = filteredMutualFollows.length > 0;
  const hasServerResults = nonMutualSearchResults.length > 0;
  const noResults =
    debouncedQuery.trim().length > 0 &&
    !isSearching &&
    !hasClientResults &&
    !hasServerResults;

  return (
    <div className="space-y-3">
      <Input
        placeholder={t("searchPeople")}
        aria-label={t("searchPeople")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <TypographyMuted>
        {t("selectedCount", { count: selectedIds.length })}
      </TypographyMuted>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {/* Mutual follow matches (selectable) */}
          {filteredMutualFollows.map((user) => (
            <MutualFollowItem
              key={user.id}
              user={user}
              isSelected={selectedIds.includes(user.id)}
              onToggle={handleToggle}
            />
          ))}

          {/* Server-side search results that are NOT mutual follows (disabled) */}
          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isSearching &&
            nonMutualSearchResults.map((user) => (
              <NonMutualSearchResultItem key={user.id} user={user} onFollowSuccess={fetchMutualFollows} />
            ))}

          {noResults && (
            <Empty className="border-none py-8">
              <EmptyHeader>
                <EmptyDescription>{t("noPeopleFound")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface MutualFollowItemProps {
  user: MutualFollowUser;
  isSelected: boolean;
  onToggle: (userId: string) => void;
}

function MutualFollowItem({ user, isSelected, onToggle }: MutualFollowItemProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-accent">
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(user.id)}
      />
      <Avatar size="sm">
        {user.profilePicture?.thumbnailUrl ? (
          <AvatarImage
            src={user.profilePicture.thumbnailUrl}
            alt={user.displayName}
          />
        ) : null}
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TypographySmall className="block truncate">
          {user.displayName}
        </TypographySmall>
        <TypographyMuted className="truncate">@{user.username}</TypographyMuted>
      </div>
    </label>
  );
}

interface NonMutualSearchResultItemProps {
  user: UserSearchNode;
  onFollowSuccess: () => void;
}

function NonMutualSearchResultItem({ user, onFollowSuccess }: NonMutualSearchResultItemProps) {
  const t = useTranslations("chat");

  return (
    <div className="flex items-center gap-3 rounded-md p-2 opacity-60">
      <Avatar size="sm">
        <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <TypographySmall className="block truncate">
          {user.displayName}
        </TypographySmall>
        <TypographyMuted className="truncate">@{user.username}</TypographyMuted>
        <TypographyMuted className="mt-0.5 truncate text-xs">
          {t("mutualFollowRequired")}
        </TypographyMuted>
      </div>
      <FollowButton
        userId={user.id}
        displayName={user.displayName}
        initialViewerFollowsUser={user.viewerFollowsUser ?? false}
        onFollowChange={(change) => {
          if (change.type === "followed") onFollowSuccess();
        }}
      />
    </div>
  );
}
