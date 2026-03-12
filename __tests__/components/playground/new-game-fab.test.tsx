import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  usePathname: vi.fn(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "nav.newGame": "New Game",
      "game.createTitle": "Create Game",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/components/playground/scroll-direction-provider", () => ({
  useScrollDirectionContext: vi.fn(),
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    const Stub = () => null;
    Stub.displayName = "DynamicStub";
    return Stub;
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTrigger: ({
    children,
    render,
  }: {
    children: ReactNode;
    render: ReactNode;
  }) => (
    <div>
      {render}
      {children}
    </div>
  ),
}));

import { useScrollDirectionContext } from "@/components/playground/scroll-direction-provider";
import { usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { NewGameFab } from "@/components/playground/new-game-fab";

const mockUseSession = vi.mocked(useSession);
const mockUsePathname = vi.mocked(usePathname);
const mockUseScrollDirection = vi.mocked(useScrollDirectionContext);

function setup({
  authenticated = true,
  pathname = "/",
  direction = "idle" as const,
} = {}) {
  mockUseSession.mockReturnValue({
    data: authenticated ? { user: { id: "1", name: "Test" } } : null,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useSession>);
  mockUsePathname.mockReturnValue(pathname);
  mockUseScrollDirection.mockReturnValue({
    direction,
    scrollTop: 0,
    isAtTop: true,
  });
}

describe("NewGameFab", () => {
  it("renders null when unauthenticated", () => {
    setup({ authenticated: false });

    const { container } = render(<NewGameFab />);
    expect(container.firstChild).toBeNull();
  });

  it("renders on the feed page", () => {
    setup({ pathname: "/" });

    render(<NewGameFab />);
    expect(screen.getByLabelText("New Game")).toBeInTheDocument();
  });

  it("renders on the games page", () => {
    setup({ pathname: "/games" });

    render(<NewGameFab />);
    expect(screen.getByLabelText("New Game")).toBeInTheDocument();
  });

  it("renders null on non-FAB pages", () => {
    setup({ pathname: "/chat" });

    const { container } = render(<NewGameFab />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null on profile page", () => {
    setup({ pathname: "/player" });

    const { container } = render(<NewGameFab />);
    expect(container.firstChild).toBeNull();
  });

  it("hides when scrolling down", () => {
    setup({ pathname: "/", direction: "down" });

    const { container } = render(<NewGameFab />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("pointer-events-none");
    expect(wrapper.className).toContain("translate-y-24");
    expect(wrapper.className).toContain("opacity-0");
  });
});
