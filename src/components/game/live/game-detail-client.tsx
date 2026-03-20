"use client";

import { GameBoxScores } from "@/components/game/game-box-scores";
import { GameDetailActions } from "@/components/game/game-detail-actions";
import { InvitationActionCard } from "@/components/game/invitation-action-card";
import { GameMediaGallery } from "@/components/game/game-media-gallery";
import { GameParticipants } from "@/components/game/game-participants";
import { useGameSubscription } from "@/hooks/use-game-subscription";
import { isKnownGameEventType } from "@/lib/types/game-event";
import type { GameDetail } from "@/lib/types/game";
import {
  getSportParticipationType,
  getSubtypeFromMetadata,
  ParticipationType,
} from "@/lib/constants";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
import type {
  FootballDefensiveStatsNode,
  FootballOffensiveStatsNode,
  FootballSpecialTeamsStatsNode,
} from "@/lib/types/stats/football";
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatisticsNode } from "@/lib/types/stats/tennis";
import type {
  BaseballBattingStatsNode,
  BaseballPitchingStatsNode,
  BaseballFieldingStatsNode,
} from "@/lib/types/stats/baseball";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import {
  createInitialState,
  gameLiveReducer,
  type LiveGameState,
} from "./game-live-reducer";

const GameLiveContext = createContext<LiveGameState | null>(null);

export function useGameLiveContext(): LiveGameState | null {
  return useContext(GameLiveContext);
}

interface GameDetailClientProps {
  game: GameDetail;
  initialBoxScores: { node: BasketballBoxScoreNode }[];
  initialPickleballStats?: { node: PickleballStatisticsNode }[];
  initialFootballOffensiveStats?: { node: FootballOffensiveStatsNode }[];
  initialFootballDefensiveStats?: { node: FootballDefensiveStatsNode }[];
  initialFootballSpecialTeamsStats?: { node: FootballSpecialTeamsStatsNode }[];
  initialTennisStats?: { node: TennisStatisticsNode }[];
  initialBaseballBattingStats?: { node: BaseballBattingStatsNode }[];
  initialBaseballPitchingStats?: { node: BaseballPitchingStatsNode }[];
  initialBaseballFieldingStats?: { node: BaseballFieldingStatsNode }[];
  playerId: number;
  canUpload: boolean;
  children: ReactNode;
}

export function GameDetailClient({
  game,
  initialBoxScores,
  initialPickleballStats,
  initialFootballOffensiveStats,
  initialFootballDefensiveStats,
  initialFootballSpecialTeamsStats,
  initialTennisStats,
  initialBaseballBattingStats,
  initialBaseballPitchingStats,
  initialBaseballFieldingStats,
  playerId,
  canUpload,
  children,
}: GameDetailClientProps) {
  const t = useTranslations();
  const [state, dispatch] = useReducer(
    gameLiveReducer,
    null,
    () => createInitialState(game, initialBoxScores),
  );

  const prevGameRef = useRef(game);
  useEffect(() => {
    if (prevGameRef.current !== game) {
      prevGameRef.current = game;
      dispatch({ type: "SYNC_FROM_SERVER", game, boxScores: initialBoxScores });
    }
  }, [game, initialBoxScores]);

  const prevStateRef = useRef(state);
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (prev === state) return;

    let message = "";

    if (prev.game.gameStatus !== state.game.gameStatus) {
      if (state.game.gameStatus === "IN_PROGRESS") {
        message = t("game.live.gameStarted");
      } else if (state.game.gameStatus === "COMPLETE") {
        message = t("game.live.gameEnded");
      }
    } else if (
      prev.game.resultsFinalized !== state.game.resultsFinalized
    ) {
      message = state.game.resultsFinalized
        ? t("game.live.resultsFinalized")
        : t("game.live.resultsUnfinalized");
    } else if (
      prev.game.participants.edges.length !==
      state.game.participants.edges.length
    ) {
      const prevIds = new Set(
        prev.game.participants.edges.map((e) => e.node.id),
      );
      const newParticipant = state.game.participants.edges.find(
        (e) => !prevIds.has(e.node.id),
      );
      if (newParticipant) {
        const node = newParticipant.node;
        const name =
          node.__typename === "TeamInstance"
            ? node.name
            : node.player.user.displayName;
        message = t("game.live.participantAdded", { name });
      } else {
        message = t("game.live.participantRemoved");
      }
    }

    if (message && announcerRef.current) {
      announcerRef.current.textContent = message;
      const timeout = setTimeout(() => {
        if (announcerRef.current) announcerRef.current.textContent = "";
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state, t]);

  useGameSubscription({
    gameId: game.id,
    enabled: true,
    onEvent: (event) => {
      if (isKnownGameEventType(event)) {
        dispatch({ type: "GAME_EVENT", event });
      }
    },
    onConnectionLost: () => dispatch({ type: "CONNECTION_LOST" }),
    onReconnect: () => dispatch({ type: "RECONNECTED" }),
  });

  const isParticipant = state.game.participants.edges.some((edge) => {
    const node = edge.node;
    if (node.__typename === "TeamInstance") {
      return node.players.some((p) => p.id === playerId);
    }
    if (node.__typename === "IndividualParticipant") {
      return node.player.id === playerId;
    }
    return false;
  });

  const subtype = getSubtypeFromMetadata(state.game.metadata);
  const isTeamBased =
    getSportParticipationType(state.game.sportType, subtype) ===
    ParticipationType.TEAM;

  return (
    <GameLiveContext.Provider value={state}>
      {!state.isConnected && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400"
        >
          <WifiOff className="size-4 shrink-0" />
          <span>{t("game.live.connectionLost")}</span>
        </div>
      )}

      {children}

      {state.game.viewerInvitation && (
        <InvitationActionCard
          invitation={state.game.viewerInvitation}
          isParticipant={isParticipant}
          isTeamBased={isTeamBased}
        />
      )}

      <GameDetailActions game={state.game} />

      <section className="mt-8">
        <GameParticipants game={state.game} currentPlayerId={playerId} />
      </section>

      <section className="mt-8">
        <GameMediaGallery
          gameId={state.game.id}
          initialMedia={game.media.edges}
          initialPageInfo={game.media.pageInfo}
          canUpload={canUpload}
          isParticipant={isParticipant}
        />
      </section>

      <section className="mt-8">
        <GameBoxScores
          game={state.game}
          boxScores={state.boxScores}
          pickleballStats={initialPickleballStats}
          footballOffensiveStats={initialFootballOffensiveStats}
          footballDefensiveStats={initialFootballDefensiveStats}
          footballSpecialTeamsStats={initialFootballSpecialTeamsStats}
          tennisStats={initialTennisStats}
          baseballBattingStats={initialBaseballBattingStats}
          baseballPitchingStats={initialBaseballPitchingStats}
          baseballFieldingStats={initialBaseballFieldingStats}
        />
      </section>

      <div ref={announcerRef} className="sr-only" aria-live="polite" aria-atomic={true} />
    </GameLiveContext.Provider>
  );
}
