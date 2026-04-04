import { cn } from "@/lib/utils";
import { getSportAccentClass, type SportType } from "@/lib/constants";

interface SportAccentStripProps {
  sportType: SportType;
  className?: string;
}

export function SportAccentStrip({ sportType, className }: SportAccentStripProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-[3px] w-full rounded-t-xl", getSportAccentClass(sportType), className)}
    />
  );
}
