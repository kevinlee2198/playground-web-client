import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFollowUser, mockUnfollowUser, mockCancelFollowRequest, mockToast } = vi.hoisted(() => {
  const mockFollowUser = vi.fn();
  const mockUnfollowUser = vi.fn();
  const mockCancelFollowRequest = vi.fn();
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  return { mockFollowUser, mockUnfollowUser, mockCancelFollowRequest, mockToast };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      follow: "Follow",
      following: "Following",
      unfollow: "Unfollow",
      requested: "Requested",
      error: "Something went wrong. Please try again.",
      undo: "Undo",
      requestCancelled: "Follow request cancelled",
    };
    if (key === "unfollowedUndo" && params?.name) {
      return `Unfollowed ${params.name}. You can no longer message each other.`;
    }
    if (key === "nowFollowing" && params?.name) {
      return `Now following ${params.name}`;
    }
    if (key === "unfollowedName" && params?.name) {
      return `Unfollowed ${params.name}`;
    }
    if (key === "cancelRequest" && params?.name) {
      return `Cancel follow request for ${params.name}`;
    }
    if (key === "requestSent" && params?.name) {
      return `Follow request sent to ${params.name}`;
    }
    return map[key] ?? key;
  },
}));

vi.mock("@/app/[locale]/user/[username]/actions", () => ({
  followUser: (...args: unknown[]) => mockFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
}));

