import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockFollowUser, mockUnfollowUser, mockToast } = vi.hoisted(() => {
  const mockFollowUser = vi.fn();
  const mockUnfollowUser = vi.fn();
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  return { mockFollowUser, mockUnfollowUser, mockToast };
});

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) => {
    const map: Record<string, string> = {
      follow: "Follow",
      following: "Following",
      unfollow: "Unfollow",
      error: "Something went wrong. Please try again.",
      undo: "Undo",
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
    return map[key] ?? key;
  },
}));

vi.mock("@/app/[locale]/user/[username]/actions", () => ({
  followUser: (...args: unknown[]) => mockFollowUser(...args),
  unfollowUser: (...args: unknown[]) => mockUnfollowUser(...args),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
}));

import { FollowButton } from "@/components/profile/follow-button";

function makeFollowResponse(overrides: { viewerFollowsUser?: boolean } = {}) {
  return {
    success: true,
    user: {
      viewerFollowsUser: true,
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
  userId: "user-1",
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
      expect(mockFollowUser).toHaveBeenCalledWith("user-1");
    });
  });

  it("calls unfollowUser server action when clicked in Following state", async () => {
    mockUnfollowUser.mockResolvedValue(makeUnfollowResponse());

    render(
      <FollowButton {...defaultProps} initialViewerFollowsUser={true} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Unfollow Alice/i }));

    await waitFor(() => {
      expect(mockUnfollowUser).toHaveBeenCalledWith("user-1");
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
      expect(mockUnfollowUser).toHaveBeenCalledWith("user-1");
    });

    expect(mockToast).not.toHaveBeenCalled();
  });

  it("calls onFollowChange with true when follow succeeds", async () => {
    mockFollowUser.mockResolvedValue(makeFollowResponse());
    const onFollowChange = vi.fn();

    render(
      <FollowButton {...defaultProps} onFollowChange={onFollowChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Follow Alice/i }));

    await waitFor(() => {
      expect(onFollowChange).toHaveBeenCalledWith(true);
    });
  });

  it("calls onFollowChange with false when unfollow succeeds", async () => {
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
      expect(onFollowChange).toHaveBeenCalledWith(false);
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
