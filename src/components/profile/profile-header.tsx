import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FriendshipStatus } from "@/lib/constants";
import { MessageCircle, UserPen } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FriendActions } from "./friend-actions";

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    player?: {
      biography?: string | null;
    } | null;
  };
  friendship?: {
    id: string;
    status: FriendshipStatus;
    requester: { id: string };
    addressee: { id: string };
  } | null;
  currentUserId?: string | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
  locale: string;
}

export async function ProfileHeader({
  user,
  friendship,
  currentUserId,
  isOwnProfile,
  isAuthenticated,
  locale,
}: ProfileHeaderProps) {
  const t = await getTranslations("profile");

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`;

  const isFriends = friendship?.status === "ACCEPTED";

  return (
    <section className="mb-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Large Avatar */}
        <Avatar className="h-24 w-24 text-2xl sm:h-32 sm:w-32">
          <AvatarImage src={undefined} alt={fullName} />
          <AvatarFallback className="text-2xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex flex-1 flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>
            <p className="text-muted-foreground">@{user.username}</p>
          </div>

          {user.player?.biography && (
            <p className="max-w-2xl text-muted-foreground">
              {user.player.biography}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isOwnProfile ? (
              <Button variant="outline" asChild>
                <Link href={`/${locale}/settings/profile`}>
                  <UserPen className="mr-2 h-4 w-4" />
                  {t("editProfile")}
                </Link>
              </Button>
            ) : (
              <>
                {/* Friend Actions - only show when authenticated */}
                {isAuthenticated && (
                  <FriendActions
                    userId={user.id}
                    friendship={friendship}
                    currentUserId={currentUserId!}
                  />
                )}

                {/* Message Button - requires friends */}
                {isAuthenticated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button variant="outline" disabled={!isFriends}>
                            <MessageCircle className="mr-2 h-4 w-4" />
                            {t("message")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isFriends && (
                        <TooltipContent>
                          <p>{t("messageFriendsOnly")}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
