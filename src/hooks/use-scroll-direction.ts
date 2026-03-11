"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ScrollDirection = "up" | "down" | "idle";

export interface ScrollDirectionState {
  direction: ScrollDirection;
  scrollTop: number;
  isAtTop: boolean;
}

interface UseScrollDirectionOptions {
  /** Minimum scroll distance before direction changes (prevents jitter). Default: 10 */
  threshold?: number;
}

export function useScrollDirection(
  options: UseScrollDirectionOptions = {},
): ScrollDirectionState {
  const { threshold = 10 } = options;

  const [state, setState] = useState<ScrollDirectionState>({
    direction: "idle",
    scrollTop: 0,
    isAtTop: true,
  });

  const lastScrollY = useRef(0);
  const lastDirection = useRef<ScrollDirection>("idle");
  const rafId = useRef<number | null>(null);

  const handleScroll = useCallback(() => {
    if (rafId.current !== null) return;

    rafId.current = requestAnimationFrame(() => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      let newDirection: ScrollDirection = lastDirection.current;
      if (Math.abs(diff) >= threshold) {
        newDirection = diff > 0 ? "down" : "up";
        lastScrollY.current = currentY;
        lastDirection.current = newDirection;
      }

      setState({
        direction: newDirection,
        scrollTop: currentY,
        isAtTop: currentY <= 0,
      });

      rafId.current = null;
    });
  }, [threshold]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId.current !== null) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [handleScroll]);

  return state;
}
