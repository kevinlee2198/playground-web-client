import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollDirection } from "@/hooks/use-scroll-direction";

describe("useScrollDirection", () => {
  let rafCallback: FrameRequestCallback | null = null;

  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});

    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function simulateScroll(y: number) {
    Object.defineProperty(window, "scrollY", { value: y, writable: true });
    window.dispatchEvent(new Event("scroll"));
    if (rafCallback) {
      rafCallback(performance.now());
      rafCallback = null;
    }
  }

  it("returns idle direction and isAtTop=true initially", () => {
    const { result } = renderHook(() => useScrollDirection());
    expect(result.current.direction).toBe("idle");
    expect(result.current.isAtTop).toBe(true);
    expect(result.current.scrollTop).toBe(0);
  });

  it("detects scroll-down direction after passing threshold", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(15));

    expect(result.current.direction).toBe("down");
    expect(result.current.isAtTop).toBe(false);
  });

  it("does not change direction within threshold", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(5));

    expect(result.current.direction).toBe("idle");
  });

  it("detects scroll-up direction", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(100));
    act(() => simulateScroll(80));

    expect(result.current.direction).toBe("up");
  });

  it("reports isAtTop when scrolled back to 0", () => {
    const { result } = renderHook(() => useScrollDirection({ threshold: 10 }));

    act(() => simulateScroll(50));
    act(() => simulateScroll(0));

    expect(result.current.isAtTop).toBe(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useScrollDirection());

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
