import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth-client", () => ({
  useSession: vi.fn(),
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
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

vi.mock("@/components/playground/scroll-direction-provider", () => ({
  useScrollDirectionContext: () => ({
    direction: "idle" as const,
    scrollTop: 0,
    isAtTop: true,
  }),
}));

import { TabBar } from "@/components/playground/tab-bar";
import { usePathname } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";

const mockUseSession = vi.mocked(useSession);
const mockUsePathname = vi.mocked(usePathname);

function setupAuthenticated(pathname = "/"): void {
  mockUseSession.mockReturnValue({
    data: { user: { id: "1", name: "Test" } },
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useSession>);
  mockUsePathname.mockReturnValue(pathname);
}

function setupUnauthenticated(options: { isPending?: boolean } = {}): void {
  mockUseSession.mockReturnValue({
    data: null,
    isPending: options.isPending ?? false,
    error: null,
  } as unknown as ReturnType<typeof useSession>);
  mockUsePathname.mockReturnValue("/");
}

describe("TabBar", () => {
  it("renders null when user is not authenticated", () => {
    setupUnauthenticated();

    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders null while session is pending", () => {
    setupUnauthenticated({ isPending: true });

    const { container } = render(<TabBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders all four tabs when authenticated", () => {
    setupAuthenticated();

    render(<TabBar />);

    expect(screen.getByText("Feed")).toBeInTheDocument();
    expect(screen.getByText("Games")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("marks Feed tab as active on root path", () => {
    setupAuthenticated("/");

    render(<TabBar />);

    const feedLink = screen.getByText("Feed").closest("a");
    expect(feedLink).toHaveAttribute("aria-current", "page");
  });

  it("marks Games tab as active on /games path", () => {
    setupAuthenticated("/games");

    render(<TabBar />);

    const gamesLink = screen.getByText("Games").closest("a");
    expect(gamesLink).toHaveAttribute("aria-current", "page");
  });

  it("has navigation role and aria-label", () => {
    setupAuthenticated();

    render(<TabBar />);

    expect(
      screen.getByRole("navigation", { name: /main/i }),
    ).toBeInTheDocument();
  });
});
