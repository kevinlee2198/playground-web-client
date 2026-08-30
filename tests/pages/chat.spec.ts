import { http } from "msw";

import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import {
  CHAT_OTHER_USER,
  mockChatConversationHandler,
  mockChatRoomDetail,
  mockChatRoomListNode,
  mockEmptyChatRoomsResponse,
  mockTextMessage,
  PNG_1X1_BASE64,
} from "../fixtures/mock-data/chat";

// Day-boundary logic (buildThreadItems/classifyDayLabel) uses local Date
// getters, so the conversation-view specs pin the browser's timezone for
// deterministic "Today" / absolute-date labeling, independent of whatever
// timezone the test runner's OS defaults to.
test.use({ timezoneId: "America/New_York" });

const chatRoomsError = () => ({
  data: null,
  errors: [{ message: "Server error", extensions: { classification: "INTERNAL_ERROR" } }],
});

test.describe("Chat Page", () => {
  test("[CRITICAL] unauthenticated: redirects to /", async ({
    unauthenticatedPage,
  }) => {
    await unauthenticatedPage.goto("/en/chat");
    await expect(unauthenticatedPage).toHaveURL(/\/en\/?$/);
  });

  test("[CRITICAL] authenticated: chat layout renders", async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto("/en/chat");
    await expect(authenticatedPage).toHaveURL(/\/en\/chat/);
    await expect(authenticatedPage.locator("body")).toBeVisible();
    // The room-list row renders the other DM participant's display name.
    await expect(authenticatedPage.getByText(CHAT_OTHER_USER.displayName)).toBeVisible();
  });

  test("authenticated: error state when rooms fail to load", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(chatRoomsError));
    await authenticatedPage.goto("/en/chat");
    await expect(authenticatedPage).toHaveURL(/\/en\/chat/);
  });

  test("authenticated: empty state when no chat rooms", async ({
    authenticatedPage,
    msw,
  }) => {
    msw.use(withMeGuard(mockEmptyChatRoomsResponse));
    await authenticatedPage.goto("/en/chat");
    await expect(authenticatedPage).toHaveURL(/\/en\/chat/);
    await expect(authenticatedPage.getByText("No conversations yet.")).toBeVisible();
  });

  test("day separators render at a day boundary and the send flow still works", async ({
    authenticatedPage,
    msw,
  }) => {
    // The day-boundary BUCKETING (today/yesterday/absolute-date) uses native
    // Date getters, which respect the browser's America/New_York timezone
    // override (`test.use({ timezoneId })` above). The absolute-date LABEL
    // TEXT, however, is rendered by next-intl's formatter, which in this
    // environment resolves its own (server-determined) ambient timezone
    // rather than the browser's override. Anchoring the "older" timestamp at
    // 16:00 UTC keeps both interpretations safely mid-day (noon EDT / 9am
    // PDT / etc.) so they agree on the same calendar date regardless of
    // which timezone each side actually uses — avoiding a spurious
    // off-by-one-day mismatch between the two.
    const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
    const nowUtc = new Date();
    const anchorUtc = Date.UTC(
      nowUtc.getUTCFullYear(),
      nowUtc.getUTCMonth(),
      nowUtc.getUTCDate(),
      16,
      0,
      0,
    );
    const olderTimestamp = new Date(anchorUtc - THREE_DAYS_MS).toISOString();
    // "Today" is asserted via the exact translated string (not formatted
    // text), so it only depends on the BROWSER's (New York) bucketing — using
    // the current instant unmodified is safe (no relative offset to
    // spuriously cross a local-midnight boundary).
    const todayTimestamp = new Date().toISOString();

    const olderMessage = mockTextMessage({
      id: "msg-older-day",
      createdDate: olderTimestamp,
      content: "Hey from a few days ago",
      user: CHAT_OTHER_USER,
    });
    const todayMessage = mockTextMessage({
      id: "msg-today",
      createdDate: todayTimestamp,
      content: "Hi from today",
      user: CHAT_OTHER_USER,
    });

    const room = mockChatRoomDetail({
      id: "room-day-boundary",
      chatMessages: {
        edges: [
          { cursor: "msg-older-day", node: olderMessage },
          { cursor: "msg-today", node: todayMessage },
        ],
        pageInfo: { hasPreviousPage: false, startCursor: null },
      },
    });
    const roomListEntry = mockChatRoomListNode({
      id: "room-day-boundary",
      chatMessages: { edges: [{ node: todayMessage }] },
    });

    msw.use(mockChatConversationHandler({ roomListEntry, room }));

    await authenticatedPage.goto("/en/chat?room=room-day-boundary");

    // Scope thread assertions to the message-thread region (aria-label
    // "Messages") — the room-list row's last-message preview can otherwise
    // contain the same text and make `getByText` ambiguous.
    const thread = authenticatedPage.getByLabel("Messages");
    await expect(thread.getByText("Hey from a few days ago")).toBeVisible();
    await expect(thread.getByText("Hi from today")).toBeVisible();

    // Exactly one separator per calendar day: the older message's absolute
    // date, and "Today" for the same-day message.
    // Select on the design system's own attributes (Marker stamps
    // data-slot/data-variant via useRender) — no test-only markup needed.
    // Scoped to the thread, and system notices are default-variant Markers,
    // so this matches day separators only.
    const daySeparators = thread.locator(
      '[data-slot="marker"][data-variant="separator"]',
    );
    await expect(daySeparators).toHaveCount(2);

    const expectedOlderLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(olderTimestamp));
    await expect(daySeparators.nth(0)).toContainText(expectedOlderLabel);
    await expect(daySeparators.nth(1)).toHaveText("Today");

    // The day separator is decoration: hidden from assistive tech and not
    // actionable.
    await expect(daySeparators.nth(0)).toHaveAttribute("aria-hidden", "true");
    // Element-level (not role-based) query: aria-hidden empties the a11y
    // tree, so getByRole would count 0 regardless — check real DOM instead.
    await expect(daySeparators.nth(0).locator("button, a")).toHaveCount(0);

    // Sending a new message after the boundary must still work (the
    // separator doesn't break the room's send flow).
    await authenticatedPage
      .getByPlaceholder("Type a message...")
      .fill("Sending after the separators");
    await authenticatedPage.getByRole("button", { name: "Send" }).click();
    await expect(
      thread.getByText("Sending after the separators"),
    ).toBeVisible();
  });

  test("a captioned media message can be sent and renders with its caption", async ({
    authenticatedPage,
    msw,
  }) => {
    const room = mockChatRoomDetail({
      id: "room-media-caption",
      chatMessages: { edges: [], pageInfo: { hasPreviousPage: false, startCursor: null } },
    });
    const roomListEntry = mockChatRoomListNode({ id: "room-media-caption" });

    msw.use(mockChatConversationHandler({ roomListEntry, room }));

    await authenticatedPage.goto("/en/chat?room=room-media-caption");

    await expect(authenticatedPage.getByPlaceholder("Type a message...")).toBeVisible();

    // Stage a file directly on the hidden file input (no need to click the
    // visible attach button first).
    await authenticatedPage.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from(PNG_1X1_BASE64, "base64"),
    });

    // Composer coexistence: caption/text field is typed alongside the staged
    // attachment (this used to be impossible — staging a file hid the field).
    // The placeholder switches to the caption prompt once a file is staged.
    await authenticatedPage
      .getByPlaceholder("Add a caption…")
      .fill("A lovely caption");
    await authenticatedPage.getByRole("button", { name: "Send" }).click();

    // MSW echoes the caption + an ImageResource back on the media branch;
    // assert the rendered message shows both the image and the caption.
    await expect(authenticatedPage.getByAltText("photo.png")).toBeVisible();
    await expect(authenticatedPage.getByText("A lovely caption")).toBeVisible();
  });

  test("loading older same-day history preserves scroll position (no visual jump)", async ({
    authenticatedPage,
    msw,
  }) => {
    // All messages share the same America/New_York calendar day — this is
    // exactly the scenario the prepend-restore blocker fix targets: day
    // separators render INSIDE the first item of a day rather than as a
    // standalone child, so a same-day prepend still moves the previous
    // first item to index > 0 and the primitive's scroll-restore fires.
    const initialCount = 40;
    const initialMessages = Array.from({ length: initialCount }, (_, i) => {
      const createdDate = new Date(
        Date.parse("2025-06-10T14:00:00Z") + i * 2 * 60 * 1000,
      ).toISOString();
      return mockTextMessage({
        id: `msg-${i}`,
        createdDate,
        content: `Message number ${i}`,
        user: CHAT_OTHER_USER,
      });
    });

    const olderCount = 10;
    const olderMessages = Array.from({ length: olderCount }, (_, i) => {
      const createdDate = new Date(
        Date.parse("2025-06-10T12:00:00Z") + i * 2 * 60 * 1000,
      ).toISOString();
      return mockTextMessage({
        id: `msg-old-${i}`,
        createdDate,
        content: `Older message number ${i}`,
        user: CHAT_OTHER_USER,
      });
    });

    const room = mockChatRoomDetail({
      id: "room-scroll-preserve",
      chatMessages: {
        edges: initialMessages.map((node) => ({ cursor: node.id, node })),
        pageInfo: { hasPreviousPage: true, startCursor: "msg-0" },
      },
    });
    const roomListEntry = mockChatRoomListNode({ id: "room-scroll-preserve" });

    msw.use(
      mockChatConversationHandler({
        roomListEntry,
        room,
        olderMessages: {
          cursor: "msg-0",
          chatMessages: {
            edges: olderMessages.map((node) => ({ cursor: node.id, node })),
            pageInfo: { hasPreviousPage: false, startCursor: null },
          },
        },
      }),
    );

    // Hold the older-page response until the test has captured its
    // pre-prepend baseline — a fast round-trip can otherwise prepend before
    // the baseline is measured (observed on WebKit in CI). Registered AFTER
    // the factory so it runs FIRST (the msw fixture unshifts handlers): it
    // awaits the gate for the older-page request only, then returns
    // undefined so the request falls through to the factory handler above
    // (documented MSW fall-through; awaited resolvers delay the chain).
    const olderPageGate = Promise.withResolvers<void>();
    msw.use(
      http.post("*/graphql", async ({ request }) => {
        // clone(): the factory handler reads this same Request body next.
        const body = (await request.clone().json()) as { query: string };
        if (body.query.includes('before: "msg-0"')) {
          await olderPageGate.promise;
        }
        return undefined;
      }),
    );

    await authenticatedPage.goto("/en/chat?room=room-scroll-preserve");

    // Wait for the thread to render and auto-scroll to the bottom.
    await expect(authenticatedPage.getByText("Message number 39")).toBeVisible();

    const viewport = authenticatedPage.locator(
      '[data-slot="message-scroller-viewport"]',
    );
    await expect(viewport).toBeVisible();

    // The primitive publishes its measured scrollable-edge state as a
    // `data-scrollable` attribute ("start"/"end"/both). Wait for "start" to
    // appear before jumping to the top — the load-older trigger fires on a
    // true→false transition, so it must have observed "true" (more to
    // scroll toward the start) at least once first.
    await expect(viewport).toHaveAttribute("data-scrollable", /start/);

    // Scroll to the top with a trusted KEYBOARD gesture, not a wheel or a
    // raw `scrollTop` write. The viewport is a focusable region
    // (tabIndex=0) and the primitive's own onKeyDown handler counts Home as
    // user scroll intent — releasing follow-bottom mode before the engine's
    // native jump to top. Wheel gestures are engine-dependent here:
    // Firefox's synthesized wheels never reach the React onWheel handler,
    // so follow-bottom keeps re-pinning and fights the scroll (observed in
    // CI as the viewport stranded mid-scroll with data-autoscrolling set).
    await viewport.focus();
    await expect(async () => {
      await authenticatedPage.keyboard.press("Home");
      expect(
        await viewport.evaluate((el) => el.scrollTop),
      ).toBeLessThanOrEqual(100);
    }).toPass({ timeout: 10_000 });

    // Wait for the primitive to register that the top edge is now
    // unreachable — this confirms its scroll-event handling (mode update +
    // anchor re-capture) has actually run before we measure "before".
    await expect(viewport).not.toHaveAttribute("data-scrollable", /start/);

    // Capture the pre-prepend "distance from bottom" (scrollHeight -
    // scrollTop). This is the correct invariant for "no visual jump": if the
    // scroll-restore anchors correctly, scrollTop grows by exactly the
    // height of the prepended content, keeping (scrollHeight - scrollTop)
    // constant. A literal raw scrollTop equality would NOT hold here
    // (scrollTop necessarily moves off zero once older content is
    // prepended above it).
    // Atomic capture: read the measurement AND whether the older batch has
    // already prepended in a single evaluate. If the prepend won the race
    // (fast MSW round-trip vs. Playwright's attribute polling), `before`
    // would be measured post-prepend and the zero-delta assertion would
    // pass while measuring nothing — fail loudly instead so the race is
    // visible as a flake, never as a silent hole.
    const snapshot = await viewport.evaluate((el) => ({
      before: el.scrollHeight - el.scrollTop,
      olderAlreadyRendered: Array.from(
        el.querySelectorAll('[data-slot="message-scroller-item"]'),
      ).some((item) => item.textContent?.includes("Older message number 9")),
    }));
    expect(snapshot.olderAlreadyRendered).toBe(false);
    const before = snapshot.before;

    // Baseline captured — release the held older-page response.
    olderPageGate.resolve();

    // Wait for the older batch to actually prepend.
    await expect(
      authenticatedPage.getByText("Older message number 9"),
    ).toBeVisible();

    // One-shot, NOT polled. The primitive commits its scroll-restore in the
    // MutationObserver callback, so it has already run by the time the
    // prepended text is observable — and once the items render at their real
    // height (rather than a `content-visibility` placeholder that resizes
    // afterwards), the value is stable, not converging. Measured drift is
    // ~35px on all three engines. Polling here would hide exactly the
    // regression this test exists to catch, so keep the read immediate.
    const after = await viewport.evaluate(
      (el) => el.scrollHeight - el.scrollTop,
    );
    expect(Math.abs(after - before)).toBeLessThanOrEqual(100);
  });
});
