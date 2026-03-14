import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FriendshipStatus } from "@/lib/constants";
import type { Resource } from "@/lib/types/resource";
import { getTranslations } from "next-intl/server";
import { EditableBiography } from "./editable-biography";
import { EditableDisplayName } from "./editable-display-name";
import { FriendActions } from "./friend-actions";
import { ProfileAvatar } from "./profile-avatar";

interface ProfileHeaderProps {
  user: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    displayName: string;
    biography: string | null;
    profilePicture?: Resource | null;
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
}

export async function ProfileHeader({
  user,
  friendship,
  currentUserId,
  isOwnProfile,
  isAuthenticated,
}: ProfileHeaderProps) {
  const t = await getTranslations("profile");

  const initials =
    `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();

  const profilePictureUrl =
    user.profilePicture?.__typename === "ImageResource"
      ? (user.profilePicture.thumbnailUrl ?? user.profilePicture.downloadUrl)
      : user.profilePicture?.downloadUrl;

  return (
    <section className="mb-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Large Avatar */}
        {isOwnProfile ? (
          <ProfileAvatar
            user={{
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              displayName: user.displayName,
              profilePicture: user.profilePicture ?? null,
            }}
          />
        ) : (
          <Avatar className="h-24 w-24 text-2xl sm:h-32 sm:w-32">
            <AvatarImage
              src={profilePictureUrl ?? undefined}
              alt={user.displayName}
            />
            <AvatarFallback className="text-2xl font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        )}

        {/* User Info */}
        <div className="flex flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          {isOwnProfile ? (
            <>
              <EditableDisplayName
                initialDisplayName={user.displayName}
              />
              <p className="text-muted-foreground">@{user.username}</p>
              <EditableBiography
                initialBiography={user.biography}
              />
            </>
          ) : (
            <>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {user.displayName}
                </h1>
                <p className="text-muted-foreground">@{user.username}</p>
              </div>
              {user.biography && (
                <p className="leading-7 text-sm">{user.biography}</p>
              )}
            </>
          )}

          {/* Action Buttons */}
          {!isOwnProfile && isAuthenticated && (
            <div className="flex gap-3">
              <FriendActions
                userId={user.id}
                friendship={friendship}
                currentUserId={currentUserId!}
                showMessageButton
                displayName={user.displayName}
              />
            </div>
          )}
        </div>
      </div>

      {/* Accessible label for editable sections */}
      {isOwnProfile && (
        <span className="sr-only">{t("editProfile")}</span>
      )}
    </section>
  );
}
