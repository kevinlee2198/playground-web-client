import { Badge } from "@/components/ui/badge";
import type { GameStatus } from "@/lib/constants";
import { GameStatusBadgeVariant } from "@/lib/constants";
import { useTranslations } from "next-intl";

const gameStatusI18nKey: Record<GameStatus, string> = {
  SCHEDULED: "scheduled",
  IN_PROGRESS: "inProgress",
  COMPLETE: "complete",
};

interface GameStatusBadgeProps {
  status: GameStatus;
}

export function GameStatusBadge({ status }: GameStatusBadgeProps) {
  const t = useTranslations("game.status");
  const variant = GameStatusBadgeVariant[status];
  const text = t(gameStatusI18nKey[status]);

  return (
    <Badge variant={variant as "default" | "secondary" | "outline"}>
      {text}
    </Badge>
  );
}
