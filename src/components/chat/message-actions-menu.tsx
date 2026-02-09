"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface MessageActionsMenuProps {
  isOwn: boolean;
  canDelete: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: () => void;
}

export function MessageActionsMenu({
  isOwn,
  canDelete,
  onReply,
  onEdit,
  onDelete,
}: MessageActionsMenuProps) {
  const t = useTranslations("chat.message");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 focus:opacity-100"
          />
        }
      >
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onReply}>
          <Reply className="mr-2 h-4 w-4" />
          {t("reply")}
        </DropdownMenuItem>
        {isOwn && onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            {t("edit")}
          </DropdownMenuItem>
        )}
        {(isOwn || canDelete) && (
          <DropdownMenuItem onClick={onDelete} variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            {t("delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
