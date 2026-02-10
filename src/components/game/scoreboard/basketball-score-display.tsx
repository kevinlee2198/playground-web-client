import type { ParticipantMetadata } from "@/lib/types/game";
import { useTranslations } from "next-intl";

interface BasketballScoreDisplayProps {
  nameA: string;
  nameB: string;
  metadataA: ParticipantMetadata | null;
  metadataB: ParticipantMetadata | null;
}

function extractScore(metadata: ParticipantMetadata | null): number | null {
  if (!metadata) return null;
  if (metadata.__typename === "BasketballParticipantMetadata") {
    return metadata.score;
  }
  return null;
}

export function BasketballScoreDisplay({
  nameA,
  nameB,
  metadataA,
  metadataB,
}: BasketballScoreDisplayProps) {
  const t = useTranslations();

  const scoreA = extractScore(metadataA);
  const scoreB = extractScore(metadataB);

  if (scoreA === null && scoreB === null) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        {t("game.scoreboard.noScores")}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-around py-4">
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {nameA}
        </p>
        <p className="text-5xl font-bold">{scoreA ?? "-"}</p>
      </div>
      <div className="text-3xl font-bold text-muted-foreground">-</div>
      <div className="text-center">
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          {nameB}
        </p>
        <p className="text-5xl font-bold">{scoreB ?? "-"}</p>
      </div>
    </div>
  );
}
