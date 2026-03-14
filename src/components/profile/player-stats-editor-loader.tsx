"use client";

import type { PlayerStatsEditorProps } from "@/components/profile/player-stats-editor";
import dynamic from "next/dynamic";

const PlayerStatsEditorDynamic = dynamic(
  () =>
    import("@/components/profile/player-stats-editor").then((m) => ({
      default: m.PlayerStatsEditor,
    })),
  { ssr: false },
);

export function PlayerStatsEditorLoader({
  initialPlayer,
}: PlayerStatsEditorProps) {
  return <PlayerStatsEditorDynamic initialPlayer={initialPlayer} />;
}
