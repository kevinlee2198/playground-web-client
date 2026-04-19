"use client";

import { GameStats } from "@/components/game/game-stats";
import { GameDetailActions } from "@/components/game/game-detail-actions";
import { GameMediaSection } from "@/components/game/game-media-section";
import { GameParticipants } from "@/components/game/game-participants";
import { InvitationActionCard } from "@/components/game/invitation-action-card";
import { useGameSubscription } from "@/hooks/use-game-subscription";
import { isKnownGameEventType } from "@/lib/types/game-event";
import type { GameDetail } from "@/lib/types/game";
import {
  GameStatus,
  getSportParticipationType,
  getFormatFromMetadata,
  ParticipationType,
} from "@/lib/constants";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";
import type {
  FootballDefensiveStatsNode,
  FootballOffensiveStatsNode,
  FootballSpecialTeamsStatsNode,
} from "@/lib/types/stats/football";
import type { PickleballStatsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatsNode } from "@/lib/types/stats/tennis";
import type {
  BaseballBattingStatsNode,
  BaseballPitchingStatsNode,
  BaseballFieldingStatsNode,
} from "@/lib/types/stats/baseball";
import type { VolleyballStatsNode } from "@/lib/types/stats/volleyball";
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
  initialBasketballStats: { node: BasketballStatsNode }[];
  initialPickleballStats?: { node: PickleballStatsNode }[];
  initialFootballOffensiveStats?: { node: FootballOffensiveStatsNode }[];
  initialFootballDefensiveStats?: { node: FootballDefensiveStatsNode }[];
  initialFootballSpecialTeamsStats?: { node: FootballSpecialTeamsStatsNode }[];
  initialTennisStats?: { node: TennisStatsNode }[];
  initialBaseballBattingStats?: { node: BaseballBattingStatsNode }[];
  initialBaseballPitchingStats?: { node: BaseballPitchingStatsNode }[];
  initialBaseballFieldingStats?: { node: BaseballFieldingStatsNode }[];
  initialVolleyballStats?: { node: VolleyballStatsNode }[];
  currentUserId: number | null;
  children: ReactNode;
}

export function GameDetailClient({
  game,
  initialBasketballStats,
  initialPickleballStats,
  initialFootballOffensiveStats,
  initialFootballDefensiveStats,
  initialFootballSpecialTeamsStats,
  initialTennisStats,
  initialBaseballBattingStats,
  initialBaseballPitchingStats,
  initialBaseballFieldingStats,
  initialVolleyballStats,
  currentUserId,
  children,
}: GameDetailClientProps) {
  const t = useTranslations();
  const [state, dispatch] = useReducer(
    gameLiveReducer,
    null,
    () => createInitialState(game, initialBasketballStats),
  );

  const prevGameRef = useRef(game);
  useEffect(() => {
    if (prevGameRef.current !== game) {
      prevGameRef.current = game;
      dispatch({ type: "SYNC_FROM_SERVER", game, basketballStats: initialBasketballStats });
    }
  }, [game, initialBasketballStats]);

  const prevStateRef = useRef(state);
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;

    if (prev === state) return;

    let message = "";

    if (prev.game.gameStatus !== state.game.gameStatus) {
      if (state.game.gameStatus === "FINALIZED") {
        message = t("game.live.resultsFinalized");
      } else if (prev.game.gameStatus === "FINALIZED") {
        message = t("game.live.resultsUnfinalized");
      } else if (state.game.gameStatus === "IN_PROGRESS") {
        message = t("game.live.gameStarted");
      } else if (state.game.gameStatus === "COMPLETE") {
        message = t("game.live.gameEnded");
      }
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
            ? (node.name ?? t("leagues.team.unnamed"))
            : node.participant.displayName;
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

  const isParticipant =
    currentUserId != null &&
    state.game.participants.edges.some((edge) => {
      const node = edge.node;
      if (node.__typename === "TeamInstance") {
        return node.roster.some((u) => u.id === currentUserId);
      }
      if (node.__typename === "IndividualParticipant") {
        return (
          node.participant.__typename === "User" &&
          node.participant.id === currentUserId
        );
      }
      return false;
    });

  const canContribute =
    (isParticipant || state.game.viewerGameRole != null) &&
    (state.game.gameStatus === GameStatus.IN_PROGRESS ||
      state.game.gameStatus === GameStatus.COMPLETE);

  const sportFormat = getFormatFromMetadata(state.game.metadata);
  const isTeamBased =
    getSportParticipationType(state.game.sportType, sportFormat) ===
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
        {currentUserId != null && (
          <GameParticipants game={state.game} currentUserId={currentUserId} />
        )}
      </section>

      <section className="mt-8">
        <GameMediaSection
          gameId={state.game.id}
          initialMedia={game.media.edges}
          initialPageInfo={game.media.pageInfo}
          canContribute={canContribute}
          currentUserId={currentUserId}
          viewerGameRole={state.game.viewerGameRole}
          gameVisibility={state.game.visibility}
        />
      </section>

      <section className="mt-8">
        <GameStats
          game={state.game}
          basketballStats={state.basketballStats}
          pickleballStats={initialPickleballStats}
          footballOffensiveStats={initialFootballOffensiveStats}
          footballDefensiveStats={initialFootballDefensiveStats}
          footballSpecialTeamsStats={initialFootballSpecialTeamsStats}
          tennisStats={initialTennisStats}
          baseballBattingStats={initialBaseballBattingStats}
          baseballPitchingStats={initialBaseballPitchingStats}
          baseballFieldingStats={initialBaseballFieldingStats}
          volleyballStats={initialVolleyballStats}
        />
      </section>

      <div ref={announcerRef} className="sr-only" aria-live="polite" aria-atomic={true} />
    </GameLiveContext.Provider>
  );
}
