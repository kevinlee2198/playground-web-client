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
import { toast } from "@/components/ui/toast";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasReconnectGap, reconcileMessages } from "./chat-thread-utils";
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

/** True when the edited message's node changed (or vanished) — closes the editor rather than risk silently applying a stale edit. */
function didUserMessageChange(
  prev: ChatMessageNode | undefined,
  next: ChatMessageNode,
): boolean {
  if (!prev) return true; // gone/replaced → treat as changed
  if (!isUserChatMessage(prev) || !isUserChatMessage(next)) return true;
  return (
    prev.updatedDate !== next.updatedDate ||
    prev.deletedDate !== next.deletedDate
  );
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

  // Mirror refs so the async reconnect closure can read the LATEST values
  // without a stale-closure bug (the effect only re-runs on
  // `reconnectCounter`/`roomId`, not on every messages/editingMessageId change).
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  const editingMessageIdRef = useRef(editingMessageId);
  useEffect(() => {
    editingMessageIdRef.current = editingMessageId;
  }, [editingMessageId]);

  // Live in-session deletes of already-loaded originals; combined with the
  // authoritative `replyTo.deletedDate` (selected on load) this drives the
  // reply-quote deleted-first check in both loaded-data and live cases.
  const deletedMessageIds = useMemo(
    () =>
      new Set(
        messages
          .filter((e) => isUserChatMessage(e.node) && e.node.deletedDate)
          .map((e) => e.node.id),
      ),
    [messages],
  );

  /** Clear + non-blocking notice. Runs on remote edit/delete AND on reconcile. */
  const abandonEdit = useCallback(() => {
    setEditingMessageId(null);
    toast.add({ title: t("notices.editingInterrupted"), type: "info" });
  }, [t]);

  const handleIncomingMessage = useCallback((message: ChatMessageNode) => {
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
  }, []);

  const handleIncomingUpdate = useCallback(
    (message: ChatMessageNode) => {
      setMessages((prev) =>
        prev.map((edge) => {
          if (edge.node.id === message.id) {
            return { ...edge, node: message };
          }
          return edge;
        }),
      );
      if (message.id === editingMessageIdRef.current) abandonEdit();
    },
    [abandonEdit],
  );

  const handleIncomingDelete = useCallback(
    (message: ChatMessageNode) => {
      setMessages((prev) =>
        prev.map((edge) => {
          if (edge.node.id === message.id) {
            return { ...edge, node: message };
          }
          return edge;
        }),
      );
      if (message.id === editingMessageIdRef.current) abandonEdit();
      // Propagate the deletion into the composer's reply-in-progress, if any.
      setReplyTo((r) =>
        r && r.id === message.id
          ? { ...r, deletedDate: new Date().toISOString() }
          : r,
      );
    },
    [abandonEdit],
  );

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
  }, [
    incomingEventVersion,
    roomId,
    getIncomingEvent,
    handleIncomingMessage,
    handleIncomingUpdate,
    handleIncomingDelete,
  ]);

  // Reconnect: reconcile the recent window into the existing thread — never
  // remount the pane (composer, scroll position, and draft all survive).
  useEffect(() => {
    if (reconnectCounter === 0) return; // Skip initial render

    const reconnect = async () => {
      const [messagesData, roomData] = await Promise.all([
        loadMessages(roomId, 25),
        loadChatRoom(roomId),
      ]);

      if (roomData) {
        setRoom(roomData);
        onRoomLoaded(roomData); // re-sync chat-layout activeRoom/members
        if (roomData.__typename === "DirectMessageChatRoom") {
          setCanMessage(roomData.canMessage);
        }
      }

      if (messagesData) {
        const prevEdges = messagesRef.current;
        const prevById = new Map(prevEdges.map((e) => [e.node.id, e.node]));

        if (hasReconnectGap(prevEdges, messagesData.edges)) {
          // Honest reset: the retained tail is disconnected from the newest
          // window (>25 messages arrived while offline). Drop it and treat
          // the newest 25 as a fresh load; adopt the fresh pageInfo so
          // load-older resumes correctly. Grouping/separators recompute
          // cleanly; this is the correct trade-off over stitching a
          // corrupted middle gap.
          setMessages(messagesData.edges);
          setMessagesPageInfo(messagesData.pageInfo);
        } else {
          // No gap: reconcile in place. Do NOT overwrite messagesPageInfo —
          // preserve the older-history cursor.
          setMessages((prev) => reconcileMessages(prev, messagesData.edges));
        }

        // Editor-abandon on reconcile: close the editor if the edited
        // message's node changed (or vanished) while disconnected.
        const editingId = editingMessageIdRef.current;
        if (editingId) {
          const next = messagesData.edges.find(
            (e) => e.node.id === editingId,
          )?.node;
          if (next && didUserMessageChange(prevById.get(editingId), next)) {
            abandonEdit();
          }
        }
      }
      // DO NOT set isLoading — the pane never unmounts the composer.
    };

    reconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t/onRoomLoaded/abandonEdit intentionally omitted (stable enough in practice; re-running this effect on their identity would refire an unwanted reconnect fetch — this effect must run ONLY on reconnectCounter/roomId)
  }, [reconnectCounter, roomId]);

  function handleSendError(
    result: { errorType?: string; message?: string },
    attempted: { text?: string },
  ) {
    if (result.errorType === "MutualFollowRequiredError") {
      setCanMessage(false);
      toast.add({
        title: attempted.text
          ? t("errors.sendDisabledRecover", { content: attempted.text })
          : t("errors.sendDisabledMedia"),
        type: "error",
      });
      return;
    }
    toast.add({ title: result.message || t("errors.sendMessage"), type: "error" });
  }

  const handleSendText = async (content: string, replyToId?: string) => {
    const result = await sendMessage(roomId, content, replyToId);

    if (!result.success || !result.chatMessage) {
      handleSendError(result, { text: content });
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
  };

  const handleSendMedia = async (
    file: File,
    caption?: string,
    replyToId?: string,
  ) => {
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

    // 3. Send media message + caption + reply target, one message
    //    (auto-confirms resource -- do NOT call confirmUpload)
    const sendResult = await sendMediaMessage(
      roomId,
      uploadResult.resourceId,
      caption,
      replyToId,
    );
    if (!sendResult.success || !sendResult.chatMessage) {
      handleSendError(sendResult, { text: caption });
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

  /** Resolves to false only on an actual fetch failure (so the list can toast + re-arm the trigger). A guarded no-op (already loading / no more pages) resolves true. */
  const handleLoadOlder = async (): Promise<boolean> => {
    if (!messagesPageInfo?.hasPreviousPage || isLoadingOlder) return true;

    setIsLoadingOlder(true);
    try {
      const result = await loadMessages(
        roomId,
        25,
        messagesPageInfo.startCursor || undefined,
      );
      if (!result) return false;
      setMessages((prev) => [...result.edges, ...prev]);
      setMessagesPageInfo(result.pageInfo);
      return true;
    } finally {
      setIsLoadingOlder(false);
    }
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
        <TypographyMuted>{t("loading.conversation")}</TypographyMuted>
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
        deletedMessageIds={deletedMessageIds}
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
