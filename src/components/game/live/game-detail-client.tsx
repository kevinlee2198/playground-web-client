"use client";

import { GameBoxScores } from "@/components/game/game-box-scores";
import { GameDetailActions } from "@/components/game/game-detail-actions";
import { GameMediaGallery } from "@/components/game/game-media-gallery";
import { GameParticipants } from "@/components/game/game-participants";
import { useGameSubscription } from "@/hooks/use-game-subscription";
import { isKnownGameEventType } from "@/lib/types/game-event";
import type { GameDetail } from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
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

interface GameLiveContextValue {
  game: LiveGameState["game"];
  boxScores: LiveGameState["boxScores"];
  isConnected: LiveGameState["isConnected"];
}

const GameLiveContext = createContext<GameLiveContextValue | null>(null);

export function useGameLiveContext(): GameLiveContextValue | null {
  return useContext(GameLiveContext);
}

interface GameDetailClientProps {
  game: GameDetail;
  initialBoxScores: { node: BasketballBoxScoreNode }[];
  playerId: number;
  canUpload: boolean;
  children: ReactNode;
}

export function GameDetailClient({
  game,
  initialBoxScores,
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

  return (
    <GameLiveContext.Provider
      value={{
        game: state.game,
        boxScores: state.boxScores,
        isConnected: state.isConnected,
      }}
    >
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
        />
      </section>

      <div ref={announcerRef} className="sr-only" aria-live="polite" aria-atomic={true} />
    </GameLiveContext.Provider>
  );
}
