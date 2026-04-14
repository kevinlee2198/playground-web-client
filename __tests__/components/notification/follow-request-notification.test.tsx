import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- Hoisted mocks ----

const {
  mockApproveFollowRequest,
  mockDeclineFollowRequest,
  mockToast,
  mockOnMarkAsRead,
} = vi.hoisted(() => {
  const mockApproveFollowRequest = vi.fn();
  const mockDeclineFollowRequest = vi.fn();
  const mockToast = Object.assign(vi.fn(), { error: vi.fn() });
  const mockOnMarkAsRead = vi.fn().mockResolvedValue(undefined);
  return {
    mockApproveFollowRequest,
    mockDeclineFollowRequest,
    mockToast,
    mockOnMarkAsRead,
  };
});

// ---- Module mocks ----

vi.mock("next-intl", () => ({
  useTranslations: (namespace: string) => {
    const translations: Record<string, Record<string, string>> = {
      notificationTemplates: {
        "followRequestReceived.title": "Follow Request",
        "followRequestReceived.body": "{displayName} requested to follow you",
        "followRequestApproved.title": "Follow Request Approved",
        "followRequestApproved.body": "{displayName} approved your follow request",
        "unknown.body": "You have a new notification",
      },
      sports: {
        BASKETBALL: "Basketball",
      },
      "profile.follow": {
        approve: "Approve",
        decline: "Decline",
        approved: "Approved",
        declined: "Declined",
        requestNotAvailable: "Request no longer available",
        approveError: "Failed to approve request",
        declineError: "Failed to decline request",
      },
    };

    const map = translations[namespace] ?? {};

    const t = (key: string, params?: Record<string, string>) => {
      const value = map[key] ?? key;
      if (!params) return value;
      return value.replace(/\{(\w+)\}/g, (_: string, k: string) => params[k] ?? `{${k}}`);
    };

    t.rich = (key: string, params?: Record<string, unknown>) => {
      const template = map[key] ?? key;
      const linkRenderer = typeof params?.link === "function" ? params.link : null;
      const parts: ReactNode[] = [];
      const linkTagRe = /<link>(.*?)<\/link>/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = linkTagRe.exec(template)) !== null) {
        if (match.index > lastIndex) {
          parts.push(template.slice(lastIndex, match.index));
        }
        const innerText = match[1];
        const substituted = innerText.replace(
          /\{(\w+)\}/g,
          (_: string, k: string) => (params?.[k] as string) ?? `{${k}}`,
        );
        parts.push(
          linkRenderer ? linkRenderer(substituted) : substituted,
        );
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < template.length) {
        parts.push(
          template.slice(lastIndex).replace(
            /\{(\w+)\}/g,
            (_: string, k: string) => (params?.[k] as string) ?? `{${k}}`,
          ),
        );
      }
      return parts;
    };

    return t;
  },
  useFormatter: () => ({
    relativeTime: (_date: Date, _now: Date) => "2 minutes ago",
  }),
  useNow: () => new Date(),
}));

vi.mock("@/components/profile/follow-request-actions", () => ({
  approveFollowRequest: (...args: unknown[]) =>
    mockApproveFollowRequest(...args),
  declineFollowRequest: (...args: unknown[]) =>
    mockDeclineFollowRequest(...args),
}));

