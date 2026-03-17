# Unit Testing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 19 unit test files covering pure logic (utilities, hooks, server actions) plus move 1 existing test for consistency.

**Architecture:** Tests in `__tests__/` mirroring source structure. Pure functions tested directly; hooks via `renderHook`; server actions via mocked GraphQL client. `extractMutationResult` from `@/lib/graphql-result` is NOT mocked — it runs as real code since it's already tested. The mocked layer is `authMutate`/`authQuery` which return the full GraphQL response shape `{ data: { ... }, errors?: [...] }`.

**Tech Stack:** Vitest, @testing-library/react (`renderHook`, `act`), `vi.mock`/`vi.fn` for mocking, `vi.useFakeTimers` for time-dependent code.

**Spec:** `docs/superpowers/specs/2026-03-16-unit-testing-strategy-design.md`

**Testing philosophy:** When a test fails, the bug may be in the source code, not the test. Investigate the source before assuming the test is wrong.

---

## Standard Workflow

Every task follows these steps after creating the test file:

1. **Run tests**: `npx vitest run <test-file-path>`
2. **Investigate failures**: Read the source file. Determine if the bug is in the test or the source code. Fix the root cause.
3. **Commit**: `git add <test-file-path> && git commit -m "test: add unit tests for <module>"`

---

## Parallelization

All tasks within a chunk are independent and can be executed in parallel by separate subagents. Chunks should be executed in order (Chunk 1 before Chunk 2, etc.) to establish patterns progressively.

---

## Chunk 1: Tier 1 — Pure Utility Functions

### Task 1: unit-conversion

**Files:**
- Create: `__tests__/lib/unit-conversion.test.ts`
- Source: `src/lib/unit-conversion.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect } from "vitest";
import {
  cmToFeetInches,
  feetInchesToCm,
  kgToLbs,
  lbsToKg,
  formatHeightMetric,
  formatHeightImperial,
  formatWeightMetric,
  formatWeightImperial,
} from "@/lib/unit-conversion";

describe("cmToFeetInches", () => {
  it("converts 0 cm to 0 feet 0 inches", () => {
    expect(cmToFeetInches(0)).toEqual({ feet: 0, inches: 0 });
  });

  it("converts 180 cm to 5 feet 11 inches", () => {
    const result = cmToFeetInches(180);
    expect(result.feet).toBe(5);
    expect(result.inches).toBe(11);
  });

  it("converts 152.4 cm to exactly 5 feet 0 inches", () => {
    expect(cmToFeetInches(152.4)).toEqual({ feet: 5, inches: 0 });
  });

  it("never returns inches >= 12", () => {
    // 182.88 cm = exactly 6'0", rounding could give 5'12"
    const result = cmToFeetInches(182.88);
    expect(result.inches).toBeLessThan(12);
  });
});

describe("feetInchesToCm", () => {
  it("converts 0 feet 0 inches to 0 cm", () => {
    expect(feetInchesToCm(0, 0)).toBe(0);
  });

  it("converts 6 feet 0 inches", () => {
    expect(feetInchesToCm(6, 0)).toBeCloseTo(182.88, 1);
  });

  it("round-trips with cmToFeetInches", () => {
    const cm = 175;
    const { feet, inches } = cmToFeetInches(cm);
    expect(feetInchesToCm(feet, inches)).toBeCloseTo(cm, 0);
  });
});

describe("kgToLbs", () => {
  it("converts 0 kg to 0 lbs", () => {
    expect(kgToLbs(0)).toBe(0);
  });

  it("converts 100 kg correctly", () => {
    expect(kgToLbs(100)).toBeCloseTo(220.46, 1);
  });
});

describe("lbsToKg", () => {
  it("converts 0 lbs to 0 kg", () => {
    expect(lbsToKg(0)).toBe(0);
  });

  it("round-trips with kgToLbs", () => {
    const kg = 80;
    expect(lbsToKg(kgToLbs(kg))).toBeCloseTo(kg, 1);
  });
});

describe("formatHeightMetric", () => {
  it("formats height in cm", () => {
    expect(formatHeightMetric(180)).toContain("180");
    expect(formatHeightMetric(180)).toContain("cm");
  });
});

describe("formatHeightImperial", () => {
  it("formats 180 cm as feet and inches", () => {
    const result = formatHeightImperial(180);
    expect(result).toContain("5");
    expect(result).toContain("11");
  });
});

describe("formatWeightMetric", () => {
  it("formats weight in kg", () => {
    expect(formatWeightMetric(80)).toContain("80");
    expect(formatWeightMetric(80)).toContain("kg");
  });
});

describe("formatWeightImperial", () => {
  it("formats 80 kg as lbs", () => {
    const result = formatWeightImperial(80);
    expect(result).toContain("176");
  });
});
```

- [ ] **Steps 2-4: Run, investigate, commit** (see Standard Workflow)

---

### Task 2: location-utils

**Files:**
- Create: `__tests__/lib/location-utils.test.ts`
- Source: `src/lib/location-utils.ts`

- [ ] **Step 1: Create test file**

Read `src/lib/types/location.ts` first to understand the `Location` and `LocationValue` types. Then create:

```typescript
import { describe, it, expect } from "vitest";
import {
  formatAddress,
  formatLocationShort,
  locationToValue,
} from "@/lib/location-utils";
import type { Location } from "@/lib/types/location";

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: "loc-1",
    name: "Test Park",
    address: {
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    },
    coordinates: { latitude: 39.78, longitude: -89.65 },
    ...overrides,
  };
}

describe("formatAddress", () => {
  it("joins all present address parts with commas", () => {
    const result = formatAddress({
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      postalCode: "62701",
      country: "US",
    });
    expect(result).toBe("123 Main St, Springfield, IL, 62701, US");
  });

  it("omits null fields", () => {
    const result = formatAddress({
      street: null,
      city: "Springfield",
      state: null,
      postalCode: null,
      country: "US",
    });
    expect(result).toBe("Springfield, US");
  });

  it("returns only country when all other fields are null", () => {
    const result = formatAddress({
      street: null,
      city: null,
      state: null,
      postalCode: null,
      country: "US",
    });
    expect(result).toBe("US");
  });
});

describe("formatLocationShort", () => {
  it("returns city and state when both present", () => {
    const loc = makeLocation();
    expect(formatLocationShort(loc)).toBe("Springfield, IL");
  });

  it("returns state and country when city is missing", () => {
    const loc = makeLocation({
      address: { street: null, city: null, state: "IL", postalCode: null, country: "US" },
    });
    expect(formatLocationShort(loc)).toBe("IL, US");
  });

  it("returns country only when city and state are missing", () => {
    const loc = makeLocation({
      address: { street: null, city: null, state: null, postalCode: null, country: "US" },
    });
    expect(formatLocationShort(loc)).toBe("US");
  });
});

describe("locationToValue", () => {
  it("maps a full location to a LocationValue", () => {
    const loc = makeLocation();
    const result = locationToValue(loc);
    expect(result.displayName).toBe("123 Main St, Springfield, IL, 62701, US");
    expect(result.coordinates).toEqual({ latitude: 39.78, longitude: -89.65 });
  });

  it("maps null coordinates to undefined", () => {
    const loc = makeLocation({ coordinates: null });
    const result = locationToValue(loc);
    expect(result.coordinates).toBeUndefined();
  });

  it("maps null address fields to undefined", () => {
    const loc = makeLocation({
      address: { street: null, city: null, state: null, postalCode: null, country: "US" },
    });
    const result = locationToValue(loc);
    expect(result.address.street).toBeUndefined();
    expect(result.address.city).toBeUndefined();
    expect(result.address.country).toBe("US");
  });
});
```

- [ ] **Steps 2-4: Run, investigate, commit** (see Standard Workflow)

---

### Task 3: upload-validation

