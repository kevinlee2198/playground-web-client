import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface WinnerMarkProps {
  className?: string;
}

/** Amber crown shown beside the winning participant of a completed game. */
export function WinnerMark({ className }: WinnerMarkProps) {
  const t = useTranslations();

  return (
    <span className={cn("inline-flex items-center", className)}>
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        className="size-3.5 text-celebrate"
      >
        <path d="M3 18.5 4.5 7.5 9 11.5 12 4.5l3 7 4.5-4L21 18.5Zm0 2h18v1.5H3Z" />
      </svg>
      <span className="sr-only">{t("game.winner")}</span>
    </span>
  );
}