vi.mock("@/components/profile/follow-request-actions", () => ({
  cancelFollowRequest: (...args: unknown[]) => mockCancelFollowRequest(...args),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import { FollowButton } from "@/components/profile/follow-button";

function makeFollowResponse(overrides: { viewerFollowsUser?: boolean } = {}) {
  return {
    success: true,
    type: "followed" as const,
    user: {
      viewerFollowsUser: true,
      viewerSentFollowRequest: null,
      ...overrides,
    },
  };
}

function makeUnfollowResponse(overrides: { viewerFollowsUser?: boolean; wasMutualFollow?: boolean } = {}) {
  const { wasMutualFollow = false, ...userOverrides } = overrides;
  return {
    success: true,
    user: {
      viewerFollowsUser: false,
      ...userOverrides,
    },
    wasMutualFollow,
  };
}

const defaultProps = {
  userId: 1,
  displayName: "Alice",
  initialViewerFollowsUser: false,
};

describe("FollowButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Follow" when initialViewerFollowsUser is false', () => {
    render(<FollowButton {...defaultProps} />);

    const button = screen.getByRole("button", { name: /Follow Alice/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Follow");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it('renders "Following" when initialViewerFollowsUser is true', () => {
    render(
      <FollowButton {...defaultProps} initialViewerFollowsUser={true} />,
    );

    const button = screen.getByRole("button", { name: /Unfollow Alice/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Following");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it('renders "Requested" when initialViewerSentFollowRequest is set', () => {
    render(
      <FollowButton
        {...defaultProps}
        initialViewerSentFollowRequest={{ id: "req-1" }}
      />,
    );

    const button = screen.getByRole("button", { name: /Cancel follow request for Alice/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent("Requested");
    expect(button).not.toHaveAttribute("aria-pressed");
  });

  it("disables the button during pending state", async () => {
    let resolveFollow!: (value: unknown) => void;
    mockFollowUser.mockReturnValue(
      new Promise((resolve) => {
        resolveFollow = resolve;
      }),
    );

    render(<FollowButton {...defaultProps} />);

    const button = screen.getByRole("button", { name: /Follow Alice/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });

    resolveFollow(makeFollowResponse());

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  it("calls followUser server action when clicked in Follow state", async () => {
    mockFollowUser.mockResolvedValue(makeFollowResponse());

    render(<FollowButton {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

    await waitFor(() => {
      expect(mockFollowUser).toHaveBeenCalledWith(1);
    });
  });

  it("calls unfollowUser server action when clicked in Following state", async () => {
    mockUnfollowUser.mockResolvedValue(makeUnfollowResponse());

    render(
      <FollowButton {...defaultProps} initialViewerFollowsUser={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Unfollow Alice/i }));

    await waitFor(() => {
      expect(mockUnfollowUser).toHaveBeenCalledWith(1);
    });
  });

  it("calls cancelFollowRequest when clicking Requested button", async () => {
    mockCancelFollowRequest.mockResolvedValue({ success: true });

    render(
      <FollowButton
        {...defaultProps}
        initialViewerSentFollowRequest={{ id: "req-1" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel follow request for Alice/i }));

    await waitFor(() => {
      expect(mockCancelFollowRequest).toHaveBeenCalledWith("req-1");
    });
  });

  it("shows undo toast when unfollow breaks a mutual follow", async () => {
    mockUnfollowUser.mockResolvedValue(
      makeUnfollowResponse({ wasMutualFollow: true }),
    );

    render(
      <FollowButton {...defaultProps} initialViewerFollowsUser={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Unfollow Alice/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        "Unfollowed Alice. You can no longer message each other.",
        expect.objectContaining({
          duration: 5000,
          action: expect.objectContaining({
            label: "Undo",
          }),
        }),
      );
    });
  });

  it("does not show undo toast when unfollow does not break mutual follow", async () => {
    mockUnfollowUser.mockResolvedValue(
      makeUnfollowResponse({ wasMutualFollow: false }),
    );

    render(
      <FollowButton {...defaultProps} initialViewerFollowsUser={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Unfollow Alice/i }));

    await waitFor(() => {
      expect(mockUnfollowUser).toHaveBeenCalledWith(1);
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("transitions to Requested state when followUser returns a request", async () => {
    mockFollowUser.mockResolvedValue({
      success: true,
      type: "requested",
      requestId: "req-2",
    });

    render(<FollowButton {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

    await waitFor(() => {
      const button = screen.getByRole("button");
      expect(button).toHaveTextContent("Requested");
    });
  });

  it("calls onFollowChange with type 'followed' when follow succeeds", async () => {
    mockFollowUser.mockResolvedValue(makeFollowResponse());
    const onFollowChange = vi.fn();

    render(
      <FollowButton {...defaultProps} onFollowChange={onFollowChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith({ type: "followed" });
    });
  });

  it("calls onFollowChange with type 'unfollowed' when unfollow succeeds", async () => {
    mockUnfollowUser.mockResolvedValue(makeUnfollowResponse());
    const onFollowChange = vi.fn();

    render(
      <FollowButton
        {...defaultProps}
        initialViewerFollowsUser={true}
        onFollowChange={onFollowChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Unfollow Alice/i }));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith({ type: "unfollowed" });
    });
  });

  it("calls onFollowChange with type 'requested' when follow creates a request", async () => {
    mockFollowUser.mockResolvedValue({
      success: true,
      type: "requested",
      requestId: "req-3",
    });
    const onFollowChange = vi.fn();

    render(
      <FollowButton {...defaultProps} onFollowChange={onFollowChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith({ type: "requested", requestId: "req-3" });
    });
  });

  it("calls onFollowChange with type 'cancelled' when cancel succeeds", async () => {
    mockCancelFollowRequest.mockResolvedValue({ success: true });
    const onFollowChange = vi.fn();

    render(
      <FollowButton
        {...defaultProps}
        initialViewerSentFollowRequest={{ id: "req-1" }}
        onFollowChange={onFollowChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel follow request for Alice/i }));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith({ type: "cancelled" });
    });
  });

  it("reverts to Follow state and shows error toast when follow fails", async () => {
    mockFollowUser.mockResolvedValue({ success: false });

    render(<FollowButton {...defaultProps} />);

    fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
      );
    });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Follow");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("reverts to Following state and shows error toast when unfollow fails", async () => {
    mockUnfollowUser.mockResolvedValue({ success: false });

    render(
      <FollowButton {...defaultProps} initialViewerFollowsUser={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Unfollow Alice/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Something went wrong. Please try again.",
      );
    });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Following");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("reverts to Requested state when cancel fails", async () => {
    mockCancelFollowRequest.mockResolvedValue({ success: false });

    render(
      <FollowButton
        {...defaultProps}
        initialViewerSentFollowRequest={{ id: "req-1" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancel follow request for Alice/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Requested");
  });

  it("has min-w-[6rem] class for layout stability", () => {
    render(<FollowButton {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("min-w-[6rem]");
  });

  it("includes a visually-hidden live region for screen reader announcements", () => {
    const { container } = render(<FollowButton {...defaultProps} />);

    const liveRegion = container.querySelector("[aria-live='polite']");
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute("role", "status");
    expect(liveRegion).toHaveClass("sr-only");
  });
});
