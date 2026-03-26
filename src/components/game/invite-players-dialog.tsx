"use client";

import {
  cancelGameInvitation,
  loadGameInvitations,
  sendGameInvitations,
} from "@/app/[locale]/game/invitation-actions";
import { searchUsers } from "@/components/search/actions";
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
import { Separator } from "@/components/ui/separator";
import { GameInvitationStatus } from "@/lib/constants";
import type {
  GameInvitation,
  GameInvitationBulkItemResult,
} from "@/lib/types/game-invitation";
import type { UserSearchNode } from "@/lib/types/user";
import { getFullName } from "@/lib/utils";
import {
  AlertCircle,
  Check,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

interface InvitePlayersDialogProps {
  gameId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvitePlayersDialog({
  gameId,
  open,
  onOpenChange,
}: InvitePlayersDialogProps) {
  const t = useTranslations("game.invitations");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchNode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stagedUsers, setStagedUsers] = useState<UserSearchNode[]>([]);
  const [sendResults, setSendResults] = useState<
    GameInvitationBulkItemResult[] | null
  >(null);
  const [existingInvitations, setExistingInvitations] = useState<
    GameInvitation[]
  >([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadInvitations = useCallback(async () => {
    setIsLoadingInvitations(true);
    try {
      const result = await loadGameInvitations(gameId);
      if (result) {
        setExistingInvitations(
          result.edges
            .map((e) => e.node)
            .filter((inv) => inv.status !== GameInvitationStatus.CANCELLED),
        );
      }
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (open) {
      void loadInvitations();
      setSearchQuery("");
      setSearchResults([]);
      setStagedUsers([]);
      setSendResults(null);
    }
  }, [open, loadInvitations]);

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

  const excludedIds = new Set([
    ...existingInvitations.map((i) => i.invitee.id),
    ...stagedUsers.map((u) => u.id),
  ]);
  const filteredSearchResults = searchResults.filter(
    (u) => !excludedIds.has(u.id),
  );

  function handleStageUser(user: UserSearchNode): void {
    setStagedUsers((prev) => [...prev, user]);
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleRemoveStaged(userId: string): void {
    setStagedUsers((prev) => prev.filter((u) => u.id !== userId));
  }

  function handleSend(): void {
    startTransition(async () => {
      const result = await sendGameInvitations(
        gameId,
        stagedUsers.map((u) => u.id),
      );
      if (result.success && result.results) {
        setSendResults(result.results);
      } else {
        toast.error(result.message ?? t("errors.sendFailed"));
      }
    });
  }

  function handleCancelInvitation(invitationId: string): void {
    startTransition(async () => {
      const result = await cancelGameInvitation(invitationId);
      if (result.success) {
        setExistingInvitations((prev) =>
          prev.filter((inv) => inv.id !== invitationId),
        );
        toast.success(t("success.cancelled"));
      } else {
        toast.error(result.message ?? t("errors.cancelFailed"));
      }
    });
  }

  function handleInviteMore(): void {
    setSendResults(null);
    setStagedUsers([]);
    void loadInvitations();
  }

  function renderContent(): React.ReactNode {
    if (isLoadingInvitations) {
      return (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (sendResults !== null) {
      return renderResultsPhase(sendResults);
    }

    return renderStagingPhase();
  }

  function renderResultsPhase(
    results: GameInvitationBulkItemResult[],
  ): React.ReactNode {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {results.map((result) => {
            const staged = stagedUsers.find((u) => u.id === result.userId);
            const displayName = staged
              ? getFullName(staged)
              : result.userId;
            const isSuccess =
              result.invitation !== null && result.error === null;

            return (
              <div
                key={result.userId}
                className="flex items-center gap-3 rounded-md border p-3"
              >
                {isSuccess ? (
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{displayName}</span>
                  {!isSuccess && result.error && (
                    <p className="text-xs text-destructive">
                      {result.error.message}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {isSuccess ? t("resultSuccess") : t("resultError")}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleInviteMore}
            className="flex-1"
          >
            <UserPlus className="h-4 w-4" />
            {t("inviteMore")}
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            {t("done")}
          </Button>
        </div>
      </div>
    );
  }

  function renderStagingPhase(): React.ReactNode {
    return (
      <div className="space-y-4">
        {stagedUsers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {stagedUsers.map((user) => {
              const name = getFullName(user);
              return (
                <Badge
                  key={user.id}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span>{name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveStaged(user.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
        )}

        <div className="space-y-2">
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
                  <button
                    key={user.id}
                    type="button"
                    className="flex w-full min-h-11 items-center justify-between rounded-md p-2 text-left hover:bg-accent"
                    onClick={() => handleStageUser(user)}
                  >
                    <div>
                      <span className="text-sm">
                        {getFullName(user)}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        @{user.username}
                      </span>
                    </div>
                    <UserPlus className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
          {!isSearching &&
            searchQuery.trim() &&
            filteredSearchResults.length === 0 &&
            searchResults.length === 0 && (
              <p className="py-2 text-center text-sm text-muted-foreground">
                {t("noResults")}
              </p>
            )}
        </div>

        <Button
          onClick={handleSend}
          disabled={stagedUsers.length === 0 || isPending}
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("sending")}
            </>
          ) : (
            t("sendInvitations")
          )}
        </Button>

        <Separator />

        <div className="space-y-2">
          <span className="text-sm font-medium">{t("existingTitle")}</span>
          {existingInvitations.length === 0 ? (
            <p className="py-2 text-center text-sm text-muted-foreground">
              {t("noExisting")}
            </p>
          ) : (
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-2">
                {existingInvitations.map((invitation) => {
                  const isAccepted =
                    invitation.status === GameInvitationStatus.ACCEPTED;
                  return (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {invitation.invitee.displayName}
                          </span>
                          <Badge
                            variant={isAccepted ? "default" : "secondary"}
                          >
                            {isAccepted
                              ? t("acceptedBadge")
                              : t("pendingBadge")}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          @{invitation.invitee.username}
                        </span>
                      </div>
                      {!isAccepted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="min-h-11 min-w-11"
                          onClick={() =>
                            handleCancelInvitation(invitation.id)
                          }
                          disabled={isPending}
                          aria-label={t("cancelInvitation")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