**Files:**
- Create: `__tests__/lib/upload-validation.test.ts`
- Source: `src/lib/upload-validation.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect } from "vitest";
import {
  isImageMimeType,
  isVideoMimeType,
  validateFile,
  formatFileSize,
  getMaxSizeLabel,
  getAcceptAttribute,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} from "@/lib/upload-validation";

describe("isImageMimeType", () => {
  it("returns true for valid image types", () => {
    expect(isImageMimeType("image/jpeg")).toBe(true);
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("image/webp")).toBe(true);
    expect(isImageMimeType("image/gif")).toBe(true);
  });

  it("returns false for non-image types", () => {
    expect(isImageMimeType("video/mp4")).toBe(false);
    expect(isImageMimeType("text/plain")).toBe(false);
    expect(isImageMimeType("")).toBe(false);
  });
});

describe("isVideoMimeType", () => {
  it("returns true for valid video types", () => {
    expect(isVideoMimeType("video/mp4")).toBe(true);
    expect(isVideoMimeType("video/quicktime")).toBe(true);
    expect(isVideoMimeType("video/webm")).toBe(true);
  });

  it("returns false for non-video types", () => {
    expect(isVideoMimeType("image/jpeg")).toBe(false);
    expect(isVideoMimeType("")).toBe(false);
  });
});

describe("validateFile", () => {
  const makeFile = (type: string, size: number) =>
    new File(["x".repeat(Math.min(size, 100))], "test", { type });

  it("accepts valid image under size limit", () => {
    const file = makeFile("image/jpeg", 1024);
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateFile(file, "profilePicture")).toEqual({ valid: true });
  });

  it("rejects invalid MIME type", () => {
    const file = makeFile("text/plain", 1024);
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateFile(file, "profilePicture").valid).toBe(false);
    expect(validateFile(file, "profilePicture").error).toBe("invalidType");
  });

  it("rejects image exceeding size limit", () => {
    const file = makeFile("image/jpeg", 100);
    Object.defineProperty(file, "size", { value: MAX_IMAGE_SIZE + 1 });
    expect(validateFile(file, "profilePicture").valid).toBe(false);
    expect(validateFile(file, "profilePicture").error).toBe("fileTooLarge");
  });

  it("accepts video for gameMedia context", () => {
    const file = makeFile("video/mp4", 100);
    Object.defineProperty(file, "size", { value: 1024 });
    expect(validateFile(file, "gameMedia")).toEqual({ valid: true });
  });

  it("rejects video exceeding video size limit", () => {
    const file = makeFile("video/mp4", 100);
    Object.defineProperty(file, "size", { value: MAX_VIDEO_SIZE + 1 });
    expect(validateFile(file, "gameMedia").valid).toBe(false);
    expect(validateFile(file, "gameMedia").error).toBe("fileTooLarge");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toContain("500");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toContain("1");
    expect(formatFileSize(1024).toLowerCase()).toContain("kb");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toContain("1");
    expect(formatFileSize(1024 * 1024).toLowerCase()).toContain("mb");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toContain("1");
    expect(formatFileSize(1024 * 1024 * 1024).toLowerCase()).toContain("gb");
  });
});

describe("getMaxSizeLabel", () => {
  it("returns 10 MB for image types", () => {
    expect(getMaxSizeLabel("image/jpeg")).toContain("10");
  });

  it("returns 100 MB for video types", () => {
    expect(getMaxSizeLabel("video/mp4")).toContain("100");
  });
});

describe("getAcceptAttribute", () => {
  it("returns image types only for profilePicture", () => {
    const result = getAcceptAttribute("profilePicture");
    expect(result).toContain("image/jpeg");
    expect(result).not.toContain("video/mp4");
  });

  it("returns all media types for gameMedia", () => {
    const result = getAcceptAttribute("gameMedia");
    expect(result).toContain("image/jpeg");
    expect(result).toContain("video/mp4");
  });

  it("returns all media types for chatMedia", () => {
    const result = getAcceptAttribute("chatMedia");
    expect(result).toContain("image/jpeg");
    expect(result).toContain("video/mp4");
  });
});
```

- [ ] **Steps 2-4: Run, investigate, commit** (see Standard Workflow)

---

### Task 4: in-process-rate-limiter

**Files:**
- Create: `__tests__/lib/in-process-rate-limiter.test.ts`
- Source: `src/lib/in-process-rate-limiter.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { InProcessTokenBucketRateLimiter } from "@/lib/in-process-rate-limiter";

describe("InProcessTokenBucketRateLimiter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows requests up to capacity", () => {
    const limiter = new InProcessTokenBucketRateLimiter(3, 1000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("rejects requests when tokens are exhausted", () => {
    const limiter = new InProcessTokenBucketRateLimiter(2, 1000);
    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("refills at least one token after one interval", () => {
    const limiter = new InProcessTokenBucketRateLimiter(2, 1000);
    limiter.tryAcquire();
    limiter.tryAcquire();
    expect(limiter.tryAcquire()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(limiter.tryAcquire()).toBe(true);
  });

  it("does not exceed capacity on refill", () => {
    const limiter = new InProcessTokenBucketRateLimiter(2, 1000);
    vi.advanceTimersByTime(10000);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
  });

  it("handles capacity of 1", () => {
    const limiter = new InProcessTokenBucketRateLimiter(1, 500);
    expect(limiter.tryAcquire()).toBe(true);
    expect(limiter.tryAcquire()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(limiter.tryAcquire()).toBe(true);
  });
});
```

- [ ] **Steps 2-4: Run, investigate, commit** (see Standard Workflow)

---

## Chunk 2: Tier 2 — Simple Hooks + Housekeeping

### Task 5: use-debounce

**Files:**
- Create: `__tests__/hooks/use-debounce.test.ts`
- Source: `src/hooks/use-debounce.ts`

- [ ] **Step 1: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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
    expect(result.current).toBe("a"); // still original
    act(() => vi.advanceTimersByTime(200));
    expect(result.current).toBe("c"); // final value after full delay
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
```

- [ ] **Steps 2-4: Run, investigate, commit** (see Standard Workflow)

---

### Task 6: use-recent-searches

**Files:**
- Create: `__tests__/hooks/use-recent-searches.test.ts`
- Source: `src/hooks/use-recent-searches.ts`

**Important:** `useRecentSearches` reads localStorage during `useState` initialization (lazy initializer). To test loading existing data, set `localStorage` **before** calling `renderHook`.

- [ ] **Step 1: Create test file**

Read the source file first to confirm the `STORAGE_KEY` constant and `MAX_ENTRIES` value.

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentSearches } from "@/hooks/use-recent-searches";

const STORAGE_KEY = "playground-recent-searches";

describe("useRecentSearches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty list when localStorage is empty", () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it("loads existing searches from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["foo", "bar"]));
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual(["foo", "bar"]);
  });

  it("adds a search to the list", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("test query"));
    expect(result.current.recentSearches).toContain("test query");
  });

  it("trims whitespace from search queries", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("  test  "));
    expect(result.current.recentSearches[0]).toBe("test");
  });

  it("deduplicates by moving existing search to front", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("first"));
    act(() => result.current.addSearch("second"));
    act(() => result.current.addSearch("first"));
    expect(result.current.recentSearches[0]).toBe("first");
    expect(result.current.recentSearches).toHaveLength(2);
  });

  it("limits to max 5 entries", () => {
    const { result } = renderHook(() => useRecentSearches());
    for (let i = 0; i < 7; i++) {
      act(() => result.current.addSearch(`search-${i}`));
    }
    expect(result.current.recentSearches).toHaveLength(5);
    expect(result.current.recentSearches[0]).toBe("search-6");
  });

  it("removes a specific search", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("keep"));
    act(() => result.current.addSearch("remove"));
    act(() => result.current.removeSearch("remove"));
    expect(result.current.recentSearches).toEqual(["keep"]);
  });

  it("clears all searches", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("one"));
    act(() => result.current.addSearch("two"));
    act(() => result.current.clearSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it("persists changes to localStorage", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("persisted"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toContain("persisted");
  });
});
```

