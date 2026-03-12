# PR 2: Navigation Restructure

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the marketing-style navbar + inline links with a simplified navbar (logo, search, notifications, avatar) and a new TabBar component (bottom on mobile/tablet, top on desktop) for in-app navigation.

**Architecture:** The TabBar is a new client component that reads auth state via `useSession()` and active route via `usePathname()`. It renders `null` for unauthenticated users. On mobile/tablet (`<lg`), it is fixed to the viewport bottom with safe-area padding. On desktop (`lg+`), it is static in the document flow below the navbar. A `useScrollDirection` hook powers hide-on-scroll for the TabBar and a floating action button (FAB) on mobile. The navbar is stripped of marketing links and inline auth links — those responsibilities move to the TabBar and footer respectively. A skip-to-content link is added for WCAG 2.1 Level A compliance.

**Tech Stack:** Next.js 16 App Router, React client components, Tailwind CSS v4, next-intl, Lucide icons, Better Auth (`useSession`), existing `@/i18n/navigation` routing wrappers

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/hooks/use-scroll-direction.ts` | Shared scroll direction hook (RAF-throttled, provides `direction`, `scrollTop`, `isAtTop`) |
| Create | `src/hooks/use-scroll-direction.test.ts` | Tests for the scroll direction hook |
| Create | `src/components/playground/scroll-direction-provider.tsx` | Context provider — calls `useScrollDirection` once, shares values with TabBar and FAB via React context (avoids duplicate scroll listeners) |
| Create | `src/components/playground/tab-bar.tsx` | TabBar component — bottom on mobile, top on desktop, auth-gated |
| Create | `src/components/playground/tab-bar.test.tsx` | Tests for TabBar |
| Create | `src/components/playground/new-game-fab.tsx` | Floating action button for "New Game" on mobile — Feed and Games pages only |
| Create | `src/components/playground/skip-nav-link.tsx` | Visually-hidden skip-to-content link (WCAG 2.1 A) |
| Modify | `src/components/playground/navbar.tsx` | Strip marketing links and NavigationMenu, keep logo + search (desktop) + notifications + avatar. Add New Game button (desktop) |
| Modify | `src/app/[locale]/layout.tsx` | Integrate TabBar, SkipNavLink, add `id="main-content"` on `<main>`, add bottom padding for mobile tab bar |
| Modify | `src/app/[locale]/chat/page.tsx` | Update height calculation to account for TabBar height at `lg` breakpoint |
| Modify | `messages/en.json` | Add `nav.feed`, `nav.games`, `nav.messages`, `nav.profile` translation keys |
| Delete | `src/components/playground/navbar-auth-links.tsx` | Links move to TabBar — this file is no longer needed |

### Key Design Decisions

1. **Breakpoint: `lg` (1024px)** — The mobile/desktop layout split happens at `lg`, not `md`. Tablet users (768–1024px) get the mobile bottom tab bar because they hold devices like phones. This is per the design addendum, overriding any earlier `md` references.

2. **Tab items:** Feed (`/`), Games (`/games`), Messages (`/chat`), Profile (`/player`). All auth-gated — TabBar renders `null` when not authenticated.

3. **New Game button:** Desktop navbar shows a button that opens the existing `<CreateGameDialog />`. Mobile shows a FAB that does the same. No `/games/new` route exists — the dialog is the stopgap. The FAB only appears on Feed and Games pages.

4. **Active route matching:** Exact match for `/` (Feed), startsWith for `/games`, `/chat`, `/player`.

5. **Scroll hide/show:** Tab bar and FAB hide on scroll-down, reveal on scroll-up on mobile only. Desktop tab bar is always visible. A shared `useScrollDirection` hook coordinates both.

6. **Footer:** Stays as-is. Marketing links remain in the footer. The footer is visible after scrolling past main content. Bottom padding on `<body>` (applied conditionally via server-side auth check) prevents the fixed tab bar from overlapping for authenticated users.

### Known Gaps (deferred to follow-up PRs)

These items are specified in the design addendum but intentionally deferred from this PR to keep scope manageable:

- **Virtual keyboard detection:** Tab bar should hide when the virtual keyboard opens on mobile (uses `visualViewport` API). Deferred — mainly affects the chat page.
- **Pull-to-refresh:** The `useScrollDirection` hook provides the foundation, but the actual pull-to-refresh gesture handler is a separate feature.
- **Search mobile overlay:** Phase 1 search experience (full-screen overlay on mobile) is its own PR.
- **Notification center visual update:** Terracotta badge styling is a separate PR.

---

## Chunk 1: useScrollDirection Hook

### Task 1: Create `useScrollDirection` hook

**Files:**
- Create: `src/hooks/use-scroll-direction.ts`
- Create: `src/hooks/use-scroll-direction.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/hooks/use-scroll-direction.test.ts
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollDirection } from "./use-scroll-direction";

