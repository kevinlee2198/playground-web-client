import { test, expect, withMeGuard } from "../fixtures/test-fixtures";
import {
  CHAT_OTHER_USER,
  mockChatConversationHandler,
  mockChatRoomDetail,
  mockChatRoomListNode,
  mockEmptyChatRoomsResponse,
  mockTextMessage,
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

// A minimal valid 1x1 transparent PNG, used to stage a real file through the
// composer's hidden file input without touching disk.
const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

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
    const daySeparators = authenticatedPage.getByTestId("day-separator");
    await expect(daySeparators).toHaveCount(2);

    const expectedOlderLabel = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(new Date(olderTimestamp));
    await expect(daySeparators.nth(0)).toContainText(expectedOlderLabel);
    await expect(daySeparators.nth(1)).toHaveText("Today");

    // The day separator must not be selectable/actionable, and sending a
    // new message afterward must still work (the boundary doesn't break the
    // room's send flow).
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

    // Scroll to the top (a real, trusted wheel gesture — not just a raw
    // `scrollTop` property write — so the primitive's native `scroll`
    // listener updates its internal anchor-tracking the same way it would
    // for a real user).
    await viewport.hover();
    await authenticatedPage.mouse.wheel(0, -100000);

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
    const before = await viewport.evaluate(
      (el) => el.scrollHeight - el.scrollTop,
    );

    // Wait for the older batch to actually prepend.
    await expect(
      authenticatedPage.getByText("Older message number 9"),
    ).toBeVisible();

    const after = await viewport.evaluate(
      (el) => el.scrollHeight - el.scrollTop,
    );

    // A small tolerance (not exact equality) absorbs benign noise from
    // `content-visibility: auto` on off-screen MessageScrollerItems: their
    // `contain-intrinsic-size` placeholder height vs. real rendered height
    // can shift by a few pixels as different items cross the viewport
    // boundary during the prepend. A real scroll-jump regression (the
    // BLOCKER this test targets) would move this value by roughly the
    // height of the entire prepended batch (hundreds of pixels), so this
    // tolerance stays far tighter than any real regression while not being
    // flaky over rendering noise.
    expect(Math.abs(after - before)).toBeLessThanOrEqual(100);
  });
});
