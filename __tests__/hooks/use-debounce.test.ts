import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/use-debounce";

describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("does not update value before delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "world" });
    expect(result.current).toBe("hello");
  });

  it("updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "world" });
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("world");
  });

  it("resets timer on rapid value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "a" } },
    );
    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(300));
    rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("a");
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("c");
  });

  it("works with non-string types", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 1 } },
    );
    rerender({ value: 2 });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe(2);
  });
});
