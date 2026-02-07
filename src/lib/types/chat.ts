/** A user reference as returned in chat-related queries */
export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
}

/** A chat message as returned from queries */
export interface ChatMessageNode {
  id: string;
  user: ChatUser;
  content: string | null; // null when deleted
  createdDate: string;
  updatedDate: string | null;
  deletedDate: string | null;
  isSystemMessage: boolean;
  replyTo: ChatMessageReplyTo | null;
}

/** Minimal reply-to reference */
export interface ChatMessageReplyTo {
  id: string;
  user: ChatUser;
  content: string | null;
}

/** A chat room member */
export interface ChatRoomMemberNode {
  id: string;
  user: ChatUser;
  role: ChatRoomRole;
  joinedDate: string;
}

/** A chat room as returned from the list query */
export interface ChatRoomListNode {
  id: string;
  name: string;
  isDirectMessage: boolean;
  createdDate: string;
  members: {
    edges: { node: { user: ChatUser } }[];
  };
  chatMessages: {
    edges: { node: ChatMessageNode }[];
  };
}

/** A chat room as returned from the detail query */
export interface ChatRoomDetailNode {
  id: string;
  name: string;
  isDirectMessage: boolean;
  createdDate: string;
  members: {
    edges: { cursor: string; node: ChatRoomMemberNode }[];
    pageInfo: import("@/lib/graphql-connection").PageInfo;
  };
}

/** A friendship edge for the friend selector */
export interface FriendshipNode {
  id: string;
  requester: ChatUser;
  addressee: ChatUser;
  status: string;
}

/** Friend item derived from a friendship for easier consumption */
export interface FriendItem {
  userId: string;
  firstName: string;
  lastName: string;
}

export type ChatRoomRole = "OWNER" | "ADMIN" | "MEMBER";
