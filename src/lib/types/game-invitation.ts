import type { GameInvitationStatus } from "@/lib/constants";

/** User reference on an invitation */
export interface InvitationUserRef {
  id: string;
  displayName: string;
  username: string;
}

/** Full invitation record for the organizer's invitation list */
export interface GameInvitation {
  id: string;
  inviter: InvitationUserRef;
  invitee: InvitationUserRef;
  status: GameInvitationStatus;
  acceptedDate: string | null;
  createdDate: string;
}

/** Minimal invitation shape for Game.viewerInvitation */
export interface ViewerGameInvitation {
  id: string;
  status: GameInvitationStatus;
  inviter: {
    id: string;
    displayName: string;
  };
}

/** Result of sendGameInvitation (single) */
export interface SendInvitationResult {
  success: boolean;
  invitation?: { id: string; status: GameInvitationStatus };
  errorType?: string;
  message?: string;
}

/** One entry in bulk send response */
export interface GameInvitationBulkItemResult {
  userId: string;
  invitation: { id: string; status: GameInvitationStatus } | null;
  error: { message: string } | null;
}

/** Result of sendGameInvitations (bulk) */
export interface SendInvitationsResult {
  success: boolean;
  results?: GameInvitationBulkItemResult[];
  errorType?: string;
  message?: string;
}

/** Result of accept/decline/cancel actions */
export interface InvitationActionResult {
  success: boolean;
  errorType?: string;
  message?: string;
}
