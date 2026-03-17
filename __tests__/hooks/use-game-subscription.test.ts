import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

type Sink = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
  complete: () => void;
};

const { mockUnsubscribe, mockOnCleanup, mockOn, mockSubscribe, capturedState } =
  vi.hoisted(() => {
    const capturedState = {
      sink: null as Sink | null,
      connectedHandler: null as (() => void) | null,
      closedHandler: null as (() => void) | null,
    };

    const mockUnsubscribe = vi.fn();
    const mockOnCleanup = vi.fn();
    const mockOn = vi
      .fn()
      .mockImplementation((event: string, handler: () => void) => {
        if (event === "connected") capturedState.connectedHandler = handler;
        if (event === "closed") capturedState.closedHandler = handler;
        return mockOnCleanup;
      });
    const mockSubscribe = vi
      .fn()
      .mockImplementation((_payload: unknown, sink: Sink) => {
        capturedState.sink = sink;
        return mockUnsubscribe;
      });

    return { mockUnsubscribe, mockOnCleanup, mockOn, mockSubscribe, capturedState };
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
}));

import { useGameSubscription } from "@/hooks/use-game-subscription";
import { getGraphQLWsClient } from "@/lib/graphql-ws-client";

describe("useGameSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedState.sink = null;
    capturedState.connectedHandler = null;
    capturedState.closedHandler = null;

    mockOn.mockImplementation((event: string, handler: () => void) => {
      if (event === "connected") capturedState.connectedHandler = handler;
      if (event === "closed") capturedState.closedHandler = handler;
      return mockOnCleanup;
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

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not subscribe when disabled", () => {
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: false, onEvent: vi.fn() }),
    );
    expect(getGraphQLWsClient).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it("subscribes when enabled", () => {
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent: vi.fn() }),
    );
    expect(getGraphQLWsClient).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent: vi.fn() }),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("passes a query payload containing the gameId", () => {
    renderHook(() =>
      useGameSubscription({ gameId: 42, enabled: true, onEvent: vi.fn() }),
    );
    const payload = mockSubscribe.mock.calls[0]?.[0] as { query: string };
    expect(typeof payload.query).toBe("string");
    expect(payload.query).toContain("42");
  });

  it("calls onEvent when a valid event is received after throttle delay", () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent }),
    );
    const mockEvent = {
      __typename: "GameStartedEvent",
      occurredAt: "2024-01-01T00:00:00Z",
      game: {},
    };
    capturedState.sink?.next({ data: { gameEvents: mockEvent } });
    expect(onEvent).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).toHaveBeenCalledWith(mockEvent);
  });

  it("does not call onEvent for events without __typename", () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent }),
    );
    capturedState.sink?.next({
      data: { gameEvents: { occurredAt: "2024-01-01T00:00:00Z" } },
    });
    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("does not call onEvent when data.gameEvents is null", () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent }),
    );
    capturedState.sink?.next({ data: { gameEvents: null } });
    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("throttles rapid events and only delivers the latest", () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent }),
    );
    const firstEvent = { __typename: "GameStartedEvent", occurredAt: "t1", game: {} };
    const secondEvent = { __typename: "GameEndedEvent", occurredAt: "t2", game: {} };
    capturedState.sink?.next({ data: { gameEvents: firstEvent } });
    capturedState.sink?.next({ data: { gameEvents: secondEvent } });
    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith(secondEvent);
  });

  it("cancels the throttle timer on unmount", () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    const { unmount } = renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent }),
    );
    capturedState.sink?.next({
      data: { gameEvents: { __typename: "GameStartedEvent", occurredAt: "t1", game: {} } },
    });
    unmount();
    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("registers connected and closed event listeners", () => {
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent: vi.fn() }),
    );
    expect(capturedState.connectedHandler).toBeDefined();
    expect(capturedState.closedHandler).toBeDefined();
  });

  it("cleans up connection listeners on unmount", () => {
    const { unmount } = renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent: vi.fn() }),
    );
    unmount();
    expect(mockOnCleanup).toHaveBeenCalledTimes(2);
  });

  it("calls onReconnect on subsequent connections, not the first", () => {
    const onReconnect = vi.fn();
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent: vi.fn(), onReconnect }),
    );
    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).not.toHaveBeenCalled();

    act(() => capturedState.connectedHandler?.());
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it("calls onConnectionLost when closed after having connected", () => {
    const onConnectionLost = vi.fn();
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
        onConnectionLost,
      }),
    );
    act(() => capturedState.connectedHandler?.());
    act(() => capturedState.closedHandler?.());
    expect(onConnectionLost).toHaveBeenCalledTimes(1);
  });

  it("does not call onConnectionLost when closed before ever connecting", () => {
    const onConnectionLost = vi.fn();
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
        onConnectionLost,
      }),
    );
    act(() => capturedState.closedHandler?.());
    expect(onConnectionLost).not.toHaveBeenCalled();
  });

  it("does not call onConnectionLost after unmount", () => {
    const onConnectionLost = vi.fn();
    const { unmount } = renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
        onConnectionLost,
      }),
    );
    act(() => capturedState.connectedHandler?.());
    unmount();
    act(() => capturedState.closedHandler?.());
    expect(onConnectionLost).not.toHaveBeenCalled();
  });

  it("pauses event delivery when tab is hidden and flushes on visibility restore", () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent }),
    );
    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));

    const mockEvent = { __typename: "GameStartedEvent", occurredAt: "t1", game: {} };
    capturedState.sink?.next({ data: { gameEvents: mockEvent } });
    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).not.toHaveBeenCalled();

    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(onEvent).toHaveBeenCalledWith(mockEvent);
  });

  it("removes visibilitychange listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() =>
      useGameSubscription({ gameId: 1, enabled: true, onEvent: vi.fn() }),
    );
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });

  it("does not subscribe when transitioning from enabled to disabled", () => {
    const { rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) =>
        useGameSubscription({ gameId: 1, enabled, onEvent: vi.fn() }),
      { initialProps: { enabled: true } },
    );
    expect(mockSubscribe).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();
    mockOn.mockImplementation((event: string, handler: () => void) => {
      if (event === "connected") capturedState.connectedHandler = handler;
      if (event === "closed") capturedState.closedHandler = handler;
      return mockOnCleanup;
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

    rerender({ enabled: false });
    expect(mockSubscribe).not.toHaveBeenCalled();
  });
});
