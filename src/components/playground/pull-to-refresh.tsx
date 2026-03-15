"use client";

import { useScrollDirectionContext } from "@/components/playground/scroll-direction-provider";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

type PullState = "idle" | "pulling" | "threshold-reached" | "refreshing";

const THRESHOLD = 60;
const MAX_PULL = 100;

const TRANSITION_STYLE =
  "transform 250ms cubic-bezier(0.25,0.1,0.25,1), opacity 250ms cubic-bezier(0.25,0.1,0.25,1)";
const TRANSFORM_ONLY_TRANSITION =
  "transform 250ms cubic-bezier(0.25,0.1,0.25,1)";

export function PullToRefresh({
  onRefresh,
  children,
}: PullToRefreshProps): ReactNode {
  const { setPullGestureActive } = useScrollDirectionContext();
  const [pullState, setPullState] = useState<PullState>("idle");
  const [pullDistance, setPullDistance] = useState(0);

  // Mutable tracking refs — avoid re-renders during gesture and stale closures in handlers
  const touchStartY = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const isRefreshing = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (window.scrollY > 0) return;
    if (e.touches.length !== 1) return;

    touchStartY.current = e.touches[0].clientY;
  }, []);

  const resetPull = useCallback(() => {
    touchStartY.current = null;
    pullDistanceRef.current = 0;
    setPullState("idle");
    setPullDistance(0);
    setPullGestureActive(false);
  }, [setPullGestureActive]);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (touchStartY.current === null || isRefreshing.current) return;

      // If user scrolled away from top after gesture started, cancel
      if (window.scrollY > 0) {
        resetPull();
        return;
      }

      const delta = e.touches[0].clientY - touchStartY.current;

      if (delta <= 0) {
        // Upward movement — reset if we were pulling
        if (pullDistanceRef.current > 0) {
          resetPull();
        }
        return;
      }

      // Prevent native scroll/overscroll during active pull gesture
      e.preventDefault();
      setPullGestureActive(true);

      const clamped = Math.min(delta, MAX_PULL);
      pullDistanceRef.current = clamped;
      setPullDistance(clamped);
      setPullState(clamped >= THRESHOLD ? "threshold-reached" : "pulling");
    },
    [resetPull, setPullGestureActive],
  );

  const handleTouchEnd = useCallback(async () => {
    if (pullDistanceRef.current === 0 || isRefreshing.current) {
      touchStartY.current = null;
      return;
    }

    const distance = pullDistanceRef.current;
    touchStartY.current = null;
    pullDistanceRef.current = 0;

    if (distance >= THRESHOLD) {
      isRefreshing.current = true;
      setPullState("refreshing");
      setPullDistance(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        isRefreshing.current = false;
        setPullState("idle");
        setPullDistance(0);
        setPullGestureActive(false);
      }
    } else {
      setPullState("idle");
      setPullDistance(0);
      setPullGestureActive(false);
    }
  }, [onRefresh, setPullGestureActive]);

  useEffect(() => {
    // Only register on touch-capable (mobile) devices
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    const passive: AddEventListenerOptions = { passive: true };
    window.addEventListener("touchstart", handleTouchStart, passive);
    // touchmove must be non-passive to allow preventDefault during pull
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, passive);
    window.addEventListener("touchcancel", handleTouchEnd, passive);

    // Prevent native pull-to-refresh on the scroll root
    const prevOverscroll = document.documentElement.style.overscrollBehaviorY;
    document.documentElement.style.overscrollBehaviorY = "none";

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
      document.documentElement.style.overscrollBehaviorY = prevOverscroll;
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const isVisible = pullState !== "idle";
  const translateY = isVisible ? pullDistance : 0;
  // Animate only when snapping back or holding at refresh position (not during active pull)
  const shouldAnimate = pullState === "idle" || pullState === "refreshing";
  const opacity =
    pullState === "refreshing" || pullState === "threshold-reached"
      ? 1
      : pullDistance / THRESHOLD;

  return (
    <div className="relative">
      {/* Pull indicator — sits above content, slides into view */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-50 flex items-end justify-center pb-2"
        style={{
          transform: `translateY(calc(${translateY}px - 100%))`,
          opacity,
          transition: shouldAnimate ? TRANSITION_STYLE : undefined,
        }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-elevated">
          {pullState === "refreshing" ? (
            <span className="flex items-center gap-1">
              <span className="ptr-dot ptr-dot-1" />
              <span className="ptr-dot ptr-dot-2" />
              <span className="ptr-dot ptr-dot-3" />
            </span>
          ) : (
            <PullArrow flipped={pullState === "threshold-reached"} />
          )}
        </div>
      </div>

      {/* Content shifts down during pull so it doesn't overlap the indicator */}
      <div
        style={{
          transform: isVisible ? `translateY(${translateY}px)` : undefined,
          transition: shouldAnimate
            ? TRANSFORM_ONLY_TRANSITION
            : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PullArrow({ flipped }: { flipped: boolean }): ReactNode {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={cn(
        "text-primary transition-transform duration-200",
        flipped && "rotate-180",
      )}
    >
      <path
        d="M6 2v8M6 10l-3-3M6 10l3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
