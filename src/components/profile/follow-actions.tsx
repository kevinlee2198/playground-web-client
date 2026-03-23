"use client";

import {
  blockUser,
  unblockUser,
} from "@/app/[locale]/user/[username]/actions";
import { MessageButton } from "@/components/chat/message-button";
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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TypographyP } from "@/components/ui/typography";
import { useRouter } from "@/i18n/navigation";
import { Ban, MessageCircle, MoreVertical, ShieldOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FollowButton } from "./follow-button";
import { FollowsYouBadge } from "./follows-you-badge";

interface FollowActionsProps {
  userId: string;
  displayName: string;
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
  showMessageButton?: boolean;
  onFollowChange?: (viewerFollowsUser: boolean) => void;
}

export function FollowActions({
  userId,
  displayName,
  viewerFollowsUser: initialViewerFollowsUser,
  userFollowsViewer,
  showMessageButton = false,
  onFollowChange,
}: FollowActionsProps) {
  const tProfile = useTranslations("profile");
  const tBlock = useTranslations("profile.block");
  const [isPending, startTransition] = useTransition();
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [localViewerFollowsUser, setLocalViewerFollowsUser] = useState(
    initialViewerFollowsUser,
  );
  const router = useRouter();

  function handleFollowChange(nowFollowsUser: boolean) {
    setLocalViewerFollowsUser(nowFollowsUser);
    onFollowChange?.(nowFollowsUser);
  }

  function handleBlock() {
    startTransition(async () => {
      const result = await blockUser(userId);
      if (result.success) {
        setIsBlocked(true);
        toast.success(tBlock("success"));
        setBlockDialogOpen(false);
        router.refresh();
      } else if (result.errorType === "UserBlockedYouError") {
        toast.error(tBlock("alreadyBlockedYou"));
      } else if (result.errorType === "SelfActionError") {
        toast.error(tBlock("cannotBlockSelf"));
      } else {
        toast.error(tBlock("error"));
      }
    });
  }

  function handleUnblock() {
    startTransition(async () => {
      const result = await unblockUser(userId);
      if (result.success) {
        setIsBlocked(false);
        toast.success(tBlock("unblockSuccess"));
        router.refresh();
      } else {
        toast.error(tBlock("error"));
      }
    });
  }

  if (isBlocked) {
    return (
      <Button variant="outline" onClick={handleUnblock} disabled={isPending}>
        <ShieldOff className="mr-2 h-4 w-4" />
        {tBlock("unblockUser")}
      </Button>
    );
  }

  const isMutualFollow = localViewerFollowsUser && userFollowsViewer;

  function renderMessageButton() {
    if (!showMessageButton) return null;

    if (isMutualFollow) {
      return <MessageButton userId={userId} />;
    }

    const tooltip = localViewerFollowsUser
      ? tProfile("messageDisabled.needsToFollowYou")
      : tProfile("messageDisabled.followEachOther");

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                aria-disabled="true"
                onClick={() => {
                  /* aria-disabled: no-op */
                }}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {tProfile("message")}
              </Button>
            }
          />
          <TooltipContent>
            <TypographyP>{tooltip}</TypographyP>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const blockMenu = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label={tProfile("moreOptions")}
            />
          }
        >
          <MoreVertical className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => setBlockDialogOpen(true)}>
            <Ban className="mr-2 h-4 w-4" />
            {tBlock("blockUser")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tBlock("confirmTitle", { name: displayName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tBlock("confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>
              {tProfile("cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} disabled={isPending}>
              {tBlock("blockUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  return (
    <>
      <FollowButton
        userId={userId}
        displayName={displayName}
        initialViewerFollowsUser={localViewerFollowsUser}
        onFollowChange={handleFollowChange}
      />
      {userFollowsViewer && !localViewerFollowsUser ? (
        <FollowsYouBadge />
      ) : null}
      {renderMessageButton()}
      {blockMenu}
    </>
  );
}
