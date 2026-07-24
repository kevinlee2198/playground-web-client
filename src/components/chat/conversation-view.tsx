"use client";

import {
  deleteMessage,
  loadChatRoom,
  loadMessages,
  sendMediaMessage,
  sendMessage,
  updateMessage,
} from "@/app/[locale]/chat/actions";
import { requestChatMediaUpload } from "@/app/[locale]/upload/actions";
import { TypographyMuted } from "@/components/ui/typography";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import { uploadToS3 } from "@/lib/s3-upload";
import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomRole,
  ChatUser,
  UserChatMessageNode,
} from "@/lib/types/chat";
import type { ChatEvent } from "@/lib/types/chat-event";
import { isUserChatMessage } from "@/lib/types/chat-guards";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/toast";
import { ConversationHeader } from "./conversation-header";
import { DeleteMessageDialog } from "./delete-message-dialog";
import { DmDisabledBanner } from "./dm-disabled-banner";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface ConversationViewProps {
  roomId: string;
  currentUser: ChatUser;
  onBack: () => void;
  onToggleMembers: () => void;
  onLastMessageUpdate: (roomId: string, message: ChatMessageNode) => void;
  onRoomLoaded: (room: ChatRoomDetailNode) => void;
  incomingEventVersion: number;
  getIncomingEvent: () => ChatEvent | null;
  reconnectCounter: number;
}

