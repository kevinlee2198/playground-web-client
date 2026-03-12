"use client";

import type { ScrollDirectionState } from "@/hooks/use-scroll-direction";
import { useScrollDirection } from "@/hooks/use-scroll-direction";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

const ScrollDirectionContext = createContext<ScrollDirectionState>({
  direction: "idle",
  scrollTop: 0,
  isAtTop: true,
});

interface ScrollDirectionProviderProps {
  children: ReactNode;
}

export function ScrollDirectionProvider({
  children,
}: ScrollDirectionProviderProps): ReactNode {
  const value = useScrollDirection({ threshold: 10 });
  return (
    <ScrollDirectionContext value={value}>
      {children}
    </ScrollDirectionContext>
  );
}

export function useScrollDirectionContext(): ScrollDirectionState {
  return useContext(ScrollDirectionContext);
}
