"use client";

import {
  createDirectMessage,
  createGroupChat,
} from "@/app/[locale]/chat/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ChatRoomListNode } from "@/lib/types/chat";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FriendSelector } from "./friend-selector";

interface CreateChatRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRoomCreated: (room: ChatRoomListNode) => void;
  currentUserId: string;
}

export function CreateChatRoomDialog({
  open,
  onOpenChange,
  onRoomCreated,
  currentUserId,
}: CreateChatRoomDialogProps) {
  const t = useTranslations("chat");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleCreate = () => {
    if (selectedIds.length === 0) {
      return;
    }

    if (selectedIds.length === 1) {
      // DM: idempotent mutation handles existing room check
      startTransition(async () => {
        try {
          const result = await createDirectMessage(selectedIds[0]);

          if (result.success && result.chatRoom) {
            onRoomCreated(result.chatRoom);
            onOpenChange(false);
            resetForm();
          } else {
            toast.error(result.error || t("errors.createRoom"));
          }
        } catch (error) {
          console.error("Error in DM creation:", error);
          toast.error(t("errors.createRoom"));
        }
      });
    } else {
      // Group chat
      if (!groupName.trim()) {
        toast.error(t("groupNameRequired"));
        return;
      }

      startTransition(async () => {
        try {
          const result = await createGroupChat(groupName.trim(), selectedIds);

          if (result.success && result.chatRoom) {
            onRoomCreated(result.chatRoom);
            onOpenChange(false);
            resetForm();
          } else {
            toast.error(result.error || t("errors.createRoom"));
          }
        } catch (error) {
          console.error("Error in group creation:", error);
          toast.error(t("errors.createRoom"));
        }
      });
    }
  };

  const resetForm = () => {
    setSelectedIds([]);
    setGroupName("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isPending) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("newChat")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FriendSelector
            selectedIds={selectedIds}
            onSelectionChange={setSelectedIds}
            currentUserId={currentUserId}
          />

          {selectedIds.length >= 2 && (
            <div>
              <label htmlFor="group-name" className="text-sm font-medium">
                {t("groupName")}
              </label>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t("groupName")}
                disabled={isPending}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            {t("message.cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={selectedIds.length === 0 || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("createRoom")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
