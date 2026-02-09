"use client";

import {
  createChatRoom,
  findDirectMessageRoom,
} from "@/app/[locale]/chat/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

interface MessageButtonProps {
  userId: string;
}

export function MessageButton({ userId }: MessageButtonProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // First, check if a DM room already exists
      const existingRoom = await findDirectMessageRoom(userId);

      if (existingRoom) {
        // Navigate to existing room
        router.push(`/chat?room=${existingRoom.id}`);
      } else {
        // Create a new DM room
        const displayName = "Direct Message"; // Placeholder
        const result = await createChatRoom(displayName, [userId], true);

        if (result.success && result.chatRoom) {
          // Navigate to new room
          router.push(`/chat?room=${result.chatRoom.id}`);
        } else {
          toast.error(result.error || "Failed to create conversation");
        }
      }
    } catch (error) {
      console.error("Error creating/finding DM:", error);
      toast.error("Failed to start conversation");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleClick} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="mr-2 h-4 w-4" />
      )}
      {t("message")}
    </Button>
  );
}
