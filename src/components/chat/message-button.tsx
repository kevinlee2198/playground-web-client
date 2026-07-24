"use client";

import { createDirectMessage } from "@/app/[locale]/chat/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { Loader2, MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "@/components/ui/toast";

interface MessageButtonProps {
  userId: number;
}

export function MessageButton({ userId }: MessageButtonProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);

    try {
      // Idempotent: returns existing DM if one already exists
      const result = await createDirectMessage(userId);

      if (result.success && result.chatRoom) {
        router.push(`/chat?room=${result.chatRoom.id}`);
      } else if (result.errorType === "UserBlockedError") {
        toast.add({ title: t("cannotMessageBlocked"), type: "error" });
      } else {
        toast.add({ title: result.message || "Failed to create conversation", type: "error" });
      }
    } catch (error) {
      console.error("Error creating/finding DM:", error);
      toast.add({ title: "Failed to start conversation", type: "error" });
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