describe("useScrollDirection", () => {
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    // Mock requestAnimationFrame to execute synchronously
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    // Reset scrollY
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function simulateScroll(y: number) {
    Object.defineProperty(window, "scrollY", { value: y, writable: true });
    window.dispatchEvent(new Event("scroll"));
    // Flush RAF
    if (rafCallback) {
      rafCallback(performance.now());
      rafCallback = null;
    }
  }

  it("returns idle direction and isAtTop=true initially", () => {
    const { result } = renderHook(() => useScrollDirection());
    expect(result.current.direction).toBe("idle");
    expect(result.current.isAtTop).toBe(true);
    expect(result.current.scrollTop).toBe(0);
  });

  it("detects scroll-down direction after passing threshold", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(15));

    expect(result.current.direction).toBe("down");
    expect(result.current.isAtTop).toBe(false);
  });

  it("does not change direction within threshold", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(5));

    expect(result.current.direction).toBe("idle");
  });

  it("detects scroll-up direction", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(100));
    act(() => simulateScroll(80));

    expect(result.current.direction).toBe("up");
  });

  it("reports isAtTop when scrolled back to 0", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(50));
    act(() => simulateScroll(0));

    expect(result.current.isAtTop).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useScrollDirection());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/hooks/use-scroll-direction.test.ts`
Expected: FAIL — module `./use-scroll-direction` not found

- [ ] **Step 3: Implement the hook**

```typescript
// src/hooks/use-scroll-direction.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ScrollDirection = "up" | "down" | "idle";

