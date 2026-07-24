import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockLoadFollowRequests,
  mockApproveFollowRequest,
  mockDeclineFollowRequest,
  mockToast,
} = vi.hoisted(() => {
  const mockLoadFollowRequests = vi.fn();
  const mockApproveFollowRequest = vi.fn();
  const mockDeclineFollowRequest = vi.fn();
  const mockToast = { add: vi.fn() };
  return {
    mockLoadFollowRequests,
    mockApproveFollowRequest,
    mockDeclineFollowRequest,
    mockToast,
  };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const map: Record<string, string> = {
      title: "Follow Requests",
      empty: "No pending follow requests",
      approve: "Approve",
      decline: "Decline",
      approved: "Approved",
      declined: "Declined",
      approveError: "Failed to approve request",
      declineError: "Failed to decline request",
      loadError: "Something went wrong",
      retry: "Try again",
    };
    return map[key] ?? key;
  },
}));

vi.mock("@/app/[locale]/settings/follow-requests/actions", () => ({
  loadFollowRequests: (...args: unknown[]) => mockLoadFollowRequests(...args),
}));

vi.mock("@/components/profile/follow-request-actions", () => ({
  approveFollowRequest: (...args: unknown[]) =>
    mockApproveFollowRequest(...args),
  declineFollowRequest: (...args: unknown[]) =>
    mockDeclineFollowRequest(...args),
}));

vi.mock("@/components/ui/toast", () => ({
  toast: mockToast,
}));

vi.mock("@/i18n/navigation", () => ({
  Link: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/ui/user-avatar", () => ({
  getInitials: () => "AB",
}));

import { FollowRequestsList } from "@/components/profile/follow-requests-list";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFollowRequestsResponse(count: number) {
  return {
    edges: Array.from({ length: count }, (_, i) => ({
      cursor: `cursor-${i}`,
      node: {
        id: `req-${i}`,
        requester: {
          id: `user-${i}`,
          username: `user${i}`,
          displayName: `User ${i}`,
          profilePicture: null,
        },
        createdDate: new Date().toISOString(),
      },
    })),
    pageInfo: { hasNextPage: false, endCursor: null },
  };
}

async function renderAndWaitForLoad(count: number) {
  mockLoadFollowRequests.mockResolvedValue(makeFollowRequestsResponse(count));
  render(<FollowRequestsList />);
  await waitFor(() => {
    expect(screen.getByText(`User 0`)).toBeInTheDocument();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("FollowRequestsList", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows loading skeleton on initial render", () => {
    mockLoadFollowRequests.mockReturnValue(new Promise(() => {}));

    const { container } = render(<FollowRequestsList />);

    const skeleton = container.querySelector("[aria-busy='true']");
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute("aria-label", "Follow Requests");
  });

  it("shows empty state when no follow requests", async () => {
    mockLoadFollowRequests.mockResolvedValue(makeFollowRequestsResponse(0));
    render(<FollowRequestsList />);

    await waitFor(() => {
      expect(screen.getByText("No pending follow requests")).toBeInTheDocument();
    });
  });

  it("renders follow request items with avatar, display name, and username", async () => {
    await renderAndWaitForLoad(2);

    expect(screen.getByText("@user0")).toBeInTheDocument();
    expect(screen.getByText("User 1")).toBeInTheDocument();
    expect(screen.getByText("@user1")).toBeInTheDocument();
    expect(screen.getAllByText("AB")).toHaveLength(2);

    const user0Links = screen.getAllByRole("link").filter((link) =>
      link.getAttribute("href")?.includes("/user/user0"),
    );
    expect(user0Links.length).toBeGreaterThan(0);
  });

  it("links avatar and display name to user profile", async () => {
    await renderAndWaitForLoad(1);

    const user0Links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href") === "/user/user0");

    expect(user0Links).toHaveLength(2);
  });

  it("removes item from list on successful approve", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: true });
    await renderAndWaitForLoad(2);

    fireEvent.click(screen.getByRole("button", { name: /Approve User 0/i }));

    await waitFor(() => {
      expect(mockApproveFollowRequest).toHaveBeenCalledWith("req-0");
    });
    await waitFor(() => {
      expect(screen.queryByText("User 0")).not.toBeInTheDocument();
    });
    expect(screen.getByText("User 1")).toBeInTheDocument();
  });

  it("removes item from list on successful decline", async () => {
    mockDeclineFollowRequest.mockResolvedValue({ success: true });
    await renderAndWaitForLoad(2);

    fireEvent.click(screen.getByRole("button", { name: /Decline User 1/i }));

    await waitFor(() => {
      expect(mockDeclineFollowRequest).toHaveBeenCalledWith("req-1");
    });
    await waitFor(() => {
      expect(screen.queryByText("User 1")).not.toBeInTheDocument();
    });
    expect(screen.getByText("User 0")).toBeInTheDocument();
  });

  it("shows success toast on approve", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: true });
    await renderAndWaitForLoad(1);

    fireEvent.click(screen.getByRole("button", { name: /Approve User 0/i }));

    await waitFor(() => {
      expect(mockToast.add).toHaveBeenCalledWith({ title: "Approved" });
    });
  });

  it("shows success toast on decline", async () => {
    mockDeclineFollowRequest.mockResolvedValue({ success: true });
    await renderAndWaitForLoad(1);

    fireEvent.click(screen.getByRole("button", { name: /Decline User 0/i }));

    await waitFor(() => {
      expect(mockToast.add).toHaveBeenCalledWith({ title: "Declined" });
    });
  });

  it("shows error toast on approve failure and keeps item in list", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: false });
    await renderAndWaitForLoad(1);

    fireEvent.click(screen.getByRole("button", { name: /Approve User 0/i }));

    await waitFor(() => {
      expect(mockToast.add).toHaveBeenCalledWith({ title: "Failed to approve request", type: "error" });
    });
    expect(screen.getByText("User 0")).toBeInTheDocument();
  });

  it("shows error toast on decline failure and keeps item in list", async () => {
    mockDeclineFollowRequest.mockResolvedValue({ success: false });
    await renderAndWaitForLoad(1);

    fireEvent.click(screen.getByRole("button", { name: /Decline User 0/i }));

    await waitFor(() => {
      expect(mockToast.add).toHaveBeenCalledWith({ title: "Failed to decline request", type: "error" });
    });
    expect(screen.getByText("User 0")).toBeInTheDocument();
  });

  it("shows error state with retry button when load fails", async () => {
    mockLoadFollowRequests.mockResolvedValue(null);
    render(<FollowRequestsList />);

    await waitFor(() => {
      expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
  });

  it("retries loading when retry button is clicked after error", async () => {
    mockLoadFollowRequests
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeFollowRequestsResponse(1));

    render(<FollowRequestsList />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }));

    await waitFor(() => {
      expect(screen.getByText("User 0")).toBeInTheDocument();
    });
    expect(mockLoadFollowRequests).toHaveBeenCalledTimes(2);
  });
});
