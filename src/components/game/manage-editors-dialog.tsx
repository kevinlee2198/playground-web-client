"use client";

import {
  addGameEditor,
  loadGameMembers,
  removeGameEditor,
  transferGameOwnership,
} from "@/app/[locale]/game/actions";
import { searchUsers } from "@/components/search/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameRole } from "@/lib/constants";
import type { Edge } from "@/lib/graphql-connection";
import type { GameMember } from "@/lib/types/game";
import type { UserSearchNode } from "@/lib/types/user";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface ManageEditorsDialogProps {
  gameId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageEditorsDialog({
  gameId,
  open,
  onOpenChange,
}: ManageEditorsDialogProps) {
  const t = useTranslations("game.editors");
  const [members, setMembers] = useState<Edge<GameMember>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Confirmation dialogs
  const [removeTarget, setRemoveTarget] = useState<GameMember | null>(null);
  const [transferTarget, setTransferTarget] = useState<GameMember | null>(null);

  // Load members when dialog opens
  const loadMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await loadGameMembers(gameId);
      if (result) {
        setMembers(result.members);
      } else {
        toast.error(t("errors.loadFailed"));
      }
    } finally {
      setIsLoading(false);
    }
  }, [gameId, t]);

  useEffect(() => {
    if (open) {
      loadMembers();
      setSearchQuery("");
      setSearchResults([]);
    }
  }, [open, loadMembers]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await searchUsers(searchQuery, 10);
        if (result.success && result.edges) {
          setSearchResults(result.edges.map((e) => e.node));
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleAdd = (user: UserSearchNode) => {
    startTransition(async () => {
      const result = await addGameEditor(gameId, user.id);
      if (result.success && result.gameMember) {
        setMembers((prev) => [
          ...prev,
          { cursor: result.gameMember!.id, node: result.gameMember! },
        ]);
        setSearchQuery("");
        setSearchResults([]);
        toast.success(t("success.added"));
      } else {
        toast.error(result.message ?? t("errors.addFailed"));
      }
    });
  };

  const handleConfirmRemove = () => {
    if (!removeTarget) return;
    startTransition(async () => {
      const result = await removeGameEditor(gameId, removeTarget.user.id);
      if (result.success) {
        setMembers((prev) =>
          prev.filter((e) => e.node.id !== removeTarget.id),
        );
        toast.success(t("success.removed"));
        setRemoveTarget(null);
      } else {
        toast.error(result.message ?? t("errors.removeFailed"));
      }
    });
  };

  const handleConfirmTransfer = () => {
    if (!transferTarget) return;
    startTransition(async () => {
      const result = await transferGameOwnership(gameId, transferTarget.user.id);
      if (result.success) {
        toast.success(t("success.transferred"));
        setTransferTarget(null);
        await loadMembers();
      } else {
        toast.error(result.message ?? t("errors.transferFailed"));
      }
    });
  };

  const memberUserIds = members.map((e) => e.node.user.id);
  const filteredSearchResults = searchResults.filter(
    (u) => !memberUserIds.includes(u.id),
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Member list */}
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {members.map((edge) => {
                    const member = edge.node;
                    const isOwner = member.role === GameRole.OWNER;
                    const name = `${member.user.firstName} ${member.user.lastName}`;

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{name}</span>
                            <Badge variant={isOwner ? "default" : "secondary"}>
                              {t(
                                member.role.toLowerCase() as "owner" | "editor",
                              )}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            @{member.user.username}
                          </span>
                        </div>
                        {!isOwner && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setTransferTarget(member)}
                              disabled={isPending}
                            >
                              {t("transferOwnership")}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setRemoveTarget(member)}
                              disabled={isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Add editor search */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span className="text-sm font-medium">{t("addEditor")}</span>
                </div>
                <Input
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isSearching && (
                  <div className="flex justify-center py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
                {filteredSearchResults.length > 0 && (
                  <ScrollArea className="max-h-[200px]">
                    <div className="space-y-1">
                      {filteredSearchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between rounded-md p-2 hover:bg-accent"
                        >
                          <div>
                            <span className="text-sm">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="ml-2 text-xs text-muted-foreground">
                              @{user.username}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAdd(user)}
                            disabled={isPending}
                          >
                            {t("addEditor")}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove confirmation */}
      <AlertDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("removeConfirmDescription", {
                name: removeTarget
                  ? `${removeTarget.user.firstName} ${removeTarget.user.lastName}`
                  : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isPending}
            >
              {t("removeEditor")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer confirmation */}
      <AlertDialog
        open={!!transferTarget}
        onOpenChange={(open) => !open && setTransferTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("transferConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("transferConfirmDescription", {
                name: transferTarget
                  ? `${transferTarget.user.firstName} ${transferTarget.user.lastName}`
                  : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {t("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransfer}
              disabled={isPending}
            >
              {t("transferOwnership")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
