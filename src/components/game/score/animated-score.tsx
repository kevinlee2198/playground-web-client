"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

const ANIMATION_DURATION = 600;

/**
 * Triggers score-pop and score-bg-pulse CSS animations on the provided
 * element refs whenever `value` changes (skipping the initial render).
 */
function useScoreAnimation(
  value: unknown,
  blockRef: React.RefObject<HTMLDivElement | null>,
  numberRef: React.RefObject<HTMLParagraphElement | null>,
): void {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Respect prefers-reduced-motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const block = blockRef.current;
    const number = numberRef.current;
    if (!block || !number) return;

    // Remove then re-add classes to retrigger the CSS animation
    block.classList.remove("animate-score-bg-pulse");
    number.classList.remove("animate-score-pop");

    // Force a reflow so the browser registers the removal before re-adding
    void block.offsetWidth;

    block.classList.add("animate-score-bg-pulse");
    number.classList.add("animate-score-pop");

    const timer = window.setTimeout(() => {
      block.classList.remove("animate-score-bg-pulse");
      number.classList.remove("animate-score-pop");
    }, ANIMATION_DURATION);

    return () => window.clearTimeout(timer);
  }, [value, blockRef, numberRef]);
}

interface AnimatedScoreProps {
  value: number | null;
  winning: boolean;
  scoreClass: string;
}

export function AnimatedScore({ value, winning, scoreClass }: AnimatedScoreProps) {
  const blockRef = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLParagraphElement>(null);

  useScoreAnimation(value, blockRef, numberRef);

  return (
    <div ref={blockRef} className="rounded-lg px-2 py-1">
      <p
        ref={numberRef}
        className={cn(
          "font-bold font-heading tabular-nums motion-reduce:animate-none",
          scoreClass,
          winning ? "text-primary" : undefined,
        )}
      >
        {value !== null ? value : "-"}
      </p>
    </div>
  );
}
