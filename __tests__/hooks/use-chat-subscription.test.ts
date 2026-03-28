import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

type Sink = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
  complete: () => void;
};

const {
  mockUnsubscribe,
  mockUnsubscribeConnected,
  mockOn,
  mockSubscribe,
  capturedState,
} = vi.hoisted(() => {
  const capturedState = {
    sink: null as Sink | null,
    connectedHandler: null as (() => void) | null,
  };

  const mockUnsubscribe = vi.fn();
  const mockUnsubscribeConnected = vi.fn();
  const mockOn = vi
    .fn()
    .mockImplementation((event: string, handler: () => void) => {
      if (event === "connected") capturedState.connectedHandler = handler;
      return mockUnsubscribeConnected;
    });
  const mockSubscribe = vi
    .fn()
    .mockImplementation((_payload: unknown, sink: Sink) => {
      capturedState.sink = sink;
      return mockUnsubscribe;
    });

  return {
    mockUnsubscribe,
    mockUnsubscribeConnected,
    mockOn,
    mockSubscribe,
    capturedState,
  };
});

vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi
    .fn()
    .mockResolvedValue({ token: "mock-token", expiresAt: null }),
}));

vi.mock("@/lib/graphql-ws-client", () => ({
  getGraphQLWsClient: vi.fn(() => ({
    subscribe: mockSubscribe,
    on: mockOn,
    dispose: vi.fn(),
  })),
}));

import { useChatSubscription } from "@/hooks/use-chat-subscription";
import { getGraphQLWsClient } from "@/lib/graphql-ws-client";

describe("useChatSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedState.sink = null;
    capturedState.connectedHandler = null;

    mockOn.mockImplementation((event: string, handler: () => void) => {
      if (event === "connected") capturedState.connectedHandler = handler;
      return mockUnsubscribeConnected;
    });
    mockSubscribe.mockImplementation((_payload: unknown, sink: Sink) => {
      capturedState.sink = sink;
      return mockUnsubscribe;
    });
    (getGraphQLWsClient as ReturnType<typeof vi.fn>).mockReturnValue({
      subscribe: mockSubscribe,
      on: mockOn,
      dispose: vi.fn(),
    });
  });

  it("does not subscribe when disabled", () => {
    renderHook(() => useChatSubscription({ enabled: false, onEvent: vi.fn() }));
    expect(getGraphQLWsClient).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes when enabled", () => {
    renderHook(() => useChatSubscription({ enabled: true, onEvent: vi.fn() }));
    expect(getGraphQLWsClient).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("passes a query payload containing chatEvents", () => {
    renderHook(() => useChatSubscription({ enabled: true, onEvent: vi.fn() }));
    const payload = mockSubscribe.mock.calls[0]?.[0] as { query: string };
    expect(typeof payload.query).toBe("string");
    expect(payload.query).toContain("chatEvents");
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useChatSubscription({ enabled: true, onEvent: vi.fn() }),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("cleans up connected listener on unmount", () => {
    const { unmount } = renderHook(() =>
      useChatSubscription({ enabled: true, onEvent: vi.fn() }),
    );
    unmount();
    expect(mockUnsubscribeConnected).toHaveBeenCalled();
  });

  it("calls onEvent when a valid event is received", () => {
    const onEvent = vi.fn();
    renderHook(() => useChatSubscription({ enabled: true, onEvent }));

    const mockEvent = {
      __typename: "ChatMessageSentEvent",
      createdDate: "2026-03-16T10:00:00Z",
    };
    act(() => {
      capturedState.sink?.next({ data: { chatEvents: mockEvent } });
    });
    expect(onEvent).toHaveBeenCalledWith(mockEvent);
  });

  it("does not call onEvent when event is missing __typename", () => {
    const onEvent = vi.fn();
    renderHook(() => useChatSubscription({ enabled: true, onEvent }));

    act(() => {
      capturedState.sink?.next({
        data: { chatEvents: { createdDate: "2026-03-16T10:00:00Z" } },
      });
    });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("does not call onEvent when data is null", () => {
    const onEvent = vi.fn();
    renderHook(() => useChatSubscription({ enabled: true, onEvent }));

    act(() => {
      capturedState.sink?.next({ data: null });
    });
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("does not call onReconnect on the initial connection", () => {
    const onReconnect = vi.fn();
    renderHook(() =>
      useChatSubscription({ enabled: true, onEvent: vi.fn(), onReconnect }),
    );
    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("calls onReconnect on subsequent connections", () => {
    const onReconnect = vi.fn();
    renderHook(() =>
      useChatSubscription({ enabled: true, onEvent: vi.fn(), onReconnect }),
    );
    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).not.toHaveBeenCalled();

    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("does not throw when onReconnect is not provided", () => {
    renderHook(() => useChatSubscription({ enabled: true, onEvent: vi.fn() }));
    act(() => capturedState.connectedHandler?.());

    expect(() => {
      act(() => capturedState.connectedHandler?.());
    }).not.toThrow();
  });

  it("registers the connected listener when enabled", () => {
    renderHook(() => useChatSubscription({ enabled: true, onEvent: vi.fn() }));
    expect(capturedState.connectedHandler).toBeDefined();
  });
});
