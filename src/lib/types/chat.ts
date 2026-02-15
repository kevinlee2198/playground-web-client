import type { Resource } from "@/lib/types/resource";

/** A user reference as returned in chat-related queries */
export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

/** Base fields shared by all chat message types */
interface ChatMessageBase {
  id: string;
  user: ChatUser;
  createdDate: string;
  updatedDate: string | null;
  deletedDate: string | null;
  isSystemMessage: boolean;
  replyTo: ChatMessageReplyTo | null;
}

/** A text chat message */
export interface TextChatMessageNode extends ChatMessageBase {
  __typename: "TextChatMessage";
  content: string | null; // null when deleted
}

/** A media chat message (image or file) */
export interface MediaChatMessageNode extends ChatMessageBase {
  __typename: "MediaChatMessage";
  resource: Resource;
  caption: string | null;
}

/** Discriminated union for chat messages */
export type ChatMessageNode = TextChatMessageNode | MediaChatMessageNode;

/** Base fields for reply-to references */
interface ChatMessageReplyToBase {
  id: string;
  user: ChatUser;
}

/** Reply-to reference for a text message */
export interface TextChatMessageReplyTo extends ChatMessageReplyToBase {
  __typename: "TextChatMessage";
  content: string | null;
}

/** Reply-to reference for a media message */
export interface MediaChatMessageReplyTo extends ChatMessageReplyToBase {
  __typename: "MediaChatMessage";
  caption: string | null;
  resource: Resource;
}

/** Discriminated union for reply-to references */
export type ChatMessageReplyTo =
  | TextChatMessageReplyTo
  | MediaChatMessageReplyTo;

/** A chat room member */
export interface ChatRoomMemberNode {
  id: string;
  user: ChatUser;
  role: ChatRoomRole;
  joinedDate: string;
}

/** Base fields for chat room list items */
interface ChatRoomListBase {
  id: string;
  createdDate: string;
  members: {
    edges: { node: { user: ChatUser } }[];
  };
  chatMessages: {
    edges: { node: ChatMessageNode }[];
  };
}

/** A direct message chat room in the list */
export interface DirectMessageChatRoomListNode extends ChatRoomListBase {
  __typename: "DirectMessageChatRoom";
}

/** A group chat room in the list */
export interface GroupChatRoomListNode extends ChatRoomListBase {
  __typename: "GroupChatRoom";
  name: string;
}

/** A chat room as returned from the list query */
export type ChatRoomListNode =
  | DirectMessageChatRoomListNode
  | GroupChatRoomListNode;

/** Base fields for chat room detail */
interface ChatRoomDetailBase {
  id: string;
  createdDate: string;
  members: {
    edges: { cursor: string; node: ChatRoomMemberNode }[];
    pageInfo: import("@/lib/graphql-connection").PageInfo;
  };
}

/** A direct message chat room detail */
export interface DirectMessageChatRoomDetailNode extends ChatRoomDetailBase {
  __typename: "DirectMessageChatRoom";
}

/** A group chat room detail */
export interface GroupChatRoomDetailNode extends ChatRoomDetailBase {
  __typename: "GroupChatRoom";
  name: string;
}

/** A chat room as returned from the detail query */
export type ChatRoomDetailNode =
  | DirectMessageChatRoomDetailNode
  | GroupChatRoomDetailNode;

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
