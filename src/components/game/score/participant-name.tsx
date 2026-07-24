import { WinnerMark } from "@/components/game/score/winner-mark";
import { cn } from "@/lib/utils";

interface ParticipantNameProps {
  name: string;
  size?: "sm" | "lg";
  /** Crown this side as the winner. */
  isWinner?: boolean;
  /** Mute this side because the other side won. */
  isLoser?: boolean;
}

/** Participant name line in a score block — crowns the winner, mutes the loser. */
export function ParticipantName({
  name,
  size = "sm",
  isWinner = false,
  isLoser = false,
}: ParticipantNameProps) {
  return (
    <p
      className={cn(
        "truncate font-semibold font-heading",
        size === "lg" ? "text-base sm:text-lg" : "text-sm",
        isLoser ? "text-muted-foreground" : null,
      )}
    >
      {isWinner ? <WinnerMark className="mr-1" /> : null}
      {name}
    </p>
  );
}
