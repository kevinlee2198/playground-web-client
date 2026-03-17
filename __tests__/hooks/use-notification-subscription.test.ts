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
  mockDisposeGraphQLWsClient,
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
    .mockImplementation((_event: string, handler: () => void) => {
      capturedState.connectedHandler = handler;
      return mockUnsubscribeConnected;
    });
  const mockSubscribe = vi
    .fn()
    .mockImplementation((_payload: unknown, sink: Sink) => {
      capturedState.sink = sink;
      return mockUnsubscribe;
    });
  const mockDisposeGraphQLWsClient = vi.fn();

  return {
    mockUnsubscribe,
    mockUnsubscribeConnected,
    mockOn,
    mockSubscribe,
    mockDisposeGraphQLWsClient,
    capturedState,
  };
});

vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

vi.mock("@/lib/graphql-ws-client", () => ({
  getGraphQLWsClient: vi.fn(() => ({
    subscribe: mockSubscribe,
    on: mockOn,
    dispose: vi.fn(),
  })),
  disposeGraphQLWsClient: mockDisposeGraphQLWsClient,
}));

import { useNotificationSubscription } from "@/hooks/use-notification-subscription";
import { getGraphQLWsClient } from "@/lib/graphql-ws-client";

describe("useNotificationSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedState.sink = null;
    capturedState.connectedHandler = null;

    mockOn.mockImplementation((_event: string, handler: () => void) => {
      capturedState.connectedHandler = handler;
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
    renderHook(() =>
      useNotificationSubscription({ enabled: false, onNotification: vi.fn() }),
    );
    expect(getGraphQLWsClient).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("disposes WS client when disabled", () => {
    renderHook(() =>
      useNotificationSubscription({ enabled: false, onNotification: vi.fn() }),
    );
    expect(mockDisposeGraphQLWsClient).toHaveBeenCalled();
  });

  it("subscribes when enabled", () => {
    renderHook(() =>
      useNotificationSubscription({ enabled: true, onNotification: vi.fn() }),
    );
    expect(getGraphQLWsClient).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("does not dispose WS client when enabled", () => {
    renderHook(() =>
      useNotificationSubscription({ enabled: true, onNotification: vi.fn() }),
    );
    expect(mockDisposeGraphQLWsClient).not.toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useNotificationSubscription({ enabled: true, onNotification: vi.fn() }),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
    expect(mockUnsubscribeConnected).toHaveBeenCalled();
  });

  it("calls onNotification when event is received", () => {
    const onNotification = vi.fn();
    renderHook(() =>
      useNotificationSubscription({ enabled: true, onNotification }),
    );
    const mockNotification = {
      __typename: "GameStartedNotification",
      id: "n1",
      isRead: false,
      createdDate: "2026-03-16T10:00:00Z",
      game: { id: "g1", sportType: "BASKETBALL" },
    };
    act(() => {
      capturedState.sink?.next({
        data: { notificationEvents: { notification: mockNotification } },
      });
    });
    expect(onNotification).toHaveBeenCalledWith(mockNotification);
  });

  it("does not call onNotification when notification is missing from event", () => {
    const onNotification = vi.fn();
    renderHook(() =>
      useNotificationSubscription({ enabled: true, onNotification }),
    );
    act(() => {
      capturedState.sink?.next({ data: { notificationEvents: {} } });
    });
    expect(onNotification).not.toHaveBeenCalled();
  });

  it("does not call onNotification when data is missing", () => {
    const onNotification = vi.fn();
    renderHook(() =>
      useNotificationSubscription({ enabled: true, onNotification }),
    );
    act(() => {
      capturedState.sink?.next({});
    });
    expect(onNotification).not.toHaveBeenCalled();
  });

  it("disposes WS client when transitioning from enabled to disabled", () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useNotificationSubscription({ enabled, onNotification: vi.fn() }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    expect(mockDisposeGraphQLWsClient).toHaveBeenCalled();
  });

  it("does not call onReconnect on the initial connection", () => {
    const onReconnect = vi.fn();
    renderHook(() =>
      useNotificationSubscription({
        enabled: true,
        onNotification: vi.fn(),
        onReconnect,
      }),
    );
    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it("calls onReconnect on subsequent connections", () => {
    const onReconnect = vi.fn();
    renderHook(() =>
      useNotificationSubscription({
        enabled: true,
        onNotification: vi.fn(),
        onReconnect,
      }),
    );
    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).not.toHaveBeenCalled();

    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("uses latest onNotification callback without resubscribing", () => {
    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(
      ({ onNotification }) =>
        useNotificationSubscription({ enabled: true, onNotification }),
      { initialProps: { onNotification: firstCallback } },
    );
    rerender({ onNotification: secondCallback });

    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    const mockNotification = {
      __typename: "FriendRequestReceivedNotification",
      id: "n2",
      isRead: false,
      createdDate: "2026-03-16T10:00:00Z",
      sender: { id: "u1", username: "alice", displayName: "Alice" },
    };
    act(() => {
      capturedState.sink?.next({
        data: { notificationEvents: { notification: mockNotification } },
      });
    });
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith(mockNotification);
  });
});
