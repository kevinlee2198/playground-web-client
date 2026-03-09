"use client";

import {
  acceptFriendRequest,
  blockUser,
  sendFriendRequest,
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
import { FriendshipStatus } from "@/lib/constants";
import {
  Ban,
  Clock,
  Loader2,
  MessageCircle,
  MoreVertical,
  ShieldOff,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";

interface FriendActionsProps {
  userId: string;
  friendship?: {
    id: string;
    status: FriendshipStatus;
    requester: { id: string };
    addressee: { id: string };
  } | null;
  currentUserId: string;
  showMessageButton?: boolean;
  displayName: string;
}

export function FriendActions({
  userId,
  friendship,
  currentUserId,
  showMessageButton = false,
  displayName,
}: FriendActionsProps) {
  const t = useTranslations("profile.friends");
  const tProfile = useTranslations("profile");
  const tBlock = useTranslations("profile.block");
  const [isPending, startTransition] = useTransition();
  const [localFriendship, setLocalFriendship] = useState(friendship);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  const status = localFriendship?.status;
  const isRequester = localFriendship?.requester.id === currentUserId;
  const isAddressee = localFriendship?.addressee.id === currentUserId;

  const handleAddFriend = () => {
    startTransition(async () => {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        setLocalFriendship(result.friendship);
        setHasSentRequest(true);
        toast.success(t("requestSent"));
      } else if (result.errorType === "FriendshipAlreadyExistsError") {
        toast.error(t("cannotAddBlocked"));
      } else {
        toast.error(t("error"));
      }
    });
  };

  const handleAcceptRequest = () => {
    startTransition(async () => {
      const result = await acceptFriendRequest(localFriendship!.requester.id);
      if (result.success) {
        setLocalFriendship(result.friendship);
        toast.success(t("requestAccepted"));
      } else {
        toast.error(t("error"));
      }
    });
  };

  const handleBlock = () => {
    startTransition(async () => {
      const result = await blockUser(userId);
      if (result.success) {
        setLocalFriendship({
          id: "",
          status: FriendshipStatus.BLOCKED,
          requester: { id: currentUserId },
          addressee: { id: userId },
        });
        toast.success(tBlock("success"));
        setBlockDialogOpen(false);
      } else if (result.errorType === "UserBlockedYouError") {
        toast.error(tBlock("alreadyBlockedYou"));
      } else if (result.errorType === "SelfActionError") {
        toast.error(tBlock("cannotBlockSelf"));
      } else {
        toast.error(tBlock("error"));
      }
    });
  };

  const handleUnblock = () => {
    startTransition(async () => {
      const result = await unblockUser(userId);
      if (result.success) {
        setLocalFriendship(null);
        toast.success(tBlock("unblockSuccess"));
      } else {
        toast.error(tBlock("error"));
      }
    });
  };

  const isFriends = status === FriendshipStatus.ACCEPTED;

  const messageButton = showMessageButton ? (
    isFriends ? (
      <MessageButton userId={userId} />
    ) : (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button variant="outline" disabled>
                <MessageCircle className="mr-2 h-4 w-4" />
                {tProfile("message")}
              </Button>
            }
          />
          <TooltipContent>
            <TypographyP>{tProfile("messageFriendsOnly")}</TypographyP>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  ) : null;

  const blockMenu = status !== FriendshipStatus.BLOCKED ? (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
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
            <AlertDialogTitle>{tBlock("confirmTitle", { name: displayName })}</AlertDialogTitle>
            <AlertDialogDescription>
              {tBlock("confirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{tProfile("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlock} disabled={isPending}>
              {tBlock("blockUser")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  ) : null;

  // Blocked by current user - show unblock
  if (status === FriendshipStatus.BLOCKED && isRequester) {
    return (
      <Button variant="outline" onClick={handleUnblock} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ShieldOff className="mr-2 h-4 w-4" />
        )}
        {tBlock("unblockUser")}
      </Button>
    );
  }

  // Blocked by other user - show nothing actionable
  if (status === FriendshipStatus.BLOCKED) {
    return null;
  }

  // No friendship or declined - show Add Friend
  if (!status || status === FriendshipStatus.DECLINED) {
    return (
      <>
        <Button onClick={handleAddFriend} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {t("addFriend")}
        </Button>
        {messageButton}
        {blockMenu}
      </>
    );
  }

  // Pending - current user sent the request
  if (
    (status === FriendshipStatus.PENDING && isRequester) ||
    (hasSentRequest && status !== FriendshipStatus.ACCEPTED)
  ) {
    return (
      <>
        <Button variant="secondary" disabled>
          <Clock className="mr-2 h-4 w-4" />
          {t("pending")}
        </Button>
        {messageButton}
        {blockMenu}
      </>
    );
  }

  // Pending - current user received the request
  if (status === FriendshipStatus.PENDING && isAddressee) {
    return (
      <>
        <Button onClick={handleAcceptRequest} disabled={isPending}>
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserCheck className="mr-2 h-4 w-4" />
          )}
          {t("acceptRequest")}
        </Button>
        {messageButton}
        {blockMenu}
      </>
    );
  }

  // Accepted - show friends status
  if (isFriends) {
    return (
      <>
        <Button variant="outline" disabled>
          <UserCheck className="mr-2 h-4 w-4" />
          {t("friends")}
        </Button>
        {messageButton}
        {blockMenu}
      </>
    );
  }

  return null;
}
