"use client";

import {
  acceptFriendRequest,
  sendFriendRequest,
} from "@/app/[locale]/user/[id]/actions";
import { Button } from "@/components/ui/button";
import { FriendshipStatus } from "@/lib/constants";
import { Clock, Loader2, UserCheck, UserPlus } from "lucide-react";
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
}

export function FriendActions({
  userId,
  friendship,
  currentUserId,
}: FriendActionsProps) {
  const t = useTranslations("profile.friends");
  const [isPending, startTransition] = useTransition();
  const [localFriendship, setLocalFriendship] = useState(friendship);
  const [hasSentRequest, setHasSentRequest] = useState(false);

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

  // No friendship or declined - show Add Friend
  if (!status || status === FriendshipStatus.DECLINED) {
    return (
      <Button onClick={handleAddFriend} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {t("addFriend")}
      </Button>
    );
  }

  // Pending - current user sent the request
  if (
    (status === FriendshipStatus.PENDING && isRequester) ||
    (hasSentRequest && status !== FriendshipStatus.ACCEPTED)
  ) {
    return (
      <Button variant="secondary" disabled>
        <Clock className="mr-2 h-4 w-4" />
        {t("pending")}
      </Button>
    );
  }

  // Pending - current user received the request
  if (status === FriendshipStatus.PENDING && isAddressee) {
    return (
      <Button onClick={handleAcceptRequest} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="mr-2 h-4 w-4" />
        )}
        {t("acceptRequest")}
      </Button>
    );
  }

  // Accepted - show friends status
  if (status === FriendshipStatus.ACCEPTED) {
    return (
      <Button variant="outline" disabled>
        <UserCheck className="mr-2 h-4 w-4" />
        {t("friends")}
      </Button>
    );
  }

  return null;
}
