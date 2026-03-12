import { cn } from "@/lib/utils";
import type { SportType } from "@/lib/constants";

const sportColorClass: Record<SportType, string> = {
  BASKETBALL: "bg-sport-basketball-foreground",
  TENNIS: "bg-sport-tennis-foreground",
  FOOTBALL: "bg-sport-football-foreground",
};

interface SportAccentStripProps {
  sportType: SportType;
  className?: string;
}

export function SportAccentStrip({ sportType, className }: SportAccentStripProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[3px] w-full rounded-t-xl", sportColorClass[sportType], className)}
    />
  );
}
