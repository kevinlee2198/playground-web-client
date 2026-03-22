import type { Resource } from "@/lib/types/resource";

/** A user reference as returned in chat-related queries */
export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

/** Base fields shared by ALL chat message types (interface: ChatMessage) */
interface ChatMessageBase {
  id: string;
  createdDate: string;
}

/** Fields shared by user-authored messages (interface: UserChatMessage) */
interface UserChatMessageBase extends ChatMessageBase {
  user: ChatUser;
  updatedDate: string | null;
  deletedDate: string | null;
  replyTo: ChatMessageReplyTo | null;
}

/** A text chat message */
export interface TextChatMessageNode extends UserChatMessageBase {
  __typename: "TextChatMessage";
  content: string | null; // null when deleted
}

/** A media chat message (image or file) */
export interface MediaChatMessageNode extends UserChatMessageBase {
  __typename: "MediaChatMessage";
  resource: Resource;
  caption: string | null;
}

/** Discriminated union for user-authored chat messages */
export type UserChatMessageNode = TextChatMessageNode | MediaChatMessageNode;

/** A system message: member joined */
export interface MemberJoinedChatMessageNode extends ChatMessageBase {
  __typename: "MemberJoinedChatMessage";
  member: ChatUser;
}

/** A system message: member left */
export interface MemberLeftChatMessageNode extends ChatMessageBase {
  __typename: "MemberLeftChatMessage";
  member: ChatUser;
}

/** Discriminated union for system chat messages */
export type SystemChatMessageNode =
  | MemberJoinedChatMessageNode
  | MemberLeftChatMessageNode;

/** Discriminated union for ALL chat message types */
export type ChatMessageNode = UserChatMessageNode | SystemChatMessageNode;

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
  lastModifiedDate?: string;
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
  lastModifiedDate?: string;
  members: {
    edges: { cursor: string; node: ChatRoomMemberNode }[];
    pageInfo: import("@/lib/graphql-connection").PageInfo;
  };
}

/** A direct message chat room detail */
export interface DirectMessageChatRoomDetailNode extends ChatRoomDetailBase {
  __typename: "DirectMessageChatRoom";
  /** Whether the viewer can send messages (mutual follow check for DMs) */
  canMessage: boolean;
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

/** A mutual follow user for the people selector in chat */
export interface MutualFollowUser {
  id: string;
  displayName: string;
  username: string;
  profilePicture: {
    __typename: "ImageResource";
    thumbnailUrl: string | null;
  } | null;
}

/** Error returned when a DM or member addition requires mutual follow */
export interface MutualFollowRequiredError {
  __typename: "MutualFollowRequiredError";
  message: string;
}

export type ChatRoomRole = "OWNER" | "ADMIN" | "MEMBER";
