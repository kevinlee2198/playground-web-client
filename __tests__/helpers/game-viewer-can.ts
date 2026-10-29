import type { GameViewerCan } from "@/lib/types/game";

/** A viewerCan object with every capability false, plus overrides. */
export function gameViewerCan(
  overrides: Partial<GameViewerCan> = {},
): GameViewerCan {
  return {
    update: false,
    delete: false,
    start: false,
    end: false,
    cancel: false,
    finalizeResults: false,
    unfinalizeResults: false,
    manageEditors: false,
    invite: false,
    enterStats: false,
    enterOwnStats: false,
    join: false,
    addParticipants: false,
    addMedia: false,
    moderateMedia: false,
    reportResult: false,
    confirmResult: false,
    disputeResult: false,
    voidResult: false,
    reschedule: false,
    forfeit: false,
    ...overrides,
  };
}
