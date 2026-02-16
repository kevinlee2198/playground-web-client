import type {
  ChatMessageNode,
  ChatRoomListNode,
  ChatRoomMemberNode,
} from "@/lib/types/chat";

/** Base fields shared by all chat events */
interface ChatEventBase {
  createdDate: string;
  chatRoom: ChatRoomListNode;
}

/** A new message was sent in a chat room */
export interface ChatMessageSentEvent extends ChatEventBase {
  __typename: "ChatMessageSentEvent";
  chatMessage: ChatMessageNode;
}

/** An existing message was updated (edited) */
export interface ChatMessageUpdatedEvent extends ChatEventBase {
  __typename: "ChatMessageUpdatedEvent";
  chatMessage: ChatMessageNode;
}

/** A message was deleted (soft-delete) */
export interface ChatMessageDeletedEvent extends ChatEventBase {
  __typename: "ChatMessageDeletedEvent";
  chatMessage: ChatMessageNode;
}

/** A member was added to a chat room */
export interface ChatRoomMemberAddedEvent extends ChatEventBase {
  __typename: "ChatRoomMemberAddedEvent";
  member: ChatRoomMemberNode;
}

/** A member was removed from a chat room */
export interface ChatRoomMemberRemovedEvent extends ChatEventBase {
  __typename: "ChatRoomMemberRemovedEvent";
  userId: string;
}

/** Discriminated union for all chat event types */
export type ChatEvent =
  | ChatMessageSentEvent
  | ChatMessageUpdatedEvent
  | ChatMessageDeletedEvent
  | ChatRoomMemberAddedEvent
  | ChatRoomMemberRemovedEvent;
