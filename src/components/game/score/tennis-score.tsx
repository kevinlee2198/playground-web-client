import type {
  GameParticipant,
  IndividualParticipantNode,
  TeamInstanceNode,
  TennisParticipantMetadata,
  TennisSetScore,
} from "@/lib/types/game";

function formatTennisSetScore(
  playerASet: TennisSetScore,
  playerBSet: TennisSetScore,
): string {
  const a = playerASet.gamesWon;
  const b = playerBSet.gamesWon;

  if (a === 7 && b === 6 && playerBSet.tiebreakPoints !== null) {
    return `${a}-${b}(${playerBSet.tiebreakPoints})`;
  }
  if (b === 7 && a === 6 && playerASet.tiebreakPoints !== null) {
    return `${a}(${playerASet.tiebreakPoints})-${b}`;
  }

  return `${a}-${b}`;
}

interface TennisScoreProps {
  participantA: GameParticipant;
  participantB: GameParticipant;
}

function getParticipantName(participant: GameParticipant): string {
  if (participant.__typename === "TeamInstance") {
    return (participant as TeamInstanceNode).name;
  }
  const p = participant as IndividualParticipantNode;
  return p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown";
}

export function TennisScore({ participantA, participantB }: TennisScoreProps) {
  const metaA = participantA.metadata;
  const metaB = participantB.metadata;
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  if (
    metaA?.__typename !== "TennisParticipantMetadata" ||
    metaB?.__typename !== "TennisParticipantMetadata"
  ) {
    const setsA =
      metaA?.__typename === "TennisParticipantMetadata" ? metaA.setsWon : 0;
    const setsB =
      metaB?.__typename === "TennisParticipantMetadata" ? metaB.setsWon : 0;
    return (
      <span>
        {nameA} {setsA}-{setsB} {nameB}
      </span>
    );
  }

  const tennisA = metaA as TennisParticipantMetadata;
  const tennisB = metaB as TennisParticipantMetadata;
  const setsDisplay = `${tennisA.setsWon}-${tennisB.setsWon}`;

  if (tennisA.sets.length === 0) {
    return (
      <span>
        {nameA} {setsDisplay} {nameB}
      </span>
    );
  }

  const setScores = tennisA.sets.map((setA, i) => {
    const setB = tennisB.sets[i];
    if (!setB) return `${setA.gamesWon}-0`;
    return formatTennisSetScore(setA, setB);
  });

  return (
    <span>
      {nameA} {setsDisplay} {nameB} | {setScores.join(", ")}
    </span>
  );
}