- [ ] **Steps 2-4: Run, investigate, commit** (see Standard Workflow)

---

### Task 7: Move reducer test

**Files:**
- Move: `src/components/game/live/game-live-reducer.test.ts` -> `__tests__/components/game/live/game-live-reducer.test.ts`

- [ ] **Step 1: Move the file**

```bash
mkdir -p __tests__/components/game/live
mv src/components/game/live/game-live-reducer.test.ts __tests__/components/game/live/game-live-reducer.test.ts
```

- [ ] **Step 2: Update the import path**

In the moved file, change line 2 from:
```typescript
} from "./game-live-reducer";
```
to:
```typescript
} from "@/components/game/live/game-live-reducer";
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx vitest run __tests__/components/game/live/game-live-reducer.test.ts`
Expected: All 28 existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/components/game/live/game-live-reducer.test.ts src/components/game/live/
git commit -m "refactor: move reducer test to __tests__/ directory"
```

---

## Chunk 3: Tier 3 — Complex Hooks (WebSocket Subscriptions)

All three subscription hooks share the same mocking pattern. Read each source file first to verify the exact imports and API usage.

### Task 8: use-game-subscription

**Files:**
- Create: `__tests__/hooks/use-game-subscription.test.ts`
- Source: `src/hooks/use-game-subscription.ts`

- [ ] **Step 1: Read source file to confirm API**

Read `src/hooks/use-game-subscription.ts` and note:
- How `getGraphQLWsClient` is called
- How `client.subscribe()` is invoked (payload shape, sink/observer pattern)
- How throttling works (300ms debounce on onEvent)
- How tab visibility is handled
- How `client.on("connected", ...)` and `client.on("closed", ...)` are used

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// Must mock before importing the hook
vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

type Sink = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
  complete: () => void;
};

let capturedSink: Sink | null = null;
const mockUnsubscribe = vi.fn();
const mockOnCleanup = vi.fn();
const mockOn = vi.fn().mockReturnValue(mockOnCleanup);
const mockSubscribe = vi.fn().mockImplementation((_payload: unknown, sink: Sink) => {
  capturedSink = sink;
  return mockUnsubscribe;
});

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
    capturedSink = null;
  });

  it("does not subscribe when disabled", () => {
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: false,
        onEvent: vi.fn(),
      }),
    );
    expect(getGraphQLWsClient).not.toHaveBeenCalled();
  });

  it("subscribes when enabled", () => {
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
      }),
    );
    expect(getGraphQLWsClient).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
      }),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("passes subscription payload with query string", () => {
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
      }),
    );
    const payload = mockSubscribe.mock.calls[0]?.[0];
    expect(payload).toHaveProperty("query");
  });

  it("calls onEvent when event is received", async () => {
    vi.useFakeTimers();
    const onEvent = vi.fn();
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent,
      }),
    );

    // Simulate server sending an event
    const mockEvent = { type: "GAME_STARTED" };
    capturedSink?.next({ data: { gameEvents: mockEvent } });

    // onEvent may be throttled (300ms) — advance timers to flush
    act(() => vi.advanceTimersByTime(300));
    expect(onEvent).toHaveBeenCalledWith(mockEvent);
    vi.useRealTimers();
  });

  it("registers connection event listeners", () => {
    renderHook(() =>
      useGameSubscription({
        gameId: 1,
        enabled: true,
        onEvent: vi.fn(),
      }),
    );
    // Should register for "connected" and/or "closed" events
    expect(mockOn).toHaveBeenCalled();
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 9: use-chat-subscription

**Files:**
- Create: `__tests__/hooks/use-chat-subscription.test.ts`
- Source: `src/hooks/use-chat-subscription.ts`

- [ ] **Step 1: Read source file to confirm API**

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

type Sink = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
  complete: () => void;
};

let capturedSink: Sink | null = null;
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn().mockReturnValue(vi.fn());
const mockSubscribe = vi.fn().mockImplementation((_payload: unknown, sink: Sink) => {
  capturedSink = sink;
  return mockUnsubscribe;
});

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
    capturedSink = null;
  });

  it("does not subscribe when disabled", () => {
    renderHook(() =>
      useChatSubscription({
        enabled: false,
        onEvent: vi.fn(),
      }),
    );
    expect(getGraphQLWsClient).not.toHaveBeenCalled();
  });

  it("subscribes when enabled", () => {
    renderHook(() =>
      useChatSubscription({
        enabled: true,
        onEvent: vi.fn(),
      }),
    );
    expect(getGraphQLWsClient).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useChatSubscription({
        enabled: true,
        onEvent: vi.fn(),
      }),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("calls onEvent when event is received", () => {
    const onEvent = vi.fn();
    renderHook(() =>
      useChatSubscription({
        enabled: true,
        onEvent,
      }),
    );

    const mockEvent = { type: "MESSAGE_SENT" };
    capturedSink?.next({ data: { chatEvents: mockEvent } });
    expect(onEvent).toHaveBeenCalledWith(mockEvent);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 10: use-notification-subscription

**Files:**
- Create: `__tests__/hooks/use-notification-subscription.test.ts`
- Source: `src/hooks/use-notification-subscription.ts`

**Note:** This hook uniquely calls `disposeGraphQLWsClient()` when disabled (logout cleanup).

- [ ] **Step 1: Read source file to confirm API**

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@/components/auth/actions", () => ({
  getAccessToken: vi.fn().mockResolvedValue("mock-token"),
}));

type Sink = {
  next: (value: unknown) => void;
  error: (error: unknown) => void;
  complete: () => void;
};

let capturedSink: Sink | null = null;
const mockUnsubscribe = vi.fn();
const mockOn = vi.fn().mockReturnValue(vi.fn());
const mockSubscribe = vi.fn().mockImplementation((_payload: unknown, sink: Sink) => {
  capturedSink = sink;
  return mockUnsubscribe;
});
const mockDisposeGraphQLWsClient = vi.fn();

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
    capturedSink = null;
  });

  it("does not subscribe when disabled", () => {
    renderHook(() =>
      useNotificationSubscription({
        enabled: false,
        onNotification: vi.fn(),
      }),
    );
    expect(getGraphQLWsClient).not.toHaveBeenCalled();
  });

  it("subscribes when enabled", () => {
    renderHook(() =>
      useNotificationSubscription({
        enabled: true,
        onNotification: vi.fn(),
      }),
    );
    expect(getGraphQLWsClient).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const { unmount } = renderHook(() =>
      useNotificationSubscription({
        enabled: true,
        onNotification: vi.fn(),
      }),
    );
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it("calls onNotification when event is received", () => {
    const onNotification = vi.fn();
    renderHook(() =>
      useNotificationSubscription({
        enabled: true,
        onNotification,
      }),
    );

    // Check the source for the exact event shape (notificationEvents vs other key)
    const mockNotification = { id: "n1", isRead: false };
    capturedSink?.next({ data: { notificationEvents: { notification: mockNotification } } });
    expect(onNotification).toHaveBeenCalled();
  });

  it("disposes WS client when transitioning from enabled to disabled", () => {
    const { rerender } = renderHook(
      ({ enabled }) =>
        useNotificationSubscription({
          enabled,
          onNotification: vi.fn(),
        }),
      { initialProps: { enabled: true } },
    );
    rerender({ enabled: false });
    expect(mockDisposeGraphQLWsClient).toHaveBeenCalled();
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

## Chunk 4: Tier 4 — Server Actions (Game)

### Server Action Test Pattern

All server action tests follow this pattern. `extractMutationResult` is NOT mocked — it runs as real code.

**Response format from `authMutate`:**
```typescript
// Success:
{ data: { mutationName: { __typename: "SuccessTypeName", ...fields } } }

// GraphQL error:
{ errors: [{ message: "Error message" }] }

