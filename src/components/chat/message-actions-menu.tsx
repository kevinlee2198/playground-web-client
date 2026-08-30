"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Edit, MoreHorizontal, Reply, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface MessageActionsMenuProps {
  isOwn: boolean;
  canDelete: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  className?: string;
}

export function MessageActionsMenu({
  isOwn,
  canDelete,
  onReply,
  onEdit,
  onDelete,
  className,
}: MessageActionsMenuProps) {
  const t = useTranslations("chat.message");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("moreActions")}
            className={cn(
              // ≥44px touch target on mobile; reverts to the original,
              // subtle 24px control on desktop (icon itself stays h-4 w-4).
              "size-11 opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100 motion-safe:transition-opacity md:size-6",
              className,
            )}
          />
        }
      >
        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
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
