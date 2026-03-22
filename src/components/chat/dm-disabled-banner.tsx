"use client";

import { TypographyMuted } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface DmDisabledBannerProps {
  className?: string;
}

export function DmDisabledBanner({ className }: DmDisabledBannerProps) {
  const t = useTranslations("chat");

  return (
    <div
      role="status"
      className={cn("border-t bg-muted/50 px-4 py-3 text-center", className)}
    >
      <TypographyMuted>{t("dmDisabled")}</TypographyMuted>
    </div>
  );
}
