"use client";

import {
  deleteMessage,
  loadChatRoom,
  loadMessages,
  sendMessage,
  updateMessage,
} from "@/app/[locale]/chat/actions";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomRole,
  ChatUser,
} from "@/lib/types/chat";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ConversationHeader } from "./conversation-header";
import { DeleteMessageDialog } from "./delete-message-dialog";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

interface ConversationViewProps {
  roomId: string;
  currentUser: ChatUser;
  onBack: () => void;
  onToggleMembers: () => void;
  onLastMessageUpdate: (roomId: string, message: ChatMessageNode) => void;
  onRoomLoaded: (room: ChatRoomDetailNode) => void;
}

export function ConversationView({
  roomId,
  currentUser,
  onBack,
  onToggleMembers,
  onLastMessageUpdate,
  onRoomLoaded,
}: ConversationViewProps) {
  const t = useTranslations("chat");

  const [room, setRoom] = useState<ChatRoomDetailNode | null>(null);
  const [messages, setMessages] = useState<Edge<ChatMessageNode>[]>([]);
  const [messagesPageInfo, setMessagesPageInfo] = useState<PageInfo | null>(
    null,
  );
  const [replyTo, setReplyTo] = useState<ChatMessageNode | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
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

    const fetchData = async () => {
      try {
        const [roomData, messagesData] = await Promise.all([
          loadChatRoom(roomId),
          loadMessages(roomId, 25),
        ]);

        if (!roomData) {
          toast.error(t("errors.roomNotFound"));
          return;
        }

        setRoom(roomData);
        onRoomLoaded(roomData);

        if (messagesData) {
          setMessages(messagesData.edges);
          setMessagesPageInfo(messagesData.pageInfo);
        }
      } catch (error) {
        console.error("Failed to load conversation:", error);
        toast.error(t("errors.loadMessages"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [roomId, t, onRoomLoaded]);

  const handleSend = async (content: string, replyToId?: string) => {
    const result = await sendMessage(roomId, content, replyToId);

    if (!result.success || !result.message) {
      toast.error(result.error || t("errors.sendMessage"));
      throw new Error("Failed to send message");
    }

    // Append the new message to the list
    const newEdge: Edge<ChatMessageNode> = {
      cursor: result.message.id,
      node: result.message,
    };
    setMessages((prev) => [...prev, newEdge]);

    // Update last message in the room list
    onLastMessageUpdate(roomId, result.message);

    // Clear reply state
    setReplyTo(null);
  };

  const handleEdit = async (messageId: string, content: string) => {
    const result = await updateMessage(messageId, content);

    if (!result.success) {
      toast.error(result.error || t("errors.editMessage"));
      return;
    }

    // Update the message in the list
    setMessages((prev) =>
      prev.map((edge) => {
        if (edge.node.id === messageId) {
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
      toast.error(result.error || t("errors.deleteMessage"));
      setIsDeleting(false);
      return;
    }

    // Mark the message as deleted in the list
    setMessages((prev) =>
      prev.map((edge) => {
        if (edge.node.id === messageToDelete) {
          return {
            ...edge,
            node: {
              ...edge.node,
              content: null,
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
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <div className="text-muted-foreground">{t("errors.roomNotFound")}</div>
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

      <MessageInput
        onSend={handleSend}
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
      />

      <DeleteMessageDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
