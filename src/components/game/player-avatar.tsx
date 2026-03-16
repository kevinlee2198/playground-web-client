import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import type { PlayerRef } from "@/lib/types/game";

interface PlayerAvatarProps {
  player: PlayerRef;
  size?: "sm" | "default" | "lg";
  loading?: "lazy" | "eager";
}

export function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/);
  if (words.length === 0 || words[0] === "") return "";

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  const first = words[0].charAt(0);
  const last = words[words.length - 1].charAt(0);
  return `${first}${last}`.toUpperCase();
}

export function PlayerAvatar({
  player,
  size = "default",
  loading = "eager",
}: PlayerAvatarProps) {
  const thumbnailUrl = player.user.profilePicture?.thumbnailUrl;

  return (
    <Avatar size={size}>
      {thumbnailUrl ? (
        <AvatarImage src={thumbnailUrl} alt="" loading={loading} />
      ) : null}
      <AvatarFallback>{getInitials(player.user.displayName)}</AvatarFallback>
    </Avatar>
  );
}
