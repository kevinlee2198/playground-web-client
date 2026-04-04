"use client";

import { SportIcon } from "@/components/game/sport-icon";
import { cn } from "@/lib/utils";
import { getSportBgClass, getSportFgClass, type SportType } from "@/lib/constants";
import { useTranslations } from "next-intl";

const sizeStyles = {
  sm: { padding: "px-2 py-0.5", font: "text-xs", icon: "sm" as const },
  md: { padding: "px-2.5 py-1", font: "text-sm", icon: "md" as const },
  lg: { padding: "px-3 py-1.5", font: "text-base", icon: "lg" as const },
};

interface SportBadgeProps {
  sportType: SportType;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function SportBadge({
  sportType,
  size = "md",
  showLabel = false,
  className,
}: SportBadgeProps) {
  const t = useTranslations();
  const label = t(`sports.${sportType}`);
  const styles = sizeStyles[size];

  return (
    <span
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        styles.padding,
        styles.font,
        getSportBgClass(sportType),
        getSportFgClass(sportType),
        className,
      )}
    >
      <SportIcon sportType={sportType} size={styles.icon} />
      {showLabel ? <span className="ml-1">{label}</span> : null}
    </span>
  );
}
