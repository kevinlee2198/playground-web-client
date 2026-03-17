# Unit Testing Strategy — Pure Logic Focus

## Overview

Add comprehensive unit tests targeting pure logic: utility functions, custom hooks, server actions, and stateful classes. Component rendering tests are excluded (covered by existing unit tests and future Playwright integration tests).

Framework: Vitest + @testing-library/react (already configured).

## Testing Philosophy

**Tests validate behavior, not just confirm code works.** When a test fails, the bug may be in the source code, not the test. Treat test failures as potential bug discoveries — investigate the source before assuming the test is wrong.

## Scope

### In Scope

#### Tier 1 — Pure Utility Functions (no mocking needed)

| File | What to test |
|------|-------------|
| `src/lib/unit-conversion.ts` | Height/weight conversions (cm to ft/in, kg to lbs), formatting, edge cases (0, negative, large values) |
| `src/lib/location-utils.ts` | Location string formatting, null/missing field handling |
| `src/lib/upload-validation.ts` | File type validation, size limits, edge cases (empty file, wrong mime type) |
| `src/lib/graphql-connection.ts` | Connection/pagination helpers, empty connections, single-page results |
| `src/lib/in-process-rate-limiter.ts` | Token consumption, refill over time, burst behavior, edge cases (0 tokens, rapid calls) |

#### Tier 2 — Simple Hooks

| File | What to test |
|------|-------------|
| `src/hooks/use-debounce.ts` | Debounced value updates after delay, cleanup on unmount, rapid value changes |
| `src/hooks/use-recent-searches.ts` | localStorage read/write, deduplication, max history limit, empty state |

#### Tier 3 — Complex Hooks (WebSocket subscriptions)

| File | What to test |
|------|-------------|
| `src/hooks/use-game-subscription.ts` | Subscription setup/teardown, throttled state updates, tab visibility pause/resume, reconnection |
| `src/hooks/use-chat-subscription.ts` | Message subscription, cleanup, error handling |
| `src/hooks/use-notification-subscription.ts` | Notification subscription, cleanup, error handling |

#### Tier 4 — Server Actions

| File | What to test |
|------|-------------|
| `src/app/[locale]/game/actions.ts` | startGame/endGame mutation shaping, return value transformation, error handling |
| `src/app/[locale]/game/box-score-actions.ts` | Basketball/football/tennis score mutation shaping, error paths |
| `src/app/[locale]/game/participant-actions.ts` | Add/remove participant mutations, error handling |
| `src/app/[locale]/feed/actions.ts` | Feed mutation shaping, error handling |
| `src/app/[locale]/settings/actions.ts` | Settings mutation shaping, error handling |
| `src/app/[locale]/upload/actions.ts` | S3 upload action shaping, error handling |
| `src/app/[locale]/user/[username]/actions.ts` | User profile mutation shaping, error handling |

#### Housekeeping

- Move `src/components/game/live/game-live-reducer.test.ts` to `__tests__/components/game/live/game-live-reducer.test.ts`

### Out of Scope

- **shadcn/ui components** — third-party primitives
- **Async server components** (pages, layouts) — Next.js recommends E2E
- **i18n configuration** — thin next-intl wrappers
- **Auth configuration** — config/setup, not logic
- **GraphQL fragments** — object literals, no logic
- **Constants** — static data
- **`src/lib/utils.ts`** — trivial re-export of cn()
- **Component rendering** — covered by existing tests + future Playwright

## File Structure

All tests in `__tests__/` directory, mirroring source paths:

```
__tests__/
  lib/
    unit-conversion.test.ts
    location-utils.test.ts
    upload-validation.test.ts
    graphql-connection.test.ts
    in-process-rate-limiter.test.ts
  hooks/
    use-debounce.test.ts
    use-recent-searches.test.ts
    use-game-subscription.test.ts
    use-chat-subscription.test.ts
    use-notification-subscription.test.ts
  [locale]/
    game/
      actions.test.ts
      box-score-actions.test.ts
      participant-actions.test.ts
    feed/
      actions.test.ts
    settings/
      actions.test.ts
    upload/
      actions.test.ts
    user/
      [username]/
        actions.test.ts
  components/
    game/
      live/
        game-live-reducer.test.ts   (moved from colocated)
```

## Testing Patterns

### Pure Functions (Tier 1)

No mocking needed. Test inputs and outputs directly.

```typescript
describe("kgToLbs", () => {
  it("converts 0 kg to 0 lbs", () => {
    expect(kgToLbs(0)).toBe(0);
  });
  it("converts 100 kg correctly", () => {
    expect(kgToLbs(100)).toBeCloseTo(220.46);
  });
  it("handles negative values", () => {
    // verify behavior — may reveal a bug if negatives aren't handled
  });
});
```

### Hooks (Tiers 2 & 3)

Use `renderHook` from `@testing-library/react`. Use `vi.useFakeTimers()` for time-dependent hooks.

```typescript
describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("updates value after delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "hello" } }
    );
    rerender({ value: "world" });
    expect(result.current).toBe("hello");
    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("world");
  });
});
```

### WebSocket Subscription Hooks (Tier 3)

Mock `graphql-ws` client. Simulate message delivery, test throttle behavior, tab visibility, and cleanup.

```typescript
vi.mock("@/lib/graphql-ws-client", () => ({
  getWsClient: vi.fn(() => ({
    subscribe: vi.fn(),
    dispose: vi.fn(),
  })),
}));
```

### Server Actions (Tier 4)

Mock `authMutate`/`authQuery` from `@/lib/graphql-request.ts` and `revalidatePath`/`revalidateTag` from `next/cache`.

```typescript
vi.mock("@/lib/graphql-request", () => ({
  authMutate: vi.fn(),
}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

describe("startGame", () => {
  it("sends correct mutation shape", async () => {
    vi.mocked(authMutate).mockResolvedValue({ startGame: { id: 1 } });
    await startGame(1);
    expect(authMutate).toHaveBeenCalledWith(
      expect.objectContaining({ mutation: expect.any(Object) })
    );
  });

  it("calls revalidatePath after success", async () => {
    vi.mocked(authMutate).mockResolvedValue({ startGame: { id: 1 } });
    await startGame(1);
    expect(revalidatePath).toHaveBeenCalled();
  });

  it("propagates errors", async () => {
    vi.mocked(authMutate).mockRejectedValue(new Error("Network error"));
    await expect(startGame(1)).rejects.toThrow("Network error");
  });
});
```

### Rate Limiter (Tier 1, special case)

Use `vi.useFakeTimers()` to control time progression for token refill testing.

### localStorage (Tier 2, useRecentSearches)

Rely on jsdom's built-in localStorage implementation.

### Existing Patterns to Follow

- Fixture builders with `Partial` overrides for complex input objects
- `describe` blocks grouped by function/behavior
- Descriptive test names: `it("returns 0 lbs when kg is 0")`
- `setup()` functions for repeated mock configurations

## Implementation Order

1. Tier 1: Pure utility functions (5 test files)
2. Tier 2: Simple hooks (2 test files)
3. Housekeeping: Move reducer test
4. Tier 3: Complex hooks (3 test files)
5. Tier 4: Server actions (7 test files)

Total: 17 new test files + 1 moved file