export function ConversationView({
  roomId,
  currentUser,
  onBack,
  onToggleMembers,
  onLastMessageUpdate,
  onRoomLoaded,
  incomingEventVersion,
  getIncomingEvent,
  reconnectCounter,
}: ConversationViewProps) {
  const t = useTranslations("chat");

  const [room, setRoom] = useState<ChatRoomDetailNode | null>(null);
  const [messages, setMessages] = useState<Edge<ChatMessageNode>[]>([]);
  const [messagesPageInfo, setMessagesPageInfo] = useState<PageInfo | null>(
    null,
  );
  const [replyTo, setReplyTo] = useState<UserChatMessageNode | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [canMessage, setCanMessage] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset all state when roomId changes
  useEffect(() => {
    setRoom(null);
    setMessages([]);
    setMessagesPageInfo(null);
    setReplyTo(null);
    setEditingMessageId(null);
    setIsLoading(true);
    setIsLoadingOlder(false);
    setDeleteDialogOpen(false);
    setMessageToDelete(null);
    setIsDeleting(false);
    setCanMessage(true);

    const fetchData = async () => {
      try {
        const [roomData, messagesData] = await Promise.all([
          loadChatRoom(roomId),
          loadMessages(roomId, 25),
        ]);

        if (!roomData) {
          toast.add({ title: t("errors.roomNotFound"), type: "error" });
          return;
        }

        setRoom(roomData);
        onRoomLoaded(roomData);

        // For DMs, initialize canMessage from the room's canMessage field
        if (roomData.__typename === "DirectMessageChatRoom") {
          setCanMessage(roomData.canMessage);
        }

        if (messagesData) {
          setMessages(messagesData.edges);
          setMessagesPageInfo(messagesData.pageInfo);
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
        toast.add({ title: t("errors.loadMessages"), type: "error" });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [roomId, t, onRoomLoaded]);

  // Handle incoming events from WebSocket
  useEffect(() => {
    if (incomingEventVersion === 0) return; // Skip initial render

    const event = getIncomingEvent();
    if (!event) return;

    // Guard against stale events from a room switch race condition:
    // If the user switches rooms while an event is in flight, the event
    // could target the old room. Validate before processing.
    if (event.chatRoom.id !== roomId) return;

    switch (event.__typename) {
      case "ChatMessageSentEvent":
        handleIncomingMessage(event.chatMessage);
        break;
      case "ChatMessageUpdatedEvent":
        handleIncomingUpdate(event.chatMessage);
        break;
      case "ChatMessageDeletedEvent":
        handleIncomingDelete(event.chatMessage);
        break;
      // Member events are handled in ChatLayout
    }
  }, [incomingEventVersion, roomId, getIncomingEvent]);

  // Handle reconnection: re-fetch messages
  useEffect(() => {
    if (reconnectCounter === 0) return; // Skip initial render

    const refetch = async () => {
      setIsLoading(true);
      try {
        const messagesData = await loadMessages(roomId, 25);
        if (messagesData) {
          setMessages(messagesData.edges);
          setMessagesPageInfo(messagesData.pageInfo);
        }
      } catch (error) {
        console.error("Failed to re-fetch messages on reconnect:", error);
      } finally {
        setIsLoading(false);
      }
    };

    refetch();
  }, [reconnectCounter, roomId]);

  const handleIncomingMessage = (message: ChatMessageNode) => {
    setMessages((prev) => {
      // Self-event deduplication: skip if message already exists
      if (prev.some((edge) => edge.node.id === message.id)) {
        return prev;
      }

      const newEdge: Edge<ChatMessageNode> = {
        cursor: message.id,
        node: message,
      };

      // Insert sorted by createdDate
      const insertIndex = prev.findIndex(
        (edge) =>
          new Date(edge.node.createdDate).getTime() >
          new Date(message.createdDate).getTime(),
      );

      if (insertIndex === -1) {
        // Append to end (most common case)
        return [...prev, newEdge];
      }

      // Insert at correct position
      const next = [...prev];
      next.splice(insertIndex, 0, newEdge);
      return next;
    });
  };

  const handleIncomingUpdate = (message: ChatMessageNode) => {
    setMessages((prev) =>
      prev.map((edge) => {
        if (edge.node.id === message.id) {
          return { ...edge, node: message };
        }
        return edge;
      }),
    );
  };

  const handleIncomingDelete = (message: ChatMessageNode) => {
    setMessages((prev) =>
      prev.map((edge) => {
        if (edge.node.id === message.id) {
          return { ...edge, node: message };
        }
        return edge;
      }),
    );
  };

  function handleSendError(result: { errorType?: string; message?: string }) {
    if (result.errorType === "MutualFollowRequiredError") {
      setCanMessage(false);
    }
    toast.add({ title: result.message || t("errors.sendMessage"), type: "error" });
  }

  const handleSendText = async (content: string, replyToId?: string) => {
    const result = await sendMessage(roomId, content, replyToId);

    if (!result.success || !result.chatMessage) {
      handleSendError(result);
      throw new Error("Failed to send message");
    }

    // Append the new message, but deduplicate in case the WebSocket event
    // arrived before the mutation response
    const newEdge: Edge<ChatMessageNode> = {
      cursor: result.chatMessage.id,
      node: result.chatMessage,
    };
    setMessages((prev) => {
      if (prev.some((edge) => edge.node.id === result.chatMessage!.id)) {
        return prev;
      }
      return [...prev, newEdge];
    });

    // Update last message in the room list
    onLastMessageUpdate(roomId, result.chatMessage);

    // Clear reply state
    setReplyTo(null);
  };

  const handleSendMedia = async (file: File) => {
    // 1. Request upload
    const uploadResult = await requestChatMediaUpload(
      file.name,
      file.type,
      file.size,
      roomId,
    );
    if (!uploadResult.success || !uploadResult.resourceId) {
      toast.add({ title: uploadResult.message || t("errors.sendMessage"), type: "error" });
      throw new Error("Request upload failed");
    }

    // 2. Upload to S3 (skip if uploadUrl is null for LOCAL storage dev environments)
    if (uploadResult.uploadUrl) {
      const s3Result = await uploadToS3(file, uploadResult.uploadUrl);
      if (!s3Result.success) {
        toast.add({ title: t("errors.sendMessage"), type: "error" });
        throw new Error("S3 upload failed");
      }
    }

    // 3. Send media message (auto-confirms resource -- do NOT call confirmUpload)
    const sendResult = await sendMediaMessage(roomId, uploadResult.resourceId);
    if (!sendResult.success || !sendResult.chatMessage) {
      handleSendError(sendResult);
      throw new Error("Send message failed");
    }

    // 4. Append message to list (same dedup logic as handleSendText)
    const newEdge: Edge<ChatMessageNode> = {
      cursor: sendResult.chatMessage.id,
      node: sendResult.chatMessage,
    };
    setMessages((prev) => {
      if (prev.some((edge) => edge.node.id === sendResult.chatMessage!.id)) {
        return prev;
      }
      return [...prev, newEdge];
    });

    onLastMessageUpdate(roomId, sendResult.chatMessage);
  };

  const handleEdit = async (messageId: string, content: string) => {
    const result = await updateMessage(messageId, content);

    if (!result.success) {
      toast.add({ title: result.message || t("errors.editMessage"), type: "error" });
      return;
    }

    // Update the message in the list (only text messages can be edited)
    setMessages((prev) =>
      prev.map((edge) => {
        if (
          edge.node.id === messageId &&
          edge.node.__typename === "TextChatMessage"
        ) {
          return {
            ...edge,
            node: {
              ...edge.node,
              content,
              updatedDate: new Date().toISOString(),
            },
          };
        }
        return edge;
      }),
    );

    setEditingMessageId(null);
  };

  const handleDelete = async () => {
    if (!messageToDelete) return;

    setIsDeleting(true);
    const result = await deleteMessage(messageToDelete);

    if (!result.success) {
      toast.add({ title: result.message || t("errors.deleteMessage"), type: "error" });
      setIsDeleting(false);
      return;
    }

    // Mark the message as deleted in the list
    setMessages((prev) =>
      prev.map((edge) => {
        if (edge.node.id === messageToDelete && isUserChatMessage(edge.node)) {
          return {
            ...edge,
            node: {
              ...edge.node,
              deletedDate: new Date().toISOString(),
            },
          };
        }
        return edge;
      }),
    );

    setDeleteDialogOpen(false);
    setMessageToDelete(null);
    setIsDeleting(false);
  };

  const handleLoadOlder = async () => {
    if (!messagesPageInfo?.hasPreviousPage || isLoadingOlder) return;

    setIsLoadingOlder(true);
    const result = await loadMessages(
      roomId,
      25,
      messagesPageInfo.startCursor || undefined,
    );

    if (result) {
      setMessages((prev) => [...result.edges, ...prev]);
      setMessagesPageInfo(result.pageInfo);
    }

    setIsLoadingOlder(false);
  };

  const openDeleteDialog = (messageId: string) => {
    setMessageToDelete(messageId);
    setDeleteDialogOpen(true);
  };

  // Determine current user's role
  const currentUserMember = room?.members.edges.find(
    (edge) => edge.node.user.id === currentUser.id,
  );
  const currentUserRole: ChatRoomRole | null =
    currentUserMember?.node.role || null;

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <TypographyMuted>Loading...</TypographyMuted>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <TypographyMuted>{t("errors.roomNotFound")}</TypographyMuted>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ConversationHeader
        room={room}
        currentUserId={currentUser.id}
        onToggleMembers={onToggleMembers}
        onBack={onBack}
      />

      <MessageList
        messages={messages}
        currentUserId={currentUser.id}
        currentUserRole={currentUserRole}
        onReply={(message) => setReplyTo(message)}
        onDelete={openDeleteDialog}
        onLoadOlder={handleLoadOlder}
        hasOlderMessages={messagesPageInfo?.hasPreviousPage || false}
        isLoadingOlder={isLoadingOlder}
        editingMessageId={editingMessageId}
        onStartEdit={(messageId) => setEditingMessageId(messageId)}
        onSaveEdit={handleEdit}
        onCancelEdit={() => setEditingMessageId(null)}
      />

      {!canMessage && room.__typename === "DirectMessageChatRoom" ? (
        <DmDisabledBanner />
      ) : (
        <MessageInput
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      )}

      <DeleteMessageDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