interface ScrollDirectionState {
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/hooks/use-scroll-direction.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds (unused hook is tree-shaken, no errors)

- [ ] **Step 6: Commit**

```bash
git add src/hooks/use-scroll-direction.ts src/hooks/use-scroll-direction.test.ts
git commit -m "feat(nav): add useScrollDirection hook for tab bar hide/show"
```

---

### Task 2: Create the ScrollDirectionProvider

**Files:**
- Create: `src/components/playground/scroll-direction-provider.tsx`

The `useScrollDirection` hook must only be called **once** to avoid duplicate scroll event listeners. This provider calls the hook and exposes the values via React context. Both `TabBar` and `NewGameFab` consume the context instead of calling the hook directly.

- [ ] **Step 1: Create the provider**

```tsx
// src/components/playground/scroll-direction-provider.tsx
"use client";

import { useScrollDirection } from "@/hooks/use-scroll-direction";
import { createContext, useContext } from "react";

type ScrollDirection = "up" | "down" | "idle";

interface ScrollDirectionContextValue {
  direction: ScrollDirection;
  scrollTop: number;
  isAtTop: boolean;
}

const ScrollDirectionContext = createContext<ScrollDirectionContextValue>({
  direction: "idle",
  scrollTop: 0,
  isAtTop: true,
});

export function ScrollDirectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useScrollDirection({ threshold: 10 });
  return (
    <ScrollDirectionContext value={value}>
      {children}
    </ScrollDirectionContext>
  );
}

export function useScrollDirectionContext() {
  return useContext(ScrollDirectionContext);
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/scroll-direction-provider.tsx
git commit -m "feat(nav): add ScrollDirectionProvider to share single scroll listener"
```

---

## Chunk 2: TabBar Component

### Task 3: Add i18n keys for navigation tabs

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add nav translation keys**

Add a `"nav"` section to `messages/en.json` at the top level (alongside `"header"`, `"footer"`, etc.):

```json
"nav": {
  "feed": "Feed",
  "games": "Games",
  "messages": "Messages",
  "profile": "Profile",
  "newGame": "New Game"
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat(i18n): add navigation tab translation keys"
```

---

### Task 4: Create the TabBar component

**Files:**
- Create: `src/components/playground/tab-bar.tsx`
- Create: `src/components/playground/tab-bar.test.tsx`

- [ ] **Step 1: Write the test file**

```tsx
// src/components/playground/tab-bar.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  usePathname: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "nav.feed": "Feed",
      "nav.games": "Games",
      "nav.messages": "Messages",
      "nav.profile": "Profile",
    };
    return map[key] ?? key;
  },
}));

vi.mock("./scroll-direction-provider", () => ({
  useScrollDirectionContext: () => ({
    direction: "idle" as const,
    scrollTop: 0,
    isAtTop: true,
  }),
}));

import { useSession } from "@/lib/auth-client";
import { usePathname } from "@/i18n/navigation";
import { TabBar } from "./tab-bar";

const mockUseSession = vi.mocked(useSession);
const mockUsePathname = vi.mocked(usePathname);

describe("TabBar", () => {
  it("renders null when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: false,
      error: null,
    } as any);
    mockUsePathname.mockReturnValue("/");

    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null while session is pending", () => {
    mockUseSession.mockReturnValue({
      data: null,
      isPending: true,
      error: null,
    } as any);
    mockUsePathname.mockReturnValue("/");

    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all four tabs when authenticated", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", name: "Test" } },
      isPending: false,
      error: null,
    } as any);
    mockUsePathname.mockReturnValue("/");

    render(<TabBar />);

    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("marks Feed tab as active on root path", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", name: "Test" } },
      isPending: false,
      error: null,
    } as any);
    mockUsePathname.mockReturnValue("/");

    render(<TabBar />);

    const feedLink = screen.getByText("Feed").closest("a");
    expect(feedLink).toHaveAttribute("aria-current", "page");
  });

  it("marks Games tab as active on /games path", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", name: "Test" } },
      isPending: false,
      error: null,
    } as any);
    mockUsePathname.mockReturnValue("/games");

    render(<TabBar />);

    const gamesLink = screen.getByText("Games").closest("a");
    expect(gamesLink).toHaveAttribute("aria-current", "page");
  });

  it("has navigation role and aria-label", () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "1", name: "Test" } },
      isPending: false,
      error: null,
    } as any);
    mockUsePathname.mockReturnValue("/");

    render(<TabBar />);

    expect(screen.getByRole("navigation", { name: /main/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/playground/tab-bar.test.tsx`
Expected: FAIL — module `./tab-bar` not found

- [ ] **Step 3: Implement the TabBar component**

```tsx
// src/components/playground/tab-bar.tsx
"use client";

import { Link, usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Gamepad2, Home, MessageCircle, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { TypographySmall } from "../ui/typography";
import { useScrollDirectionContext } from "./scroll-direction-provider";

interface TabItem {
  labelKey: string;
  href: string;
  icon: typeof Home;
  match: (pathname: string) => boolean;
}

const TABS: TabItem[] = [
  {
    labelKey: "nav.feed",
    href: "/",
    icon: Home,
    match: (p) => p === "/" || p === "",
  },
  {
    labelKey: "nav.games",
    href: "/games",
    icon: Gamepad2,
    match: (p) => p === "/games" || p.startsWith("/games/"),
  },
  {
    labelKey: "nav.messages",
    href: "/chat",
    icon: MessageCircle,
    match: (p) => p === "/chat" || p.startsWith("/chat/"),
  },
  {
    labelKey: "nav.profile",
    href: "/player",
    icon: User,
    match: (p) => p === "/player" || p.startsWith("/player/"),
  },
];

export function TabBar() {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const t = useTranslations();
  const { direction } = useScrollDirectionContext();

  // Desktop placeholder during loading to prevent layout shift
  if (isPending) {
    return (
      <nav aria-hidden className="hidden border-b lg:block">
        <div className="mx-auto flex max-w-7xl items-center lg:gap-1 lg:px-6 lg:py-2.5">
          <span className="lg:text-sm">&nbsp;</span>
        </div>
      </nav>
    );
  }

  if (!session?.user) return null;

  // On mobile, hide when scrolling down
  const isHidden = direction === "down";

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        // Mobile: fixed bottom bar
        "fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur-sm",
        "pb-[env(safe-area-inset-bottom)]",
        "transition-transform duration-250 ease-[cubic-bezier(0.25,0.1,0.25,1)] will-change-transform motion-reduce:transition-none",
        isHidden ? "translate-y-full" : "translate-y-0",
        // Desktop: static top bar below navbar
        "lg:static lg:z-auto lg:border-b lg:border-t-0 lg:bg-background lg:pb-0",
        "lg:translate-y-0 lg:backdrop-blur-none lg:will-change-auto",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center lg:gap-1 lg:px-6">
        {TABS.map((tab) => {
          const isActive = tab.match(pathname);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => {
                if (isActive) {
                  e.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={cn(
                // Mobile: vertical icon + label, equal-width grid
                "flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 py-1.5",
                "touch-action-manipulation transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "active:scale-95 active:transition-transform active:duration-100",
                // Desktop: horizontal text tabs with bottom border
                "lg:inline-flex lg:flex-none lg:flex-row lg:items-center lg:gap-0",
                "lg:px-4 lg:py-2.5 lg:text-sm lg:font-medium",
                "lg:border-b-2 lg:-mb-px",
                // Active styles
                isActive
                  ? cn(
                      "text-primary",
                      "lg:border-primary lg:text-primary",
                    )
                  : cn(
                      "text-muted-foreground",
                      "lg:border-transparent lg:text-muted-foreground",
                      "lg:hover:text-foreground lg:hover:border-border",
                    ),
              )}
            >
              {/* Mobile icon — hidden on desktop */}
              <Icon
                size={20}
                className="lg:hidden"
                fill={isActive ? "currentColor" : "none"}
                aria-hidden="true"
              />
              {/* Label — small on mobile, normal on desktop */}
              <TypographySmall
                className={cn(
                  "text-[10px] leading-tight lg:text-sm",
                  isActive && "font-semibold lg:font-medium",
                )}
              >
                {t(tab.labelKey)}
              </TypographySmall>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/components/playground/tab-bar.test.tsx`
Expected: All 6 tests PASS

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Commit**

```bash
git add src/components/playground/tab-bar.tsx src/components/playground/tab-bar.test.tsx
git commit -m "feat(nav): add TabBar component with responsive layout and auth gating"
```

---

## Chunk 3: Navbar, Layout, FAB, and Cleanup

### Task 5: Create the SkipNavLink component

**Files:**
- Create: `src/components/playground/skip-nav-link.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/playground/skip-nav-link.tsx
import { TypographySmall } from "../ui/typography";

export function SkipNavLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <TypographySmall>Skip to main content</TypographySmall>
    </a>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/skip-nav-link.tsx
git commit -m "feat(a11y): add skip-to-content navigation link (WCAG 2.1 A)"
```

---

### Task 6: Create the NewGameFab component

**Files:**
- Create: `src/components/playground/new-game-fab.tsx`

- [ ] **Step 1: Create the component**

The FAB only renders on mobile (`<lg`) for authenticated users, and only on Feed (`/`) and Games (`/games`) pages. It hides on scroll-down together with the tab bar.

```tsx
// src/components/playground/new-game-fab.tsx
"use client";

import { usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useScrollDirectionContext } from "./scroll-direction-provider";

const CreateGameForm = dynamic(
  () =>
    import("../game/create-game-form").then((m) => ({
      default: m.CreateGameForm,
    })),
  { ssr: false },
);

/** Pages where the FAB appears */
function isFabPage(pathname: string): boolean {
  return pathname === "/" || pathname === "" || pathname === "/games" || pathname.startsWith("/games/");
}

export function NewGameFab() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const t = useTranslations();
  const { direction } = useScrollDirectionContext();
  const [open, setOpen] = useState(false);

  if (!session?.user) return null;
  if (!isFabPage(pathname)) return null;

  const isHidden = direction === "down";

  return (
    <div
      className={cn(
        // Mobile only — hidden on desktop (desktop uses navbar button)
        "lg:hidden",
        // Fixed position above tab bar + safe area
        "fixed right-4 z-50",
        "bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)]",
        // Hide/show with tab bar
        "transition-[transform,opacity] duration-250 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        isHidden && "pointer-events-none translate-y-24 opacity-0",
      )}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <button
              aria-label={t("nav.newGame")}
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                "bg-primary text-primary-foreground",
                "shadow-[0_16px_32px_rgba(61,52,38,0.14),0_6px_12px_rgba(61,52,38,0.08)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "active:scale-95 active:transition-transform active:duration-100",
              )}
            />
          }
        >
          <Plus size={24} strokeWidth={2.5} />
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("game.createTitle")}</DialogTitle>
          </DialogHeader>
          <CreateGameForm onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/new-game-fab.tsx
git commit -m "feat(nav): add floating action button for New Game on mobile"
```

---

### Task 7: Rewrite the Navbar

**Files:**
- Modify: `src/components/playground/navbar.tsx`

The navbar is simplified from a marketing-style navigation to an app-style toolbar:
- **Removed:** `NavigationMenu`, `NavigationMenuContent`, `NavigationMenuItem`, `NavigationMenuLink`, `NavigationMenuList`, `NavigationMenuTrigger`, `NavbarAuthLinks`, Products dropdown, Pricing link, Contact link
- **Kept:** Logo + "Playground" link, `NavbarSearch` (hidden below `lg`), `NotificationBell`, `AuthButton`
- **Added:** "New Game" button using `CreateGameDialog` (hidden below `lg`, auth-gated)

- [ ] **Step 1: Rewrite navbar.tsx**

Replace the entire content of `src/components/playground/navbar.tsx` with:

```tsx
"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import Image from "next/image";
import AuthButton from "../auth/auth-button";
import { NotificationBell } from "../notification/notification-bell";
import { NavbarSearch } from "../search/navbar-search";
import { TypographyH1 } from "../ui/typography";

const CreateGameDialog = dynamic(
  () =>
    import("../game/create-game-dialog").then((m) => ({
      default: m.CreateGameDialog,
    })),
  { ssr: false },
);

export function Navbar() {
  const t = useTranslations();
  const { data: session } = useSession();

  return (
    <nav className="w-full border-b bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center px-6">
        {/* Logo + wordmark */}
        <Link href="/" className="mr-4 flex items-center gap-2">
          <Image
            src="/playground-logo.svg"
            width="30"
            height="30"
            alt="Playground Logo"
          />
          <TypographyH1 className="text-lg">{t("common.title")}</TypographyH1>
        </Link>

        {/* Search — desktop only */}
        <div className="mx-auto hidden lg:block">
          <NavbarSearch />
        </div>

        {/* Right zone */}
        <div className="ml-auto flex items-center gap-2">
          {/* New Game button — desktop only, auth only */}
          {session?.user && (
            <div className="hidden lg:block">
              <CreateGameDialog />
            </div>
          )}
          <NotificationBell />
          <AuthButton />
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The `NavbarAuthLinks` import is removed, so there should be no missing-import errors. `NavigationMenu` and related imports are removed.

- [ ] **Step 3: Commit**

```bash
git add src/components/playground/navbar.tsx
git commit -m "feat(nav): simplify navbar to app toolbar (logo, search, notifications, avatar)"
```

---

### Task 8: Delete navbar-auth-links.tsx

**Files:**
- Delete: `src/components/playground/navbar-auth-links.tsx`

- [ ] **Step 1: Delete the file**

```bash
rm src/components/playground/navbar-auth-links.tsx
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. No other file imports `navbar-auth-links.tsx` (the navbar was updated in Task 7).

- [ ] **Step 3: Verify with grep that no other file imports it**

Run: `grep -r "navbar-auth-links" src/`
Expected: No results

- [ ] **Step 4: Commit**

```bash
git add -u src/components/playground/navbar-auth-links.tsx
git commit -m "chore: remove navbar-auth-links (links moved to TabBar)"
```

---

### Task 9: Update the root layout

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

Changes:
1. Import and render `SkipNavLink` as the first child of `<body>` (inside the provider)
2. Add `id="main-content"` to `<main>` for the skip link target
3. Import and render `TabBar` between `Navbar` and `<main>`
4. Import and render `NewGameFab` after `Footer`
5. Add `pb-16 lg:pb-0` to `<body>` so mobile tab bar doesn't overlap content

- [ ] **Step 1: Update layout.tsx**

Replace the full content of `src/app/[locale]/layout.tsx`:

```tsx
import "@/app/globals.css";
import Footer from "@/components/playground/footer";
import { Navbar } from "@/components/playground/navbar";
import { NewGameFab } from "@/components/playground/new-game-fab";
import { ScrollDirectionProvider } from "@/components/playground/scroll-direction-provider";
import { SkipNavLink } from "@/components/playground/skip-nav-link";
import { TabBar } from "@/components/playground/tab-bar";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { Nunito, Quicksand } from "next/font/google";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-sans",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Playground",
  description: "Where friends come to play",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf3e6" },
    { media: "(prefers-color-scheme: dark)", color: "#302b22" },
  ],
};

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({
  children,
  params,
}: RootLayoutProps) {
  // Parallel: params and headers are independent
  const [{ locale }, hdrs] = await Promise.all([params, headers()]);
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Check auth server-side for conditional body padding.
  // Authenticated users get bottom padding on mobile to clear the fixed tab bar.
  // Unauthenticated users don't see the tab bar, so no padding needed.
  const session = await auth.api.getSession({ headers: hdrs });
  const isAuthenticated = !!session?.user;

  return (
    <html
      lang={locale}
      className={`${nunito.variable} ${quicksand.variable}`}
      style={{ colorScheme: "light dark" }}
    >
      <body
        className={cn(
          "flex min-h-screen flex-col antialiased",
          isAuthenticated && "pb-16 lg:pb-0",
        )}
      >
        <NextIntlClientProvider>
          <ScrollDirectionProvider>
            <SkipNavLink />
            <Navbar />
            <TabBar />
            <main id="main-content" className="flex-1">
              {children}
            </main>
            <Footer />
            <NewGameFab />
            <Toaster />
          </ScrollDirectionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/layout.tsx
git commit -m "feat(nav): integrate TabBar, SkipNavLink, and FAB into root layout"
```

---

### Task 10: Update the chat page height calculation

**Files:**
- Modify: `src/app/[locale]/chat/page.tsx`

The current chat page uses `h-[calc(100vh-4rem)]` which accounts for the 4rem (64px) navbar. With the new layout:
- **Mobile (`<lg`):** navbar (4rem) + bottom tab bar (4rem) = 8rem subtracted from viewport
- **Desktop (`lg+`):** navbar (4rem) + static tab bar (~2.5rem) = 6.5rem subtracted from viewport

- [ ] **Step 1: Update the height class**

In `src/app/[locale]/chat/page.tsx`, change line 78:

```tsx
// Before:
<div className="h-[calc(100vh-4rem)] overflow-hidden">

// After:
<div className="h-[calc(100dvh-8rem)] overflow-hidden lg:h-[calc(100dvh-6.5rem)]">
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/[locale]/chat/page.tsx
git commit -m "fix(chat): adjust height calculation for new TabBar layout"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run full build + lint**

```bash
npm run build && npm run lint
```

Expected: Both pass with no errors.

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Verify no dead imports**

```bash
grep -r "navbar-auth-links" src/
grep -r "NavigationMenuTrigger\|NavigationMenuContent" src/components/playground/
```

Expected: No results for either grep.

- [ ] **Step 4: Visual spot-check checklist**

Run `npm run dev` and verify:

- [ ] **Desktop (`>1024px`):**
  - Navbar shows: logo, search bar, "New Game" button (when authed), notification bell, avatar
  - TabBar renders as a horizontal row below navbar with text tabs: Feed | Games | Messages | Profile
  - Active tab has primary color text and bottom border
  - Marketing links (Products, Pricing, Contact) are gone from navbar
  - Footer still visible when scrolling to bottom
  - Skip-to-content link visible when pressing Tab

- [ ] **Tablet (768–1024px):**
  - TabBar is fixed at the bottom of the viewport (NOT at the top)
  - Navbar shows logo + notification bell + avatar (search hidden)
  - "New Game" button is hidden (use FAB instead if on feed/games page)
  - Content has bottom padding so nothing is hidden behind the tab bar

- [ ] **Mobile (`<768px`):**
  - TabBar fixed at bottom with icons + labels
  - Active tab has filled icon in primary color
  - Scrolling down hides the tab bar, scrolling up reveals it
  - FAB visible on Feed and Games pages, above tab bar
  - FAB hides/shows with tab bar on scroll
  - Tapping FAB opens CreateGameDialog
  - Content not overlapped by tab bar or FAB

- [ ] **Unauthenticated:**
  - TabBar does not render
  - FAB does not render
  - "New Game" button does not appear in navbar
  - Navbar shows: logo + search + sign-in button
  - Footer provides navigation links

- [ ] **Step 5: Final commit (if any fixes needed)**

Only if spot-checking reveals issues that require code changes.

---

## Appendix A: Web Interface Guidelines Review

Reviewed against [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).

### Findings

**tab-bar.tsx:531-535** — Missing `focus-visible` ring on tab links. Interactive elements need visible focus indicators using `focus-visible:ring-*`. Currently relies on browser default. Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to the Link className.

**tab-bar.tsx:534** — `transition-colors` animates `color`/`background-color`, not `transform`/`opacity`. Guidelines say "animate only transform and opacity" for performance. For small elements like tab labels the impact is negligible, but consider replacing with `transition-none lg:transition-colors` (no color transition on mobile where performance matters more).

**tab-bar.tsx** — Missing `touch-action: manipulation` on tab items. Guidelines require this on touch targets to eliminate 300ms tap delay on mobile. Add `touch-action-manipulation` to each Link's className.

**new-game-fab.tsx:698-705** — FAB button missing `focus-visible` ring. The `<button>` element has no focus indicator. Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` to the className.

**new-game-fab.tsx:691** — `transition-all` on the wrapper animates all properties. Guidelines say avoid `transition: all`. Use `transition-[transform,opacity]` instead since only transform and opacity change.

**skip-nav-link.tsx:614** — Uses `:focus` instead of `:focus-visible`. Guidelines prefer `:focus-visible` over `:focus`. Change `focus:not-sr-only focus:absolute focus:top-4 ...` to `focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-50 focus-visible:rounded-lg focus-visible:bg-background focus-visible:px-4 focus-visible:py-2 focus-visible:ring-2 focus-visible:ring-ring`.

**tab-bar.tsx** — Missing `prefers-reduced-motion` handling. The tab bar hide/show animation (`transition-transform duration-250`) does not respect `prefers-reduced-motion`. Add `motion-reduce:transition-none` to the nav element's className. The design addendum (Section 5) explicitly requires all animations to respect `prefers-reduced-motion: reduce`.

**navbar.tsx:773** — Logo image has explicit `width` and `height`. PASS.

**layout.tsx** — `color-scheme` set via inline style. PASS. `theme-color` meta tag present. PASS.

**tab-bar.tsx:524** — `aria-current="page"` on active tab. PASS. Semantic `<nav>` with `aria-label`. PASS.

**new-game-fab.tsx:699** — Icon-only button has `aria-label`. PASS.

### Summary: 6 issues — ALL FIXED

| # | File | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | tab-bar.tsx | Missing `focus-visible:ring-*` on tab links | HIGH | FIXED |
| 2 | tab-bar.tsx | Missing `touch-action-manipulation` on tab items | HIGH | FIXED |
| 3 | tab-bar.tsx | Missing `motion-reduce:transition-none` | HIGH | FIXED |
| 4 | new-game-fab.tsx | Missing `focus-visible:ring-*` on FAB button | MEDIUM | FIXED |
| 5 | new-game-fab.tsx | Uses `transition-all` instead of specific properties | MEDIUM | FIXED |
| 6 | skip-nav-link.tsx | Uses `:focus` instead of `:focus-visible` | MEDIUM | FIXED |

---

## Appendix B: Vercel React Best Practices Review

Reviewed against [Vercel React Best Practices](https://vercel.com/blog/react-best-practices) (45 rules, 8 categories).

### Findings

**CRITICAL: Duplicate scroll event listeners (`client-event-listeners`, 4.1)**

`useScrollDirection` is instantiated in **both** `TabBar` and `NewGameFab`. Each instance creates its own `window.addEventListener("scroll", ...)`. This directly violates:
- The Vercel guideline "Deduplicate Global Event Listeners" (rule 4.1)
- The design addendum Section 21 which requires "all scroll-driven behaviors MUST share a single scroll handler"

**Fix:** Lift `useScrollDirection` to a shared context provider or call it once in the layout and pass values down. Recommended approach:

```tsx
// In layout.tsx or a wrapper component:
// Create a ScrollDirectionProvider that calls the hook once
// and exposes values via React context.
// TabBar and NewGameFab consume the context instead of calling the hook directly.
```

Alternatively, make the hook a singleton — use a module-level listener with a subscriber pattern so multiple `useScrollDirection()` calls share one listener. This is simpler and doesn't require a context provider.

---

**HIGH: `CreateGameForm` eagerly bundled in FAB (`bundle-dynamic-imports`, 2.4)**

`new-game-fab.tsx` statically imports `CreateGameForm` from `"../game/create-game-form"`. This form component (with Zod validation, TanStack Form, sport type cascading, location autocomplete) is bundled into the main chunk even though it only renders when the user taps the FAB to open the dialog. On mobile, this adds unnecessary JS to the initial page load.

**Fix:** Use `next/dynamic` to lazy-load the form:

```tsx
import dynamic from "next/dynamic";
const CreateGameForm = dynamic(
  () => import("../game/create-game-form").then((m) => ({ default: m.CreateGameForm })),
  { ssr: false }
);
```

Same issue exists in `navbar.tsx` with `CreateGameDialog` — the dialog + form are statically imported but only render when clicked. Apply the same `next/dynamic` treatment.

---

**MEDIUM: Layout has sequential awaits that could be parallel (`async-parallel`, 1.4)**

`layout.tsx` awaits `params` then `auth.api.getSession()` sequentially:

```tsx
const { locale } = await params;
// ... locale check ...
const session = await auth.api.getSession({ headers: await headers() });
```

The `headers()` call is independent of `params`. These could run in parallel:

```tsx
const [{ locale }, hdrs] = await Promise.all([params, headers()]);
if (!hasLocale(routing.locales, locale)) notFound();
const session = await auth.api.getSession({ headers: hdrs });
```

This saves one network round-trip on every page load.

---

**MEDIUM: TabBar subscribes to full session, only needs boolean (`rerender-derived-state`, 5.6)**

`TabBar` calls `useSession()` which returns the full session object. The component only checks `session?.user` truthiness — it never reads user data. Any session refresh (e.g., token renewal) that changes session metadata triggers a re-render of the entire TabBar, even though the "is authenticated" boolean hasn't changed.

**Fix:** If Better Auth's `useSession` supports a selector or derived hook, subscribe to only the boolean. Otherwise, this is acceptable since the TabBar is lightweight and re-renders are cheap.

---

**LOW: TABS array recreated on each module evaluation is fine (`rendering-hoist-jsx`, 6.3)**

The `TABS` constant is defined at module scope (outside the component) which is correct — it won't be recreated on re-renders. PASS.

---

**LOW: `cn()` calls create new strings on every render**

The `cn()` utility in each tab's className creates a new string each render. For 4 tabs, that's 4 `cn()` calls per render. This is negligible overhead and not worth memoizing. PASS.

### Summary: 3 issues — ALL FIXED

| # | Rule | Issue | Severity | Status |
|---|------|-------|----------|--------|
| 1 | `client-event-listeners` (4.1) | Duplicate scroll listeners — hook called in TabBar AND NewGameFab | CRITICAL | FIXED — Added `ScrollDirectionProvider` (Task 2), both consumers use context |
| 2 | `bundle-dynamic-imports` (2.4) | CreateGameForm/Dialog eagerly bundled, should be lazy-loaded | HIGH | FIXED — Both use `next/dynamic` with `ssr: false` |
| 3 | `async-parallel` (1.4) | Sequential `params` + `headers()` awaits in layout | MEDIUM | FIXED — Uses `Promise.all([params, headers()])` |
