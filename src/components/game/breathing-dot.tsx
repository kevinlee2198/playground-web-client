import { cn } from "@/lib/utils";

interface BreathingDotProps {
  className?: string;
}

export function BreathingDot({ className }: BreathingDotProps) {
  return (
    <span
      data-testid="breathing-dot"
      aria-hidden="true"
      className={cn(
        "inline-block size-2 rounded-full bg-live animate-breathe motion-reduce:animate-none",
        className,
      )}
    />
  );
}
