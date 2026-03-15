"use client";

import type { ScrollDirectionState } from "@/hooks/use-scroll-direction";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useState } from "react";

interface ScrollDirectionContextValue extends ScrollDirectionState {
  /** When true, tab bar/FAB should ignore scroll direction changes (e.g., during a pull-to-refresh gesture) */
  isPullGestureActive: boolean;
  setPullGestureActive: (active: boolean) => void;
}

const ScrollDirectionContext = createContext<ScrollDirectionContextValue>({
  direction: "idle",
  scrollTop: 0,
  isAtTop: true,
  isPullGestureActive: false,
  setPullGestureActive: () => {},
});

interface ScrollDirectionProviderProps {
  children: ReactNode;
}

export function ScrollDirectionProvider({
  children,
}: ScrollDirectionProviderProps): ReactNode {
  const scrollState = useScrollDirection({ threshold: 10 });
  const [isPullGestureActive, setIsPullGestureActive] = useState(false);
  const setPullGestureActive = useCallback(
    (active: boolean) => setIsPullGestureActive(active),
    [],
  );
  return (
    <ScrollDirectionContext
      value={{ ...scrollState, isPullGestureActive, setPullGestureActive }}
    >
      {children}
    </ScrollDirectionContext>
  );
}

export function useScrollDirectionContext(): ScrollDirectionContextValue {
  return useContext(ScrollDirectionContext);
}
