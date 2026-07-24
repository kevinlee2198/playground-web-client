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
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      "common.title": "Playground",
      "game.actions.create": "Create Game",
      "search.openSearch": "Open search",
    };
    return map[key] ?? key;
  },
}));

vi.mock("next/image", () => ({
  default: ({ alt = "", ...props }: { alt?: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img alt={alt} {...props} />
  ),
}));

vi.mock("@/components/auth/auth-button", () => ({
  default: () => <div data-testid="auth-button" />,
}));
vi.mock("@/components/notification/notification-bell", () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));
vi.mock("@/components/search/mobile-search-overlay", () => ({
  MobileSearchOverlay: () => <div data-testid="mobile-search-overlay" />,
}));
vi.mock("@/components/search/navbar-search", () => ({
  NavbarSearch: () => <div data-testid="navbar-search" />,
}));

import { Navbar } from "@/components/playground/navbar";
import { useSession } from "@/lib/auth-client";

const mockUseSession = vi.mocked(useSession);

function setupSession(user: { id: string; name: string } | null): void {
  mockUseSession.mockReturnValue({
    data: user ? { user } : null,
    isPending: false,
    error: null,
  } as unknown as ReturnType<typeof useSession>);
}

describe("Navbar", () => {
  it("hides the Create Game button below lg without a conflicting display class", () => {
    setupSession({ id: "1", name: "Test" });
    render(<Navbar />);

    const link = screen.getByRole("link", { name: "Create Game" });
    const classes = link.className.split(/\s+/);
    expect(classes).toContain("hidden");
    expect(classes).toContain("lg:inline-flex");
    // The base button "inline-flex" must be merged away — with both present,
    // whichever display utility comes later in the stylesheet wins, and the
    // button leaks onto mobile over the logo.
    expect(classes).not.toContain("inline-flex");
  });

  it("does not render Create Game when signed out", () => {
    setupSession(null);
    render(<Navbar />);
    expect(
      screen.queryByRole("link", { name: "Create Game" }),
    ).not.toBeInTheDocument();
  });
});