// Mutation error (wrong __typename):
{ data: { mutationName: { __typename: "MutationError", message: "Error" } } }
```

**Response format from `authQuery`:**
```typescript
// Success:
{ data: { queryName: { ...fields } } }
```

**Network errors:** `authMutate`/`authQuery` rejects with `new Error(...)`.

---

### Task 11: game/actions

**Files:**
- Create: `__tests__/[locale]/game/actions.test.ts`
- Source: `src/app/[locale]/game/actions.ts`

- [ ] **Step 1: Read source file to confirm all 11 function signatures and response type names**

Verify the exact `__typeName` strings used in each mutation (e.g., `"CreateGameResponse"`, `"UpdateGameResponse"`, `"DeleteGameResponse"`, `"StartGameResponse"`, `"EndGameResponse"`, `"AddGameEditorResponse"`, `"RemoveGameEditorResponse"`, `"TransferGameOwnershipResponse"`).

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
  authQuery: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  createGame,
  updateGame,
  deleteGame,
  startGame,
  endGame,
  loadMoreGames,
  loadGameMembers,
  addGameEditor,
  removeGameEditor,
  transferGameOwnership,
  loadGameMedia,
} from "@/app/[locale]/game/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

// -- Helpers --

function mockMutateSuccess(key: string, typeName: string, fields: Record<string, unknown> = {}) {
  vi.mocked(authMutate).mockResolvedValue({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

function mockMutateError(key: string, message = "Error") {
  vi.mocked(authMutate).mockResolvedValue({
    data: { [key]: { __typename: "MutationError", message } },
  });
}

function mockGraphQLErrors(message = "GraphQL error") {
  vi.mocked(authMutate).mockResolvedValue({
    errors: [{ message }],
  });
}

function mockNetworkError() {
  vi.mocked(authMutate).mockRejectedValue(new Error("Network error"));
}

// -- Tests --

describe("createGame", () => {
  // Read src/lib/types/game.ts for CreateGameInput type
  const validInput = {
    sportType: "BASKETBALL",
    startDate: "2024-01-01T00:00:00Z",
    metadata: { subtype: "FIVE_ON_FIVE" },
  };

  it("creates game and returns gameId", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", { game: { id: 42 } });
    const result = await createGame(validInput as never);
    expect(result.success).toBe(true);
    expect(result.gameId).toBe(42);
  });

  it("revalidates games page", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", { game: { id: 42 } });
    await createGame(validInput as never);
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("builds @oneOf input with sport key", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", { game: { id: 1 } });
    await createGame(validInput as never);
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const args = (call.createGame as Record<string, unknown>).__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input).toHaveProperty("basketball");
  });

  it("includes location with coordinates when provided", async () => {
    mockMutateSuccess("createGame", "CreateGameResponse", { game: { id: 1 } });
    const inputWithLocation = {
      ...validInput,
      location: {
        address: { city: "Springfield", state: "IL", country: "US" },
        coordinates: { latitude: 39.78, longitude: -89.65 },
      },
    };
    await createGame(inputWithLocation as never);
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const args = (call.createGame as Record<string, unknown>).__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    const sportInput = input.basketball as Record<string, unknown>;
    expect(sportInput.location).toBeDefined();
  });

  it("returns error on mutation error", async () => {
    mockMutateError("createGame");
    const result = await createGame(validInput as never);
    expect(result.success).toBe(false);
  });

  it("returns error on GraphQL errors", async () => {
    mockGraphQLErrors();
    const result = await createGame(validInput as never);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.GRAPHQL_ERROR);
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockNetworkError();
    const result = await createGame(validInput as never);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.UNEXPECTED_ERROR);
  });
});

describe("updateGame", () => {
  it("sends only provided fields (PATCH semantics)", async () => {
    mockMutateSuccess("updateGame", "UpdateGameResponse", { game: { id: 1, startDate: "2024-01-01" } });
    await updateGame({ id: 1, startDate: "2024-06-01" } as never);
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const args = (call.updateGame as Record<string, unknown>).__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input.id).toBe(1);
    expect(input.startDate).toBe("2024-06-01");
    expect(input).not.toHaveProperty("description");
  });

  it("builds metadata @oneOf for basketball", async () => {
    mockMutateSuccess("updateGame", "UpdateGameResponse", { game: { id: 1 } });
    await updateGame({
      id: 1,
      metadata: { basketball: { subtype: "FIVE_ON_FIVE", periods: 4 } },
    } as never);
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const args = (call.updateGame as Record<string, unknown>).__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input).toHaveProperty("metadata");
  });

  it("returns success with gameId", async () => {
    mockMutateSuccess("updateGame", "UpdateGameResponse", { game: { id: 5 } });
    const result = await updateGame({ id: 5 } as never);
    expect(result.success).toBe(true);
    expect(result.gameId).toBe(5);
  });

  it("returns error on mutation error", async () => {
    mockMutateError("updateGame");
    const result = await updateGame({ id: 1 } as never);
    expect(result.success).toBe(false);
  });
});

describe("deleteGame", () => {
  it("deletes game and revalidates", async () => {
    mockMutateSuccess("deleteGame", "DeleteGameResponse", { id: 1 });
    const result = await deleteGame(1);
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/games", "page");
  });

  it("returns error on mutation error", async () => {
    mockMutateError("deleteGame");
    const result = await deleteGame(1);
    expect(result.success).toBe(false);
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockNetworkError();
    const result = await deleteGame(1);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.UNEXPECTED_ERROR);
  });
});

describe("startGame", () => {
  it("starts game and revalidates", async () => {
    mockMutateSuccess("startGame", "StartGameResponse", { game: { id: 1 } });
    const result = await startGame(1);
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("includes startDate when provided", async () => {
    mockMutateSuccess("startGame", "StartGameResponse", { game: { id: 1 } });
    await startGame(1, "2024-06-01T10:00:00Z");
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const args = (call.startGame as Record<string, unknown>).__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input.startDate).toBe("2024-06-01T10:00:00Z");
  });

  it("returns error on failure", async () => {
    mockNetworkError();
    const result = await startGame(1);
    expect(result.success).toBe(false);
  });
});

describe("endGame", () => {
  it("ends game and revalidates", async () => {
    mockMutateSuccess("endGame", "EndGameResponse", { game: { id: 1 } });
    const result = await endGame(1);
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    mockNetworkError();
    const result = await endGame(1);
    expect(result.success).toBe(false);
  });
});

describe("loadMoreGames", () => {
  it("returns games edges and pageInfo", async () => {
    const mockResponse = {
      edges: [{ cursor: "c1", node: { id: 1 } }],
      pageInfo: { hasNextPage: true, endCursor: "c1" },
    };
    vi.mocked(authQuery).mockResolvedValue({
      data: { games: mockResponse },
    });

    const result = await loadMoreGames({}, { field: "START_DATE", direction: "DESC" } as never, "cursor");
    expect(result).toEqual(mockResponse);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadMoreGames({}, { field: "START_DATE", direction: "DESC" } as never, "cursor");
    expect(result).toBeNull();
  });
});

describe("loadGameMembers", () => {
  it("returns members array", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: { game: { members: { edges: [{ cursor: "c1", node: { id: 1, role: "OWNER" } }] } } },
    });
    const result = await loadGameMembers(1);
    expect(result?.members).toHaveLength(1);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadGameMembers(1);
    expect(result).toBeNull();
  });
});

describe("addGameEditor", () => {
  it("adds editor and returns gameMember", async () => {
    mockMutateSuccess("addGameEditor", "AddGameEditorResponse", {
      gameMember: { id: 1, user: { id: "u1" }, role: "EDITOR" },
    });
    const result = await addGameEditor(1, "u1");
    expect(result.success).toBe(true);
    expect(result.gameMember).toBeDefined();
  });

  it("returns error on failure", async () => {
    mockMutateError("addGameEditor");
    const result = await addGameEditor(1, "u1");
    expect(result.success).toBe(false);
  });
});

describe("removeGameEditor", () => {
  it("removes editor and revalidates", async () => {
    mockMutateSuccess("removeGameEditor", "RemoveGameEditorResponse", { id: 1 });
    const result = await removeGameEditor(1, "u1");
    expect(result.success).toBe(true);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("returns error on failure", async () => {
    mockMutateError("removeGameEditor");
    const result = await removeGameEditor(1, "u1");
    expect(result.success).toBe(false);
  });
});

describe("transferGameOwnership", () => {
  it("transfers ownership and returns new gameMember", async () => {
    mockMutateSuccess("transferGameOwnership", "TransferGameOwnershipResponse", {
      gameMember: { id: 1, user: { id: "u2" }, role: "OWNER" },
    });
    const result = await transferGameOwnership(1, "u2");
    expect(result.success).toBe(true);
    expect(result.gameMember).toBeDefined();
  });

  it("returns error on failure", async () => {
    mockMutateError("transferGameOwnership");
    const result = await transferGameOwnership(1, "u2");
    expect(result.success).toBe(false);
  });
});

describe("loadGameMedia", () => {
  it("returns media edges and pageInfo", async () => {
    const mockMedia = {
      edges: [{ cursor: "c1", node: { id: "r1", url: "https://example.com" } }],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    vi.mocked(authQuery).mockResolvedValue({
      data: { game: { media: mockMedia } },
    });
    const result = await loadGameMedia(1, 10);
    expect(result?.edges).toHaveLength(1);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadGameMedia(1, 10);
    expect(result).toBeNull();
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 12: game/box-score-actions

**Files:**
- Create: `__tests__/[locale]/game/box-score-actions.test.ts`
- Source: `src/app/[locale]/game/box-score-actions.ts`

- [ ] **Step 1: Read source file**

Verify `buildStatFields` logic and the `STAT_FIELDS` constant. Confirm the exact response type names.

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  saveBasketballBoxScore,
  saveBasketballBoxScores,
} from "@/app/[locale]/game/box-score-actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveBasketballBoxScore", () => {
  it("saves box score and returns boxScoreId", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        saveBasketballBoxScore: {
          __typename: "SaveBasketballBoxScoreResponse",
          basketballBoxScore: { id: 101 },
        },
      },
    });
    const result = await saveBasketballBoxScore({
      playerId: 1,
      gameId: 2,
      points: 25,
      assists: 5,
    } as never);
    expect(result.success).toBe(true);
    expect(result.boxScoreId).toBeDefined();
  });

  it("only includes defined stat fields (PATCH semantics)", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        saveBasketballBoxScore: {
          __typename: "SaveBasketballBoxScoreResponse",
          basketballBoxScore: { id: 1 },
        },
      },
    });
    await saveBasketballBoxScore({
      playerId: 1,
      gameId: 2,
      assists: 5,
      // points, steals, etc. not provided — should be omitted
    } as never);

    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const mutationObj = call.saveBasketballBoxScore as Record<string, unknown>;
    const args = mutationObj.__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input.assists).toBe(5);
    expect(input).not.toHaveProperty("steals");
    expect(input).not.toHaveProperty("blocks");
  });

  it("revalidates game page", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        saveBasketballBoxScore: {
          __typename: "SaveBasketballBoxScoreResponse",
          basketballBoxScore: { id: 1 },
        },
      },
    });
    await saveBasketballBoxScore({ playerId: 1, gameId: 2 } as never);
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/game/[id]", "page");
  });

  it("returns error on mutation error", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        saveBasketballBoxScore: { __typename: "MutationError", message: "Invalid" },
      },
    });
    const result = await saveBasketballBoxScore({ playerId: 1, gameId: 2 } as never);
    expect(result.success).toBe(false);
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await saveBasketballBoxScore({ playerId: 1, gameId: 2 } as never);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.UNEXPECTED_ERROR);
  });
});

describe("saveBasketballBoxScores", () => {
  it("saves batch and returns boxScoreIds", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        saveBasketballBoxScores: {
          __typename: "SaveBasketballBoxScoresResponse",
          basketballBoxScores: [{ id: 1 }, { id: 2 }],
        },
      },
    });
    const result = await saveBasketballBoxScores(1, [
      { playerId: 10, points: 20 },
      { playerId: 11, points: 15 },
    ] as never);
    expect(result.success).toBe(true);
    expect(result.boxScoreIds).toBeDefined();
  });

  it("returns VALIDATION_ERROR for empty scores array", async () => {
    const result = await saveBasketballBoxScores(1, []);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.VALIDATION_ERROR);
    // authMutate should NOT have been called
    expect(authMutate).not.toHaveBeenCalled();
  });

  it("returns error on network failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await saveBasketballBoxScores(1, [{ playerId: 10 }] as never);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 13: game/participant-actions

**Files:**
- Create: `__tests__/[locale]/game/participant-actions.test.ts`
- Source: `src/app/[locale]/game/participant-actions.ts`

- [ ] **Step 1: Read source file**

Verify all 8 function signatures, response type names, and the `updateParticipantScores` logic that determines `isTeam` from `entries[0]?.isTeam`.

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  addTeamParticipant,
  addIndividualParticipant,
  updateTeamParticipant,
  joinTeam,
  leaveTeam,
  removeTeamParticipant,
  removeIndividualParticipant,
  updateParticipantScores,
} from "@/app/[locale]/game/participant-actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockMutateSuccess(key: string, typeName: string, fields: Record<string, unknown> = {}) {
  vi.mocked(authMutate).mockResolvedValue({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

function mockMutateError(key: string) {
  vi.mocked(authMutate).mockResolvedValue({
    data: { [key]: { __typename: "MutationError", message: "Error" } },
  });
}

describe("addTeamParticipant", () => {
  it("adds team and returns participantId", async () => {
    mockMutateSuccess("addGameParticipant", "AddGameParticipantResponse", {
      participant: { __typename: "TeamInstance", id: 1, name: "Team A" },
    });
    const result = await addTeamParticipant({ gameId: 1, name: "Team A" } as never);
    expect(result.success).toBe(true);
    expect(result.participantId).toBe(1);
  });

  it("returns error on failure", async () => {
    mockMutateError("addGameParticipant");
    const result = await addTeamParticipant({ gameId: 1, name: "Team A" } as never);
    expect(result.success).toBe(false);
  });
});

describe("addIndividualParticipant", () => {
  it("adds individual and returns participantId", async () => {
    mockMutateSuccess("addGameParticipant", "AddGameParticipantResponse", {
      participant: { __typename: "IndividualParticipant", id: 2 },
    });
    const result = await addIndividualParticipant({ gameId: 1, playerId: 10 } as never);
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    mockMutateError("addGameParticipant");
    const result = await addIndividualParticipant({ gameId: 1, playerId: 10 } as never);
    expect(result.success).toBe(false);
  });
});

describe("updateTeamParticipant", () => {
  it("updates team participant", async () => {
    mockMutateSuccess("updateGameParticipant", "UpdateGameParticipantResponse", {
      participant: { __typename: "TeamInstance", id: 1 },
    });
    const result = await updateTeamParticipant({ teamInstanceId: 1, gameId: 1, name: "New Name" } as never);
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    mockMutateError("updateGameParticipant");
    const result = await updateTeamParticipant({ teamInstanceId: 1, gameId: 1 } as never);
    expect(result.success).toBe(false);
  });
});

describe("joinTeam", () => {
  it("joins team successfully", async () => {
    mockMutateSuccess("addPlayerToTeamInstance", "AddPlayerToTeamInstanceResponse", {
      teamInstance: { id: 1, name: "Team A", players: [] },
    });
    const result = await joinTeam({ teamInstanceId: 1, playerId: 10 } as never);
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    mockMutateError("addPlayerToTeamInstance");
    const result = await joinTeam({ teamInstanceId: 1, playerId: 10 } as never);
    expect(result.success).toBe(false);
  });
});

describe("leaveTeam", () => {
  it("leaves team successfully", async () => {
    mockMutateSuccess("removePlayerFromTeamInstance", "RemovePlayerFromTeamInstanceResponse", {
      teamInstance: { id: 1 },
    });
    const result = await leaveTeam({ teamInstanceId: 1, playerId: 10 } as never);
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    mockMutateError("removePlayerFromTeamInstance");
    const result = await leaveTeam({ teamInstanceId: 1, playerId: 10 } as never);
    expect(result.success).toBe(false);
  });
});

describe("removeTeamParticipant", () => {
  it("removes team participant", async () => {
    mockMutateSuccess("removeGameParticipant", "RemoveGameParticipantResponse", {});
    const result = await removeTeamParticipant({ gameId: 1, teamInstanceId: 1 } as never);
    expect(result.success).toBe(true);
  });
});

describe("removeIndividualParticipant", () => {
  it("removes individual participant", async () => {
    mockMutateSuccess("removeGameParticipant", "RemoveGameParticipantResponse", {});
    const result = await removeIndividualParticipant({ id: 2 } as never);
    expect(result.success).toBe(true);
  });
});

describe("updateParticipantScores", () => {
  it("sends team score updates when isTeam is true", async () => {
    mockMutateSuccess("updateGameParticipants", "UpdateGameParticipantsResponse", {
      participants: [],
    });
    const entries = [
      { id: 1, isTeam: true, metadata: { score: 10 } },
      { id: 2, isTeam: true, metadata: { score: 20 } },
    ];
    const result = await updateParticipantScores(entries as never);
    expect(result.success).toBe(true);

    // Verify the mutation input uses teamInstances key
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const mutation = call.updateGameParticipants as Record<string, unknown>;
    const args = mutation.__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input).toHaveProperty("teamInstances");
  });

  it("sends individual score updates when isTeam is false", async () => {
    mockMutateSuccess("updateGameParticipants", "UpdateGameParticipantsResponse", {
      participants: [],
    });
    const entries = [{ id: 1, isTeam: false, metadata: { score: 10 } }];
    const result = await updateParticipantScores(entries as never);
    expect(result.success).toBe(true);

    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const mutation = call.updateGameParticipants as Record<string, unknown>;
    const args = mutation.__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input).toHaveProperty("individuals");
  });

  it("returns error on network failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await updateParticipantScores([{ id: 1, isTeam: true, metadata: {} }] as never);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

## Chunk 5: Tier 4 — Server Actions (Remaining)

All remaining server action tests follow the same mock pattern established in Chunk 4. Read each source file first to confirm function signatures and response type names.

### Task 14: feed/actions

**Files:**
- Create: `__tests__/[locale]/feed/actions.test.ts`
- Source: `src/app/[locale]/feed/actions.ts`

- [ ] **Step 1: Read source file**

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authQuery } from "@/lib/graphql-request";

vi.mock("@/lib/graphql-request", () => ({
  authQuery: vi.fn(),
}));

import { loadFeedGames } from "@/app/[locale]/feed/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadFeedGames", () => {
  it("returns feed edges and pageInfo", async () => {
    const mockFeed = {
      edges: [{ cursor: "c1", node: { id: 1 } }],
      pageInfo: { hasNextPage: true, endCursor: "c1" },
    };
    vi.mocked(authQuery).mockResolvedValue({
      data: { friendsActivityFeed: mockFeed },
    });
    const result = await loadFeedGames(10);
    expect(result?.edges).toHaveLength(1);
    expect(result?.pageInfo.hasNextPage).toBe(true);
  });

  it("passes after cursor for pagination", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: { friendsActivityFeed: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    });
    await loadFeedGames(10, "cursor123");
    const call = vi.mocked(authQuery).mock.calls[0]![0] as Record<string, unknown>;
    const feedQuery = call.friendsActivityFeed as Record<string, unknown>;
    const args = feedQuery.__args as Record<string, unknown>;
    expect(args.after).toBe("cursor123");
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadFeedGames(10);
    expect(result).toBeNull();
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 15: settings/actions

**Files:**
- Create: `__tests__/[locale]/settings/actions.test.ts`
- Source: `src/app/[locale]/settings/actions.ts`

- [ ] **Step 1: Read source file**

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authQuery } from "@/lib/graphql-request";

vi.mock("@/lib/graphql-request", () => ({
  authQuery: vi.fn(),
}));

import { loadBlockedUsers } from "@/app/[locale]/settings/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadBlockedUsers", () => {
  it("returns blocked user edges and pageInfo", async () => {
    const mockResult = {
      edges: [{ cursor: "c1", node: { requester: { id: "u1" }, addressee: { id: "u2" } } }],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    vi.mocked(authQuery).mockResolvedValue({
      data: { friendships: mockResult },
    });
    const result = await loadBlockedUsers(20);
    expect(result?.edges).toHaveLength(1);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadBlockedUsers(20);
    expect(result).toBeNull();
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 16: upload/actions

**Files:**
- Create: `__tests__/[locale]/upload/actions.test.ts`
- Source: `src/app/[locale]/upload/actions.ts`

- [ ] **Step 1: Read source file**

Verify the 5 exported functions and their response type names.

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
}));

import {
  requestProfilePictureUpload,
  requestGameMediaUpload,
  requestChatMediaUpload,
  confirmUpload,
  deleteResource,
} from "@/app/[locale]/upload/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockMutateSuccess(key: string, typeName: string, fields: Record<string, unknown> = {}) {
  vi.mocked(authMutate).mockResolvedValue({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

describe("requestProfilePictureUpload", () => {
  it("returns uploadUrl and resourceId", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://s3.example.com/upload",
      resourceId: "r1",
    });
    const result = await requestProfilePictureUpload("photo.jpg", "image/jpeg", 1024);
    expect(result.success).toBe(true);
    expect(result.uploadUrl).toBe("https://s3.example.com/upload");
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await requestProfilePictureUpload("photo.jpg", "image/jpeg", 1024);
    expect(result.success).toBe(false);
  });
});

describe("requestGameMediaUpload", () => {
  it("includes gameId in context", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://s3.example.com/upload",
      resourceId: "r2",
    });
    const result = await requestGameMediaUpload("video.mp4", "video/mp4", 5000, 42);
    expect(result.success).toBe(true);
  });
});

describe("requestChatMediaUpload", () => {
  it("includes chatRoomId in context", async () => {
    mockMutateSuccess("requestUpload", "RequestUploadResponse", {
      uploadUrl: "https://s3.example.com/upload",
      resourceId: "r3",
    });
    const result = await requestChatMediaUpload("image.png", "image/png", 2048, "room-1");
    expect(result.success).toBe(true);
  });
});

describe("confirmUpload", () => {
  it("confirms and returns resource", async () => {
    mockMutateSuccess("confirmUpload", "ConfirmUploadResponse", {
      resource: { id: "r1", url: "https://cdn.example.com/r1" },
    });
    const result = await confirmUpload("r1");
    expect(result.success).toBe(true);
    expect(result.resource).toBeDefined();
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: { confirmUpload: { __typename: "MutationError", message: "Not found" } },
    });
    const result = await confirmUpload("r1");
    expect(result.success).toBe(false);
  });
});

describe("deleteResource", () => {
  it("deletes resource successfully", async () => {
    mockMutateSuccess("deleteResource", "DeleteResourceResponse", {});
    const result = await deleteResource("r1");
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await deleteResource("r1");
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 17: user/[username]/actions

**Files:**
- Create: `__tests__/[locale]/user/[username]/actions.test.ts`
- Source: `src/app/[locale]/user/[username]/actions.ts`

- [ ] **Step 1: Read source file**

Verify the 6 exported functions, especially `updateUser` (different __typename check) and `updatePlayer` (PATCH semantics with `"age" in input`).

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";
import { revalidatePath } from "next/cache";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import {
  sendFriendRequest,
  acceptFriendRequest,
  blockUser,
  unblockUser,
  updateUser,
  updatePlayer,
} from "@/app/[locale]/user/[username]/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendFriendRequest", () => {
  it("sends request and returns friendship", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        sendFriendRequest: {
          __typename: "SendFriendRequestResponse",
          friendship: { id: "f1", status: "PENDING" },
        },
      },
    });
    const result = await sendFriendRequest("u2");
    expect(result).toBeDefined();
  });

  it("returns error on network failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await sendFriendRequest("u2");
    expect(result.success).toBe(false);
  });
});

describe("acceptFriendRequest", () => {
  it("accepts request", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        acceptFriendRequest: {
          __typename: "AcceptFriendRequestResponse",
          friendship: { id: "f1", status: "ACCEPTED" },
        },
      },
    });
    const result = await acceptFriendRequest("u2");
    expect(result).toBeDefined();
  });
});

describe("blockUser", () => {
  it("blocks user", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        blockUser: {
          __typename: "BlockUserResponse",
          friendship: { id: "f1", status: "BLOCKED" },
        },
      },
    });
    const result = await blockUser("u2");
    expect(result).toBeDefined();
  });
});

describe("unblockUser", () => {
  it("unblocks user", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        unblockUser: { __typename: "UnblockUserResponse" },
      },
    });
    const result = await unblockUser("u2");
    expect(result).toBeDefined();
  });
});

describe("updateUser", () => {
  it("updates user and revalidates", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        updateUser: {
          __typename: "UpdateUserResponse",
          user: { id: "u1", displayName: "New Name", biography: "Bio" },
        },
      },
    });
    const result = await updateUser({ displayName: "New Name" });
    expect(result.success).toBe(true);
    expect(result.user?.displayName).toBe("New Name");
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("sends only provided fields (PATCH)", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        updateUser: {
          __typename: "UpdateUserResponse",
          user: { id: "u1", displayName: "Name", biography: null },
        },
      },
    });
    await updateUser({ biography: null }); // explicitly clear biography
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const mutation = call.updateUser as Record<string, unknown>;
    const args = mutation.__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input).toHaveProperty("biography");
    expect(input).not.toHaveProperty("displayName");
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await updateUser({ displayName: "Name" });
    expect(result.success).toBe(false);
  });
});

describe("updatePlayer", () => {
  it("updates player with PATCH semantics", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        updatePlayer: {
          __typename: "UpdatePlayerResponse",
          player: { id: 1, age: 25, height: null, weight: null },
        },
      },
    });
    const result = await updatePlayer({ age: 25 } as never);
    expect(result.success).toBe(true);
    expect(result.player?.age).toBe(25);
  });

  it("only includes fields present in input", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        updatePlayer: {
          __typename: "UpdatePlayerResponse",
          player: { id: 1, height: 180 },
        },
      },
    });
    await updatePlayer({ height: 180 } as never);
    const call = vi.mocked(authMutate).mock.calls[0]![0] as Record<string, unknown>;
    const mutation = call.updatePlayer as Record<string, unknown>;
    const args = mutation.__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input).toHaveProperty("height");
    expect(input).not.toHaveProperty("age");
    expect(input).not.toHaveProperty("weight");
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await updatePlayer({ age: 25 } as never);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 18: chat/actions

**Files:**
- Create: `__tests__/[locale]/chat/actions.test.ts`
- Source: `src/app/[locale]/chat/actions.ts`

This is the largest action file (15 functions + 4 Zod schemas). Read the source carefully.

- [ ] **Step 1: Read source file**

Verify all function signatures, Zod schemas, and response type names. Pay special attention to:
- `sendMessageSchema`, `updateMessageSchema`, `createDirectMessageSchema`, `createGroupChatSchema`
- Functions that validate with Zod before calling `authMutate`

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { MutationErrorType } from "@/lib/graphql-result";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
  authQuery: vi.fn(),
}));

import {
  loadChatRooms,
  loadChatRoom,
  loadMessages,
  loadFriendships,
  findDirectMessageRoom,
  createDirectMessage,
  createGroupChat,
  sendMessage,
  sendMediaMessage,
  updateMessage,
  deleteMessage,
  addMember,
  updateMemberRole,
  leaveChat,
  removeMember,
} from "@/app/[locale]/chat/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockMutateSuccess(key: string, typeName: string, fields: Record<string, unknown> = {}) {
  vi.mocked(authMutate).mockResolvedValue({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

// -- Query-based actions --

describe("loadChatRooms", () => {
  it("returns chat room edges", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: {
        chatRooms: {
          edges: [{ cursor: "c1", node: { id: "room1" } }],
          pageInfo: { hasNextPage: false, endCursor: "c1" },
        },
      },
    });
    const result = await loadChatRooms(10);
    expect(result?.edges).toHaveLength(1);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadChatRooms(10);
    expect(result).toBeNull();
  });
});

describe("loadChatRoom", () => {
  it("returns chat room detail", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: { chatRoom: { id: "room1", __typename: "DirectMessageChatRoom" } },
    });
    const result = await loadChatRoom("room1");
    expect(result).toBeDefined();
    expect(result?.id).toBe("room1");
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadChatRoom("room1");
    expect(result).toBeNull();
  });
});

describe("loadMessages", () => {
  it("returns message edges with backward pagination", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: {
        chatRoom: {
          chatMessages: {
            edges: [{ cursor: "m1", node: { id: "msg1" } }],
            pageInfo: { hasPreviousPage: true, startCursor: "m1" },
          },
        },
      },
    });
    const result = await loadMessages("room1", 20);
    expect(result?.edges).toHaveLength(1);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadMessages("room1", 20);
    expect(result).toBeNull();
  });
});

describe("loadFriendships", () => {
  it("returns friendship edges", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: {
        friendships: {
          edges: [{ cursor: "f1", node: { requester: { id: "u1" } } }],
          pageInfo: { hasNextPage: false, endCursor: "f1" },
        },
      },
    });
    const result = await loadFriendships(20);
    expect(result?.edges).toHaveLength(1);
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await loadFriendships(20);
    expect(result).toBeNull();
  });
});

describe("findDirectMessageRoom", () => {
  it("returns existing DM room", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: { directMessageChatRoom: { id: "dm1" } },
    });
    const result = await findDirectMessageRoom("u2");
    expect(result?.id).toBe("dm1");
  });

  it("returns null when no DM room exists", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: { directMessageChatRoom: null },
    });
    const result = await findDirectMessageRoom("u2");
    expect(result).toBeNull();
  });

  it("returns null on error", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await findDirectMessageRoom("u2");
    expect(result).toBeNull();
  });
});

// -- Mutation-based actions with Zod validation --

describe("createDirectMessage", () => {
  it("creates DM room", async () => {
    mockMutateSuccess("createDirectMessage", "CreateDirectMessageResponse", {
      chatRoom: { id: "dm1" },
    });
    const result = await createDirectMessage("u2");
    expect(result.success).toBe(true);
    expect(result.chatRoom).toBeDefined();
  });

  it("returns validation error for empty userId", async () => {
    const result = await createDirectMessage("");
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.VALIDATION_ERROR);
    expect(authMutate).not.toHaveBeenCalled();
  });
});

describe("createGroupChat", () => {
  it("creates group chat", async () => {
    mockMutateSuccess("createGroupChat", "CreateGroupChatResponse", {
      chatRoom: { id: "g1" },
    });
    const result = await createGroupChat("My Group", ["u2", "u3"]);
    expect(result.success).toBe(true);
  });

  it("returns validation error for empty name", async () => {
    const result = await createGroupChat("", ["u2"]);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.VALIDATION_ERROR);
    expect(authMutate).not.toHaveBeenCalled();
  });

  it("returns validation error for empty userIds", async () => {
    const result = await createGroupChat("Group", []);
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.VALIDATION_ERROR);
    expect(authMutate).not.toHaveBeenCalled();
  });
});

describe("sendMessage", () => {
  it("sends text message", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: { id: "msg1" },
    });
    const result = await sendMessage("room1", "Hello!");
    expect(result.success).toBe(true);
    expect(result.chatMessage).toBeDefined();
  });

  it("sends message with replyToId", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: { id: "msg2" },
    });
    const result = await sendMessage("room1", "Reply!", "msg1");
    expect(result.success).toBe(true);
  });

  it("returns validation error for empty content", async () => {
    const result = await sendMessage("room1", "");
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.VALIDATION_ERROR);
    expect(authMutate).not.toHaveBeenCalled();
  });

  it("returns validation error for content exceeding 5000 chars", async () => {
    const result = await sendMessage("room1", "x".repeat(5001));
    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.VALIDATION_ERROR);
    expect(authMutate).not.toHaveBeenCalled();
  });
});

describe("sendMediaMessage", () => {
  it("sends media message", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: { id: "msg3" },
    });
    const result = await sendMediaMessage("room1", "r1");
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await sendMediaMessage("room1", "r1");
    expect(result.success).toBe(false);
  });
});

describe("updateMessage", () => {
  it("updates message content", async () => {
    mockMutateSuccess("updateChatMessage", "UpdateChatMessageResponse", {
      chatMessage: { id: "msg1", updatedDate: "2024-01-01" },
    });
    const result = await updateMessage("msg1", "Updated content");
    expect(result.success).toBe(true);
  });

  it("returns validation error for empty content", async () => {
    const result = await updateMessage("msg1", "");
    expect(result.success).toBe(false);
    expect(authMutate).not.toHaveBeenCalled();
  });
});

describe("deleteMessage", () => {
  it("deletes message", async () => {
    mockMutateSuccess("deleteChatMessage", "DeleteChatMessageResponse", {});
    const result = await deleteMessage("msg1");
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await deleteMessage("msg1");
    expect(result.success).toBe(false);
  });
});

describe("addMember", () => {
  it("adds member to chat room", async () => {
    mockMutateSuccess("addChatRoomMember", "AddChatRoomMemberResponse", {
      member: { user: { id: "u2" }, role: "MEMBER" },
    });
    const result = await addMember("room1", "u2");
    expect(result.success).toBe(true);
    expect(result.member).toBeDefined();
  });
});

describe("updateMemberRole", () => {
  it("updates member role", async () => {
    mockMutateSuccess("updateChatRoomMemberRole", "UpdateChatRoomMemberRoleResponse", {});
    const result = await updateMemberRole("room1", "u2", "ADMIN" as never);
    expect(result.success).toBe(true);
  });
});

describe("leaveChat", () => {
  it("leaves chat room", async () => {
    mockMutateSuccess("leaveChatRoom", "LeaveChatRoomResponse", {});
    const result = await leaveChat("room1");
    expect(result.success).toBe(true);
  });
});

describe("removeMember", () => {
  it("removes member from chat room", async () => {
    mockMutateSuccess("removeChatRoomMember", "RemoveChatRoomMemberResponse", {});
    const result = await removeMember("room1", "u2");
    expect(result.success).toBe(true);
  });

  it("returns error on failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await removeMember("room1", "u2");
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 19: search/actions

**Files:**
- Create: `__tests__/components/search/actions.test.ts`
- Source: `src/components/search/actions.ts`

**Note:** This file branches on authentication — uses `authQuery` when authenticated, `query` when not. It also imports `auth` from `@/lib/auth` and `headers` from `next/headers`.

- [ ] **Step 1: Read source file**

Verify the exact auth check pattern and what `buildSearchUsersQuery` does.

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authQuery, query } from "@/lib/graphql-request";
import { auth } from "@/lib/auth";

vi.mock("@/lib/graphql-request", () => ({
  authQuery: vi.fn(),
  query: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { searchUsers } from "@/components/search/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

const mockSearchResult = {
  data: {
    searchUsers: {
      edges: [{ cursor: "c1", node: { id: "u1", username: "testuser" } }],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    },
  },
};

describe("searchUsers", () => {
  it("returns empty edges for empty query", async () => {
    const result = await searchUsers("   ", 10);
    expect(result.edges).toEqual([]);
    expect(authQuery).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
  });

  it("uses authQuery when authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue({ user: { id: "u1" }, session: {} } as never);
    vi.mocked(authQuery).mockResolvedValue(mockSearchResult);
    const result = await searchUsers("test", 10);
    expect(authQuery).toHaveBeenCalled();
    expect(query).not.toHaveBeenCalled();
    expect(result.edges).toHaveLength(1);
  });

  it("uses query when not authenticated", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    vi.mocked(query).mockResolvedValue(mockSearchResult);
    const result = await searchUsers("test", 10);
    expect(query).toHaveBeenCalled();
    expect(authQuery).not.toHaveBeenCalled();
    expect(result.edges).toHaveLength(1);
  });

  it("trims whitespace from query", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    vi.mocked(query).mockResolvedValue(mockSearchResult);
    await searchUsers("  test  ", 10);
    const call = vi.mocked(query).mock.calls[0]![0] as Record<string, unknown>;
    const searchQuery = call.searchUsers as Record<string, unknown>;
    const args = searchQuery.__args as Record<string, unknown>;
    const input = args.input as Record<string, unknown>;
    expect(input.query).toBe("test");
  });

  it("returns error result on failure", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null as never);
    vi.mocked(query).mockRejectedValue(new Error("fail"));
    const result = await searchUsers("test", 10);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)

---

### Task 20: notification/actions

**Files:**
- Create: `__tests__/components/notification/actions.test.ts`
- Source: `src/components/notification/actions.ts`

- [ ] **Step 1: Read source file**

Verify the 2 exported functions, `buildNotificationsQuery` helper, and response type names.

- [ ] **Step 2: Create test file**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { authMutate, authQuery } from "@/lib/graphql-request";

vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
  authQuery: vi.fn(),
}));

import {
  fetchNotifications,
  markNotificationsAsRead,
} from "@/components/notification/actions";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchNotifications", () => {
  it("returns notification edges and pageInfo", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: {
        notifications: {
          edges: [{ cursor: "n1", node: { id: "n1", isRead: false } }],
          pageInfo: { hasNextPage: true, endCursor: "n1" },
        },
      },
    });
    const result = await fetchNotifications(10);
    expect(result.success).toBe(true);
    expect(result.edges).toHaveLength(1);
  });

  it("passes after cursor for pagination", async () => {
    vi.mocked(authQuery).mockResolvedValue({
      data: {
        notifications: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    });
    await fetchNotifications(10, "cursor123");
    const call = vi.mocked(authQuery).mock.calls[0]![0] as Record<string, unknown>;
    const notifQuery = call.notifications as Record<string, unknown>;
    const args = notifQuery.__args as Record<string, unknown>;
    expect(args.after).toBe("cursor123");
  });

  it("returns error on failure", async () => {
    vi.mocked(authQuery).mockRejectedValue(new Error("fail"));
    const result = await fetchNotifications(10);
    expect(result.success).toBe(false);
  });
});

describe("markNotificationsAsRead", () => {
  it("marks notifications as read", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        readNotifications: {
          __typename: "ReadNotificationsResponse",
          notifications: [{ id: "n1", isRead: true }],
        },
      },
    });
    const result = await markNotificationsAsRead(["n1"]);
    expect(result.success).toBe(true);
    expect(result.notifications).toHaveLength(1);
  });

  it("returns error on mutation error", async () => {
    vi.mocked(authMutate).mockResolvedValue({
      data: {
        readNotifications: { __typename: "MutationError", message: "Error" },
      },
    });
    const result = await markNotificationsAsRead(["n1"]);
    expect(result.success).toBe(false);
  });

  it("returns error on network failure", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("fail"));
    const result = await markNotificationsAsRead(["n1"]);
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Steps 3-5: Run, investigate, commit** (see Standard Workflow)
