"use client";

import { Badge } from "@/components/ui/badge";
import { TypographySmall } from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface FollowsYouBadgeProps {
  className?: string;
}

export function FollowsYouBadge({ className }: FollowsYouBadgeProps) {
  const t = useTranslations("profile.follow");

  return (
    <Badge variant="secondary" className={cn("text-xs", className)}>
      <TypographySmall>{t("followsYou")}</TypographySmall>
    </Badge>
  );
}
