"use client";

import { loadFriendships } from "@/app/[locale]/chat/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Edge } from "@/lib/graphql-connection";
import type { FriendItem, FriendshipNode } from "@/lib/types/chat";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

interface FriendSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  excludeUserIds?: string[];
  currentUserId: string;
}

export function FriendSelector({
  selectedIds,
  onSelectionChange,
  excludeUserIds = [],
  currentUserId,
}: FriendSelectorProps) {
  const t = useTranslations("chat");
  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFriends() {
      setIsLoading(true);
      try {
        const result = await loadFriendships(50);

        if (result) {
          // Extract friend users from friendships
          const friendItems: FriendItem[] = result.edges.map(
            (edge: Edge<FriendshipNode>) => {
              const friendship = edge.node;
              const friend =
                friendship.requester.id === currentUserId
                  ? friendship.addressee
                  : friendship.requester;

              return {
                userId: friend.id,
                firstName: friend.firstName,
                lastName: friend.lastName,
              };
            },
          );

          setFriends(friendItems);
        }
      } catch (error) {
        console.error("Failed to load friends:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFriends();
  }, [currentUserId]);

  // Filter friends based on search query and exclude list
  const filteredFriends = useMemo(() => {
    return friends.filter((friend) => {
      // Exclude users in the exclude list
      if (excludeUserIds.includes(friend.userId)) {
        return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const fullName = `${friend.firstName} ${friend.lastName}`.toLowerCase();
        return fullName.includes(searchQuery.toLowerCase());
      }

      return true;
    });
  }, [friends, searchQuery, excludeUserIds]);

  const handleToggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onSelectionChange(selectedIds.filter((id) => id !== userId));
    } else {
      onSelectionChange([...selectedIds, userId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <Empty className="border-none py-8">
        <EmptyHeader>
          <EmptyDescription>{t("noFriends")}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder={t("searchFriends")}
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      <div className="text-sm text-muted-foreground">
        {t("selectedCount", { count: selectedIds.length })}
      </div>

      <ScrollArea className="h-[300px]">
        <div className="space-y-2">
          {filteredFriends.map((friend) => (
            <label
              key={friend.userId}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-accent cursor-pointer"
            >
              <Checkbox
                checked={selectedIds.includes(friend.userId)}
                onCheckedChange={() => handleToggle(friend.userId)}
              />
              <span className="text-sm">
                {friend.firstName} {friend.lastName}
              </span>
            </label>
          ))}

          {filteredFriends.length === 0 && searchQuery.trim() && (
            <Empty className="border-none py-8">
              <EmptyHeader>
                <EmptyDescription>{t("noFriendsFound")}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