vi.mock("sonner", () => ({
  toast: mockToast,
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

// ---- Import component under test ----

import { NotificationItem } from "@/components/notification/notification-item";
import type {
  FollowRequestApprovedNotification,
  FollowRequestReceivedNotification,
} from "@/lib/types/notification";

// ---- Factories ----

function makeReceivedNotification(
  overrides: Partial<FollowRequestReceivedNotification> = {},
): FollowRequestReceivedNotification {
  return {
    __typename: "FollowRequestReceivedNotification" as const,
    id: "notif-1",
    isRead: false,
    createdDate: new Date().toISOString(),
    requester: { id: 1, username: "alice", displayName: "Alice" },
    followRequest: { id: "req-1" },
    ...overrides,
  };
}

function makeApprovedNotification(
  overrides: Partial<FollowRequestApprovedNotification> = {},
): FollowRequestApprovedNotification {
  return {
    __typename: "FollowRequestApprovedNotification" as const,
    id: "notif-2",
    isRead: false,
    createdDate: new Date().toISOString(),
    approver: { id: 2, username: "bob", displayName: "Bob" },
    ...overrides,
  };
}

function renderReceived(
  overrides: Partial<FollowRequestReceivedNotification> = {},
) {
  return render(
    <NotificationItem
      notification={makeReceivedNotification(overrides)}
      onMarkAsRead={mockOnMarkAsRead}
    />,
  );
}

// ---- Tests ----

describe("FollowRequestReceivedNotification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders title and requester display name", () => {
    renderReceived();

    expect(screen.getByText("Follow Request")).toBeInTheDocument();
    expect(screen.getByText(/Alice/)).toBeInTheDocument();
  });

  it("shows Approve and Decline buttons when followRequest is present", () => {
    renderReceived();

    expect(screen.getByRole("button", { name: /Approve Alice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Decline Alice/i })).toBeInTheDocument();
  });

  it("calls approveFollowRequest with the request ID on Approve click", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: true });
    renderReceived();

    fireEvent.click(screen.getByRole("button", { name: /Approve Alice/i }));

    await waitFor(() => {
      expect(mockApproveFollowRequest).toHaveBeenCalledWith("req-1");
    });
  });

  it("calls declineFollowRequest with the request ID on Decline click", async () => {
    mockDeclineFollowRequest.mockResolvedValue({ success: true });
    renderReceived();

    fireEvent.click(screen.getByRole("button", { name: /Decline Alice/i }));

    await waitFor(() => {
      expect(mockDeclineFollowRequest).toHaveBeenCalledWith("req-1");
    });
  });

  it("shows Approved text and hides buttons after successful approve", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: true });
    renderReceived();

    fireEvent.click(screen.getByRole("button", { name: /Approve Alice/i }));

    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Approve Alice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decline Alice/i })).not.toBeInTheDocument();
  });

  it("shows Declined text and hides buttons after successful decline", async () => {
    mockDeclineFollowRequest.mockResolvedValue({ success: true });
    renderReceived();

    fireEvent.click(screen.getByRole("button", { name: /Decline Alice/i }));

    await waitFor(() => {
      expect(screen.getByText("Declined")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Approve Alice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decline Alice/i })).not.toBeInTheDocument();
  });

  it("shows error toast when approve fails", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: false });
    renderReceived();

    fireEvent.click(screen.getByRole("button", { name: /Approve Alice/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to approve request");
    });
  });

  it("shows error toast when decline fails", async () => {
    mockDeclineFollowRequest.mockResolvedValue({ success: false });
    renderReceived();

    fireEvent.click(screen.getByRole("button", { name: /Decline Alice/i }));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to decline request");
    });
  });

  it("shows 'Request no longer available' when followRequest is null", () => {
    renderReceived({ followRequest: null });

    expect(screen.getByText("Request no longer available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decline/i })).not.toBeInTheDocument();
  });

  it.each(["Approve", "Decline"])("%s button prevents event propagation", (action) => {
    mockApproveFollowRequest.mockResolvedValue({ success: true });
    mockDeclineFollowRequest.mockResolvedValue({ success: true });
    renderReceived();

    const button = screen.getByRole("button", { name: new RegExp(`${action} Alice`, "i") });
    const clickEvent = new MouseEvent("click", { bubbles: true, cancelable: true });
    const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

    button.dispatchEvent(clickEvent);

    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it("disables both buttons while action is pending", async () => {
    let resolveApprove!: (value: unknown) => void;
    mockApproveFollowRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveApprove = resolve;
      }),
    );

    renderReceived();

    const approveButton = screen.getByRole("button", { name: /Approve Alice/i });
    const declineButton = screen.getByRole("button", { name: /Decline Alice/i });

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(approveButton).toBeDisabled();
    });
    expect(declineButton).toBeDisabled();

    resolveApprove({ success: true });

    await waitFor(() => {
      expect(screen.getByText("Approved")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Approve Alice/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decline Alice/i })).not.toBeInTheDocument();
  });

  it("approve button click does not trigger parent click handler", async () => {
    mockApproveFollowRequest.mockResolvedValue({ success: true });
    const parentClick = vi.fn();

    render(
      <div onClick={parentClick}>
        <NotificationItem
          notification={makeReceivedNotification()}
          onMarkAsRead={mockOnMarkAsRead}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Approve Alice/i }));

    expect(parentClick).not.toHaveBeenCalled();
  });

  it.each(["Approve", "Decline"])("%s button has aria-label with the display name", (action) => {
    renderReceived();

    expect(
      screen.getByRole("button", { name: new RegExp(`${action} Alice`, "i") }),
    ).toHaveAttribute("aria-label", `${action} Alice`);
  });
});

describe("FollowRequestApprovedNotification", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders title and approver display name", () => {
    render(
      <NotificationItem
        notification={makeApprovedNotification()}
        onMarkAsRead={mockOnMarkAsRead}
      />,
    );

    expect(screen.getByText("Follow Request Approved")).toBeInTheDocument();
    expect(screen.getByText(/Bob/)).toBeInTheDocument();
  });

  it("does not show Approve or Decline buttons", () => {
    render(
      <NotificationItem
        notification={makeApprovedNotification()}
        onMarkAsRead={mockOnMarkAsRead}
      />,
    );

    expect(screen.queryByRole("button", { name: /Approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Decline/i })).not.toBeInTheDocument();
  });

  it("links to the approver's profile", () => {
    render(
      <NotificationItem
        notification={makeApprovedNotification()}
        onMarkAsRead={mockOnMarkAsRead}
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/user/bob");
  });
});
