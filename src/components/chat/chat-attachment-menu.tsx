"use client";

import { Button } from "@/components/ui/button";
import { getAcceptAttribute } from "@/lib/upload-validation";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

interface ChatAttachmentMenuProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function ChatAttachmentMenu({
  onFileSelected,
  disabled,
}: ChatAttachmentMenuProps) {
  const t = useTranslations("chat.media");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    onFileSelected(file);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-[60px] w-11 shrink-0"
        disabled={disabled}
        aria-label={t("attachFile")}
        onClick={() => fileInputRef.current?.click()}
      >
        <Plus className="h-5 w-5" />
      </Button>

      <input
        ref={fileInputRef}
        type="file"
        accept={getAcceptAttribute("chatMedia")}
        onChange={handleFileChange}
        className="hidden"
      />
    </>
  );
}
