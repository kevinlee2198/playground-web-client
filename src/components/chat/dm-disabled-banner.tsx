"use client";

import { TypographyMuted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DmDisabledBannerProps {
  className?: string;
  /** Overrides the default direct-message copy */
  message?: string;
}

export function DmDisabledBanner({ className, message }: DmDisabledBannerProps) {
  const t = useTranslations("chat");

  return (
    <div
      role="status"
      className={cn("border-t bg-muted/50 px-4 py-3 text-center", className)}
    >
      <TypographyMuted>{message ?? t("dmDisabled")}</TypographyMuted>
    </div>
  );
}
