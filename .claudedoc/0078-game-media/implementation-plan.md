# Game Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing photo/video upload gallery into a unified content hub supporting direct uploads, external video embeds, livestreams, and rich link previews.

**Architecture:** Replace `Resource`-based gallery with a `GameMedia` GraphQL interface using four concrete types (`ImageMedia`, `VideoMedia`, `LivestreamMedia`, `LinkMedia`) discriminated by `__typename`. Add a two-phase "Add Link" flow (resolve URL -> preview -> confirm), embedded video players with click-to-play, and a pinned live stream section. All gallery components remain client components; the page remains a server component for initial data fetch.

**Tech Stack:** Next.js 16 (App Router), TypeScript strict, React 19 (useTransition), shadcn/ui, Tailwind CSS v4, json-to-graphql-query, next-intl, TanStack Form, Zod v4, Sonner toasts

**Spec:** `.claudedoc/0078-game-media/design.md`
**Backend schema:** `/home/kevinlee/workspace/playground/playground-backend/.claudedoc/0075-game-media/game-media-schema.graphqls`

---

## File Structure

### New files

| File | Responsibility |
|---|---|
| `src/lib/types/game-media.ts` | TypeScript types: `GameMediaNode` discriminated union, `ResolveUrlPreview`, action result types, enums |
| `src/lib/embed-config.ts` | `TRUSTED_EMBED_DOMAINS` allowlist and `isEmbeddable()` function |
| `src/components/game/game-media-section.tsx` | Top-level orchestrator: live section + gallery + controls |
| `src/components/game/live-stream-section.tsx` | Pinned live stream with auto-loading embed player |
| `src/components/game/embed-player.tsx` | Sandboxed iframe with click-to-play, privacy disclosure, TikTok aspect ratio |
| `src/components/game/link-card-media-item.tsx` | Rich preview card for `LinkMedia` |
| `src/components/game/add-link-dialog.tsx` | Two-phase add link dialog with rate limit countdown |
| `src/app/[locale]/game/media-actions.ts` | Server actions: `resolveUrl`, `addGameMediaLink`, `deleteGameMedia` |

### Modified files

| File | Changes |
|---|---|
| `src/lib/graphql-fragments.ts` | Add `gameMediaFragment` with `__typename` + inline fragments |
| `src/lib/types/game.ts` | Update `GameDetail.media` type from `Resource` to `GameMediaNode` |
| `src/app/[locale]/game/[id]/page.tsx` | Update media query, `canContribute` logic, pass `currentUserId`/`gameVisibility` |
| `src/components/game/live/game-detail-client.tsx` | Replace `GameMediaGallery` with `GameMediaSection`, thread new props |
| `src/components/game/game-media-gallery.tsx` | Refactor from `Resource` to `GameMediaNode`, filter livestream from count, "Add Link" button |
| `src/components/game/game-media-item.tsx` | Dispatch to type-specific renderers based on `__typename` |
| `src/components/game/game-media-upload-placeholder.tsx` | Receive `GameMediaNode` on confirm |
| `src/components/game/delete-media-dialog.tsx` | Use `deleteGameMedia`, handle auth errors |
| `src/app/[locale]/upload/actions.ts` | Handle `ConfirmGameMediaUploadResponse`, discriminated union result type |
| `src/app/[locale]/game/actions.ts` | Update `loadGameMedia` to return `GameMediaNode[]` |
| `messages/en.json` | New i18n keys for add link, errors, accessibility |
| `next.config.ts` | Add `headers()` with CSP `frame-src` directive |

---

## Task 1: Types and embed config (foundation)

**Files:**
- Create: `src/lib/types/game-media.ts`
- Create: `src/lib/embed-config.ts`
- Test: `__tests__/lib/embed-config.test.ts`

- [ ] **Step 1: Write failing tests for `isEmbeddable()`**

```ts
// __tests__/lib/embed-config.test.ts
import { describe, it, expect } from "vitest";
import { isEmbeddable, TRUSTED_EMBED_DOMAINS } from "@/lib/embed-config";

describe("isEmbeddable", () => {
  it("returns true for trusted YouTube domain", () => {
    expect(isEmbeddable("https://www.youtube-nocookie.com/embed/abc")).toBe(true);
  });

  it("returns true for trusted Vimeo domain", () => {
    expect(isEmbeddable("https://player.vimeo.com/video/123")).toBe(true);
  });

  it("returns true for trusted Twitch domain", () => {
    expect(isEmbeddable("https://player.twitch.tv/?channel=test")).toBe(true);
  });

  it("returns true for trusted TikTok domain", () => {
    expect(isEmbeddable("https://www.tiktok.com/embed/v2/123")).toBe(true);
  });

  it("returns true for trusted Instagram domain", () => {
    expect(isEmbeddable("https://www.instagram.com/p/abc/embed")).toBe(true);
  });

  it("returns false for untrusted domain", () => {
    expect(isEmbeddable("https://evil.com/embed")).toBe(false);
  });

  it("returns false for youtube.com (wrong subdomain)", () => {
    expect(isEmbeddable("https://youtube.com/embed/abc")).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(isEmbeddable("not-a-url")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isEmbeddable("")).toBe(false);
  });

  it("has exactly 5 trusted domains", () => {
    expect(TRUSTED_EMBED_DOMAINS).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/lib/embed-config.test.ts 2>&1 | tee /tmp/embed-test.txt`
Expected: FAIL -- module not found

- [ ] **Step 3: Create game media types**

```ts
// src/lib/types/game-media.ts

export type MediaType = "IMAGE" | "VIDEO" | "LIVESTREAM" | "LINK";

export type MediaSource =
  | "UPLOAD"
  | "YOUTUBE"
  | "TWITCH"
  | "HUDL"
  | "VIMEO"
  | "TIKTOK"
  | "INSTAGRAM"
  | "CUSTOM_URL";

export type UrlResolutionErrorCode =
  | "INVALID_SCHEME"
  | "SSRF_BLOCKED"
  | "TIMEOUT"
  | "UNREACHABLE"
  | "UNSUPPORTED_FORMAT";

interface GameMediaBase {
  id: string;
  source: MediaSource;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  addedBy: {
    id: string;
    displayName: string;
    username: string;
  };
  createdAt: string;
  updatedAt: string | null;
}

export interface ImageMediaNode extends GameMediaBase {
  __typename: "ImageMedia";
}

export interface VideoMediaNode extends GameMediaBase {
  __typename: "VideoMedia";
  description: string | null;
  embedUrl: string | null;
  embedWidth: number | null;
  embedHeight: number | null;
}

export interface LivestreamMediaNode extends GameMediaBase {
  __typename: "LivestreamMedia";
  description: string | null;
  embedUrl: string;
  embedWidth: number | null;
  embedHeight: number | null;
}

export interface LinkMediaNode extends GameMediaBase {
  __typename: "LinkMedia";
  description: string | null;
}

export type GameMediaNode =
  | ImageMediaNode
  | VideoMediaNode
  | LivestreamMediaNode
  | LinkMediaNode;

export interface ResolveUrlPreview {
  type: MediaType;
  source: MediaSource;
  resolvedUrl: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  embedUrl: string | null;
  embedWidth: number | null;
  embedHeight: number | null;
}

export interface ResolveUrlActionResult {
  success: boolean;
  data?: ResolveUrlPreview;
  errorType?: string;
  errorCode?: UrlResolutionErrorCode;
  message?: string;
  existingGameMediaId?: string;
  retryAfterSeconds?: number;
}

export interface AddGameMediaLinkActionResult {
  success: boolean;
  gameMedia?: GameMediaNode;
  errorType?: string;
  message?: string;
  existingGameMediaId?: string;
  retryAfterSeconds?: number;
}

export interface DeleteGameMediaActionResult {
  success: boolean;
  errorType?: string;
  message?: string;
}
```

- [ ] **Step 4: Create embed config**

```ts
// src/lib/embed-config.ts

export const TRUSTED_EMBED_DOMAINS = [
  "www.youtube-nocookie.com",
  "player.vimeo.com",
  "www.tiktok.com",
  "player.twitch.tv",
  "www.instagram.com",
] as const;

export function isEmbeddable(embedUrl: string): boolean {
  try {
    const url = new URL(embedUrl);
    return (TRUSTED_EMBED_DOMAINS as readonly string[]).includes(url.hostname);
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- __tests__/lib/embed-config.test.ts 2>&1 | tee /tmp/embed-test.txt`
Expected: All 10 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/types/game-media.ts src/lib/embed-config.ts __tests__/lib/embed-config.test.ts
git commit -m "feat(game-media): add GameMedia types and embed domain allowlist"
```

---

## Task 2: GraphQL fragment and i18n keys

**Files:**
- Modify: `src/lib/graphql-fragments.ts`
- Modify: `messages/en.json`

- [ ] **Step 1: Add `gameMediaFragment` to graphql-fragments.ts**

Add after the existing `resourceFragment` (around line 51):

```ts
export const gameMediaFragment = {
  __typename: true,
  id: true,
  source: true,
  url: true,
  thumbnailUrl: true,
  title: true,
  addedBy: {
    id: true,
    displayName: true,
    username: true,
  },
  createdAt: true,
  updatedAt: true,
  __on: [
    {
      __typeName: "VideoMedia",
      description: true,
      embedUrl: true,
      embedWidth: true,
      embedHeight: true,
    },
    {
      __typeName: "LivestreamMedia",
      description: true,
      embedUrl: true,
      embedWidth: true,
      embedHeight: true,
    },
    {
      __typeName: "LinkMedia",
      description: true,
    },
  ],
};
```

- [ ] **Step 2: Add i18n keys to `messages/en.json`**

**Merge** the new keys into the existing `game.media` section. Keep existing keys that may still be referenced until their consumers are updated in later tasks. Key additions:
- `emptyTitle`, `playVideo`, `opensInNewTab`, `privacyDisclosure`, `authRequiredNote`, `rateLimitCleared`
- `addLinkDialog.*` (title, urlLabel, urlPlaceholder, invalidUrl, resolve, resolving, confirm, adding, cancel, previewTitle, rateLimitCountdown)
- `delete.noPermission`
- `errors.duplicateLink`, `errors.invalidScheme`, `errors.urlCannotBeAccessed`, `errors.urlTimeout`, `errors.urlUnreachable`, `errors.unsupportedFormat`, `errors.rateLimited`, `errors.gameNotFound`, `errors.gameNotInProgress`

- [ ] **Step 3: Verify build passes**

Run: `npm run build 2>&1 | tee /tmp/build.txt`
Expected: Build succeeds (fragment is just an export, i18n keys are additive)

- [ ] **Step 4: Commit**

```bash
git add src/lib/graphql-fragments.ts messages/en.json
git commit -m "feat(game-media): add gameMediaFragment and i18n keys"
```

---

## Task 3: Server actions (resolveUrl, addGameMediaLink, deleteGameMedia)

**Files:**
- Create: `src/app/[locale]/game/media-actions.ts`
- Modify: `src/app/[locale]/upload/actions.ts`
- Modify: `src/app/[locale]/game/actions.ts`

- [ ] **Step 1: Create `media-actions.ts`**

This file contains three server actions. Follow the existing pattern from `src/app/[locale]/game/actions.ts` for `authQuery`/`authMutate` usage and error extraction.

```ts
// src/app/[locale]/game/media-actions.ts
"use server";

import { authMutate, authQuery } from "@/lib/graphql-request";
import { gameMediaFragment, errorFragment } from "@/lib/graphql-fragments";
import type {
  ResolveUrlActionResult,
  AddGameMediaLinkActionResult,
  DeleteGameMediaActionResult,
} from "@/lib/types/game-media";

// resolveUrl is a GraphQL Query but must be called as a server action because
// it is triggered interactively from the AddLinkDialog client component.
// The result should not be cached.
export async function resolveUrl(
  url: string,
  gameId: number,
): Promise<ResolveUrlActionResult> {
  const response = await authQuery({
    resolveUrl: {
      __args: { input: { url, gameId } },
      __typename: true,
      __on: [
        {
          __typeName: "ResolveUrlResponse",
          type: true,
          source: true,
          resolvedUrl: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          embedUrl: true,
          embedWidth: true,
          embedHeight: true,
        },
        { __typeName: "GameNotFoundError", message: true },
        {
          __typeName: "DuplicateMediaError",
          message: true,
          existingGameMediaId: true,
        },
        {
          __typeName: "UrlResolutionError",
          message: true,
          errorCode: true,
        },
        { __typeName: "RateLimitedError", message: true, retryAfterSeconds: true },
        { __typeName: "GameNotInProgressError", message: true },
      ],
    },
  });

  if (response.errors) {
    return { success: false, message: response.errors[0].message };
  }

  const raw = response.data.resolveUrl;

  if (raw.__typename === "ResolveUrlResponse") {
    return {
      success: true,
      data: {
        type: raw.type,
        source: raw.source,
        resolvedUrl: raw.resolvedUrl,
        title: raw.title,
        description: raw.description,
        thumbnailUrl: raw.thumbnailUrl,
        embedUrl: raw.embedUrl,
        embedWidth: raw.embedWidth,
        embedHeight: raw.embedHeight,
      },
    };
  }

  if (raw.__typename === "RateLimitedError") {
    return {
      success: false,
      errorType: "RateLimitedError",
      message: raw.message,
      retryAfterSeconds: raw.retryAfterSeconds,
    };
  }

  if (raw.__typename === "DuplicateMediaError") {
    return {
      success: false,
      errorType: "DuplicateMediaError",
      message: raw.message,
      existingGameMediaId: raw.existingGameMediaId,
    };
  }

  if (raw.__typename === "UrlResolutionError") {
    return {
      success: false,
      errorType: "UrlResolutionError",
      errorCode: raw.errorCode,
      message: raw.message,
    };
  }

  return { success: false, errorType: raw.__typename, message: raw.message };
}

export async function addGameMediaLink(
  url: string,
  gameId: number,
): Promise<AddGameMediaLinkActionResult> {
  const response = await authMutate({
    addGameMediaLink: {
      __args: { input: { gameId, url } },
      __typename: true,
      __on: [
        { __typeName: "AddGameMediaLinkResponse", gameMedia: gameMediaFragment },
        { __typeName: "DuplicateMediaError", message: true, existingGameMediaId: true },
        { __typeName: "RateLimitedError", message: true, retryAfterSeconds: true },
        { __typeName: "GameNotFoundError", message: true },
        { __typeName: "GameNotInProgressError", message: true },
        { __typeName: "UrlResolutionError", message: true, errorCode: true },
        errorFragment,
      ],
    },
  });

  if (response.errors) {
    return { success: false, message: response.errors[0].message };
  }

  const raw = response.data.addGameMediaLink;

  if (raw.__typename === "AddGameMediaLinkResponse") {
    return { success: true, gameMedia: raw.gameMedia };
  }

  if (raw.__typename === "RateLimitedError") {
    return {
      success: false,
      errorType: "RateLimitedError",
      message: raw.message,
      retryAfterSeconds: raw.retryAfterSeconds,
    };
  }

  if (raw.__typename === "DuplicateMediaError") {
    return {
      success: false,
      errorType: "DuplicateMediaError",
      message: raw.message,
      existingGameMediaId: raw.existingGameMediaId,
    };
  }

  if (raw.__typename === "UrlResolutionError") {
    return {
      success: false,
      errorType: "UrlResolutionError",
      message: raw.message,
    };
  }

  return { success: false, errorType: raw.__typename, message: raw.message };
}

export async function deleteGameMedia(
  id: string,
): Promise<DeleteGameMediaActionResult> {
  const response = await authMutate({
    deleteGameMedia: {
      __args: { input: { id } },
      __typename: true,
      __on: [
        { __typeName: "DeleteGameMediaResponse", id: true },
        { __typeName: "GameMediaNotFoundError", message: true },
        errorFragment,
      ],
    },
  });

  if (response.errors) {
    return { success: false, message: response.errors[0].message };
  }

  const raw = response.data.deleteGameMedia;

  if (raw.__typename === "DeleteGameMediaResponse") {
    return { success: true };
  }

  return { success: false, errorType: raw.__typename, message: raw.message };
}
```

- [ ] **Step 2: Update `confirmUpload` in `upload/actions.ts`**

Update the `ConfirmUploadResult` type to a discriminated union and handle `ConfirmGameMediaUploadResponse`:

1. Import `gameMediaFragment` from `@/lib/graphql-fragments` and `GameMediaNode` from `@/lib/types/game-media`
2. Change the result type:
   ```ts
   export type ConfirmUploadResult =
     | { success: true; kind: "resource"; resource: Resource }
     | { success: true; kind: "gameMedia"; gameMedia: GameMediaNode }
     | { success: false; errorType: string; message: string };
   ```
3. Add `ConfirmGameMediaUploadResponse` to the `__on` array in the mutation
4. Handle the new response type in the return logic

- [ ] **Step 3: Update `profile-avatar.tsx` for new ConfirmUploadResult**

`src/components/profile/profile-avatar.tsx` also calls `confirmUpload()` (around line 117-134). Update it to handle the discriminated union:
```ts
if (!confirmResult.success) { /* handle error */ return; }
if (confirmResult.kind !== "resource") { /* unexpected kind */ return; }
setProfilePicture(confirmResult.resource);
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build 2>&1 | tee /tmp/build.txt`
Expected: Build succeeds

**Note:** `loadGameMedia` return type is NOT changed here — it stays as `Edge<Resource>[]` to keep the existing `GameMediaGallery` consumer working. The return type will be changed atomically with the gallery refactor in Task 11.

- [ ] **Step 5: Commit**

```bash
git add src/app/[locale]/game/media-actions.ts src/app/[locale]/upload/actions.ts src/components/profile/profile-avatar.tsx
git commit -m "feat(game-media): add media server actions, update confirmUpload discriminated union"
```

---

## Task 4: Update GameDetail type, game page query, and GameDetailClient props

**Files:**
- Modify: `src/lib/types/game.ts`
- Modify: `src/app/[locale]/game/[id]/page.tsx`
- Modify: `src/components/game/live/game-detail-client.tsx`

- [ ] **Step 1: Update `GameDetail.media` type in `game.ts`**

Change the `media` field from `Edge<Resource>` to `Edge<GameMediaNode>`:

```ts
// In GameDetail interface
media: {
  edges: Edge<GameMediaNode>[];
  pageInfo: PageInfo;
};
```

Import `GameMediaNode` from `@/lib/types/game-media`.

- [ ] **Step 2: Update page.tsx -- media query**

Replace `resourceFragment` with `gameMediaFragment` in the game query:

```ts
media: {
  __args: { first: 12 },
  edges: {
    cursor: true,
    node: gameMediaFragment,
  },
  pageInfo: { hasNextPage: true, endCursor: true },
},
```

Import `gameMediaFragment` from `@/lib/graphql-fragments`.

- [ ] **Step 3: Update page.tsx -- unauthenticated access for PUBLIC games**

The current page redirects ALL unauthenticated users. Update to allow unauthenticated access for PUBLIC games:

1. First fetch the game with `query()` (unauthenticated) to get `visibility`
2. If unauthenticated AND `visibility !== "PUBLIC"`, redirect to `/`
3. If unauthenticated AND `visibility === "PUBLIC"`, render read-only (skip `meResponse` query)
4. Set `currentUserId = null`, `playerId = null`, `canContribute = false`, `isParticipant = false`
5. Use `query()` instead of `authQuery()` for the media connection when unauthenticated

- [ ] **Step 4: Update page.tsx -- pass `currentUserId` to GameDetailClient**

For authenticated users, pass `currentUserId`. Keep `canUpload` as before (backward-compatible):

```tsx
<GameDetailClient
  game={game}
  // ... existing sport stats props ...
  playerId={playerId ?? 0}
  currentUserId={currentUserId}
  canUpload={canContribute}
>
```

Where `canContribute` replaces the old `canUpload` computation:
```ts
const canContribute =
  (isParticipant || game.viewerGameRole != null) &&
  (game.gameStatus === GameStatus.IN_PROGRESS ||
    game.gameStatus === GameStatus.COMPLETE);
```

- [ ] **Step 5: Update GameDetailClientProps -- add `currentUserId`**

Add `currentUserId: string | null` to the `GameDetailClientProps` interface. Keep all existing props to avoid breaking anything:

```ts
interface GameDetailClientProps {
  // ... all existing props ...
  currentUserId: string | null;  // NEW -- Keycloak user ID, null for unauthenticated
}
```

Do NOT pass `isParticipant` as a prop -- `GameDetailClient` already computes it live from `state.game.participants.edges` via the WebSocket reducer, keeping it reactive to live events. `canContribute` will also be computed live inside `GameDetailClient` in Task 12.

- [ ] **Step 6: Verify build passes**

Run: `npm run build 2>&1 | tee /tmp/build.txt`
Expected: Build succeeds (all props are backward-compatible)

- [ ] **Step 7: Commit**

```bash
git add src/lib/types/game.ts src/app/[locale]/game/[id]/page.tsx src/components/game/live/game-detail-client.tsx
git commit -m "feat(game-media): update GameDetail type, page query, and public game access"
```

---

## Task 5: EmbedPlayer component

**Files:**
- Create: `src/components/game/embed-player.tsx`
- Test: `__tests__/components/game/embed-player.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/game/embed-player.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/../../messages/en.json";
import { EmbedPlayer } from "@/components/game/embed-player";

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("EmbedPlayer", () => {
  it("shows thumbnail with play button when autoLoad is false", () => {
    renderWithIntl(
      <EmbedPlayer
        embedUrl="https://www.youtube-nocookie.com/embed/abc"
        thumbnailUrl="https://img.youtube.com/vi/abc/0.jpg"
        title="Test Video"
        source="YOUTUBE"
        autoLoad={false}
        gameVisibility="PUBLIC"
      />,
    );
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
    expect(screen.queryByTitle("Test Video")).not.toBeInTheDocument();
  });

  it("loads iframe when play button is clicked", () => {
    renderWithIntl(
      <EmbedPlayer
        embedUrl="https://www.youtube-nocookie.com/embed/abc"
        thumbnailUrl="https://img.youtube.com/vi/abc/0.jpg"
        title="Test Video"
        source="YOUTUBE"
        autoLoad={false}
        gameVisibility="PUBLIC"
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(screen.getByTitle("Test Video")).toBeInTheDocument();
  });

  it("auto-loads iframe when autoLoad is true", () => {
    renderWithIntl(
      <EmbedPlayer
        embedUrl="https://www.youtube-nocookie.com/embed/abc"
        thumbnailUrl={null}
        title="Live Stream"
        source="YOUTUBE"
        autoLoad={true}
        gameVisibility="PUBLIC"
      />,
    );
    expect(screen.getByTitle("Live Stream")).toBeInTheDocument();
  });

  it("shows privacy disclosure for PRIVATE games", () => {
    renderWithIntl(
      <EmbedPlayer
        embedUrl="https://www.youtube-nocookie.com/embed/abc"
        thumbnailUrl="https://img.youtube.com/vi/abc/0.jpg"
        title="Test Video"
        source="YOUTUBE"
        autoLoad={false}
        gameVisibility="PRIVATE"
      />,
    );
    expect(screen.getByText(/share data with/i)).toBeInTheDocument();
  });

  it("does not show privacy disclosure for PUBLIC games", () => {
    renderWithIntl(
      <EmbedPlayer
        embedUrl="https://www.youtube-nocookie.com/embed/abc"
        thumbnailUrl="https://img.youtube.com/vi/abc/0.jpg"
        title="Test Video"
        source="YOUTUBE"
        autoLoad={false}
        gameVisibility="PUBLIC"
      />,
    );
    expect(screen.queryByText(/share data with/i)).not.toBeInTheDocument();
  });

  it("uses portrait aspect ratio for TikTok", () => {
    renderWithIntl(
      <EmbedPlayer
        embedUrl="https://www.tiktok.com/embed/v2/123"
        thumbnailUrl={null}
        title="TikTok Video"
        source="TIKTOK"
        autoLoad={true}
        gameVisibility="PUBLIC"
      />,
    );
    const iframe = screen.getByTitle("TikTok Video");
    expect(iframe.className).toContain("aspect-[9/16]");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/components/game/embed-player.test.tsx 2>&1 | tee /tmp/embed-player-test.txt`
Expected: FAIL -- module not found

- [ ] **Step 3: Implement EmbedPlayer**

Create `src/components/game/embed-player.tsx`. Key implementation details:
- Props: `embedUrl`, `thumbnailUrl`, `title`, `source`, `autoLoad`, `gameVisibility`
- State: `isPlaying` (boolean, default = `autoLoad`)
- Click-to-play: button with `aria-label={t("media.playVideo", { title })}` and Play icon overlay
- Privacy disclosure: `aria-describedby` linking to `<p id={...}>` with `t("media.privacyDisclosure", { provider })`
- Iframe: `sandbox="allow-scripts allow-same-origin"`, `loading="lazy"`, `referrerPolicy="no-referrer"`
- TikTok: `aspect-[9/16] max-w-sm mx-auto` instead of `aspect-video`
- Fade transition: `motion-safe:duration-300` opacity transition between thumbnail and iframe
- Comment on sandbox explaining security implications
- Privacy disclosure shows when `gameVisibility !== "PUBLIC"` (i.e., both PRIVATE and PROTECTED games show the disclosure)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- __tests__/components/game/embed-player.test.tsx 2>&1 | tee /tmp/embed-player-test.txt`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/game/embed-player.tsx __tests__/components/game/embed-player.test.tsx
git commit -m "feat(game-media): add EmbedPlayer with click-to-play and privacy disclosure"
```

---

## Task 6: LinkCardMediaItem component

**Files:**
- Create: `src/components/game/link-card-media-item.tsx`
- Test: `__tests__/components/game/link-card-media-item.test.tsx`

- [ ] **Step 1: Write failing tests**

Test that `LinkCardMediaItem` renders thumbnail, title, description, opens URL in new tab, and shows "(opens in new tab)" for screen readers.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- __tests__/components/game/link-card-media-item.test.tsx 2>&1 | tee /tmp/link-card-test.txt`

- [ ] **Step 3: Implement LinkCardMediaItem**

Create `src/components/game/link-card-media-item.tsx`:
- Props: `media: LinkMediaNode`, `onDelete`, `canDelete`
- Renders as a card in the grid with the same aspect ratio as other items
- Thumbnail image at top (or `bg-muted` placeholder if null)
- Title (truncated) and description (`line-clamp-2`) below
- Entire card is a link: `<a href={media.url} target="_blank" rel="noopener noreferrer">`
- sr-only text: `t("media.opensInNewTab")`
- Delete button overlay matching existing pattern
- Use `TypographySmall` for text elements

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/game/link-card-media-item.tsx __tests__/components/game/link-card-media-item.test.tsx
git commit -m "feat(game-media): add LinkCardMediaItem for rich link preview cards"
```

---

## Task 7: LiveStreamSection component

**Files:**
- Create: `src/components/game/live-stream-section.tsx`
- Test: `__tests__/components/game/live-stream-section.test.tsx`

- [ ] **Step 1: Write failing tests**

Test that:
- It renders the embed player with `autoLoad={true}` when given a `LivestreamMediaNode`
- It shows the BreathingDot + LIVE badge
- The title and "Added by @username" are displayed
- It has `max-w-3xl mx-auto` for width constraint
- Screen reader text includes "Currently" before "LIVE"

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement LiveStreamSection**

Create `src/components/game/live-stream-section.tsx`:
- Props: `media: LivestreamMediaNode`, `gameVisibility: GameVisibility`
- Uses `BreathingDot` (existing) in the LIVE badge -- NOT `animate-pulse`
- `<Badge variant="destructive">` with `<BreathingDot />` and sr-only "Currently " prefix
- `EmbedPlayer` with `autoLoad={true}`
- `max-w-3xl mx-auto` container
- Title uses `TypographyH4`, "Added by" uses `TypographyMuted`

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/game/live-stream-section.tsx __tests__/components/game/live-stream-section.test.tsx
git commit -m "feat(game-media): add LiveStreamSection with BreathingDot and auto-loading embed"
```

---

## Task 8: AddLinkDialog component

**Files:**
- Create: `src/components/game/add-link-dialog.tsx`
- Test: `__tests__/components/game/add-link-dialog.test.tsx`

- [ ] **Step 1: Write failing tests**

Test the key flows:
- URL input validation (Zod -- empty, invalid URL)
- Resolve button triggers `resolveUrl` server action
- Preview renders on success
- Confirm button triggers `addGameMediaLink` server action
- Dialog resets state on close
- Rate limit countdown displays and counts down
- Error messages displayed inline for URL errors
- Toast for Phase 2 errors (`UrlResolutionError`, `DuplicateMediaError`)
- Phase 2 "Add" button shows spinner when pending
- sr-only rate limit announcements

Mock the server actions using `vi.mock()`.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement AddLinkDialog**

Create `src/components/game/add-link-dialog.tsx`:
- Props: `gameId: number`, `open: boolean`, `onOpenChange`, `onMediaAdded: (media: GameMediaNode) => void`
- Uses `Dialog`/`DialogContent`/`DialogHeader`/`DialogTitle` from shadcn/ui
- `DialogContent className="max-w-md"` per existing pattern
- URL input with TanStack Form + Zod validation (see design doc for form setup)
- Phase 1: `handleResolve` -> `resolveUrl` server action -> set preview or error
- Phase 2: `handleConfirm` -> `addGameMediaLink` server action -> `onMediaAdded` + close + toast
- `LinkPreviewCard` sub-section: thumbnail, title, description, type/source badges
- Auth-required note for HUDL source: `t("media.authRequiredNote", { provider: "Hudl" })`
- Rate limit countdown: `setTimeout` approach (NOT `setInterval`), `rateLimitCountdown` in dependency array
- sr-only `aria-live="assertive"` region for rate limit start/end announcements
- State reset on dialog close (`handleOpenChange`)
- Clear preview on `DuplicateMediaError`
- Phase 2 errors: `UrlResolutionError` -> toast, `DuplicateMediaError` -> toast, `RateLimitedError` -> countdown
- Focus management: focus moves to "Add" button after preview renders

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/game/add-link-dialog.tsx __tests__/components/game/add-link-dialog.test.tsx
git commit -m "feat(game-media): add AddLinkDialog with two-phase resolve/confirm flow"
```

---

## Task 9: Refactor GameMediaItem for type dispatch

**Files:**
- Modify: `src/components/game/game-media-item.tsx`
- Test: `__tests__/components/game/game-media-item.test.tsx`

- [ ] **Step 1: Write/update tests**

Test that `GameMediaItem` renders the correct sub-component for each `__typename`:
- `ImageMedia` -> image with thumbnail
- `VideoMedia` with `source === "UPLOAD"` -> video player
- `VideoMedia` with `embedUrl` and embeddable source -> `EmbedMediaItem` (click-to-play)
- `VideoMedia` with non-embeddable `embedUrl` -> fallback `LinkCardMediaItem`
- `LinkMedia` -> `LinkCardMediaItem`
- `LivestreamMedia` -> should NOT render in the grid (filtered out upstream)
- Delete button visible when `canDelete === true`

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Refactor GameMediaItem**

Update `src/components/game/game-media-item.tsx`:
- Change props from `Resource` to `GameMediaNode`
- Add props: `canDelete: boolean`, `onDelete: (id: string) => void`, `gameVisibility: GameVisibility`
- Remove `isParticipant` prop (replaced by `canDelete` computed upstream)
- Switch on `media.__typename`:
  - `"ImageMedia"`: Render image (use `media.url` for src, `media.thumbnailUrl` for thumbnail)
  - `"VideoMedia"` with `source === "UPLOAD"`: Render native `<video>` (use `media.url`)
  - `"VideoMedia"` with `embedUrl`: Check `isEmbeddable(embedUrl)` -- if true, render `EmbedPlayer`; if false, render `LinkCardMediaItem`
  - `"LinkMedia"`: Render `LinkCardMediaItem`
- Delete button: position absolute, shown on hover/focus, always visible on touch devices

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**

```bash
git add src/components/game/game-media-item.tsx __tests__/components/game/game-media-item.test.tsx
git commit -m "refactor(game-media): dispatch GameMediaItem to type-specific renderers via __typename"
```

---

## Task 10: GameMediaSection orchestrator

**Files:**
- Create: `src/components/game/game-media-section.tsx`

- [ ] **Step 1: Implement GameMediaSection**

Create `src/components/game/game-media-section.tsx`:

Props:
```ts
interface GameMediaSectionProps {
  gameId: number;
  initialMedia: Edge<GameMediaNode>[];
  initialPageInfo: PageInfo;
  canContribute: boolean;
  currentUserId: string | null;
  viewerGameRole: GameRole | null;
  gameVisibility: GameVisibility;
}
```

Responsibilities:
- Wraps `LiveStreamSection` in `<div role="status" aria-live="polite">` for screen reader announcements
- Filters `LivestreamMedia` from the media list for separate rendering
- Computes `gridMedia` (all non-livestream items) and uses it for the gallery count
- Renders `LiveStreamSection` above `GameMediaGallery` when a `LivestreamMedia` exists
- Passes `canContribute`, `currentUserId`, `viewerGameRole`, `gameVisibility` through to child components
- Renders `MediaControls` (Upload + Add Link buttons) when `canContribute`
- Manages `AddLinkDialog` open state
- `onMediaAdded` callback: prepends new media to state

- [ ] **Step 2: Verify build compiles**

Run: `npm run build 2>&1 | tee /tmp/build.txt`

- [ ] **Step 3: Commit**

```bash
git add src/components/game/game-media-section.tsx
git commit -m "feat(game-media): add GameMediaSection orchestrator"
```

---

## Task 11: Refactor GameMediaGallery

**Files:**
- Modify: `src/components/game/game-media-gallery.tsx`
- Modify: `src/components/game/game-media-upload-placeholder.tsx`
- Modify: `src/components/game/delete-media-dialog.tsx`
- Modify: `src/app/[locale]/game/actions.ts` (update `loadGameMedia` return type)

- [ ] **Step 1: Update GameMediaGallery**

Major changes:
1. **Props**: Change `initialMedia: Edge<Resource>[]` -> `initialMedia: Edge<GameMediaNode>[]`, add `currentUserId: string | null`, `viewerGameRole: GameRole | null`, `gameVisibility: GameVisibility`, remove `isParticipant` (replaced by `canContribute` passed from section)
2. **State**: Change `media` type from `Edge<Resource>[]` to `Edge<GameMediaNode>[]`
3. **Delete flow**: Change `deleteResource` -> `deleteGameMedia` (from `media-actions.ts`)
4. **Media count**: Use `gridMedia.length` (excluding livestream) for the badge count
5. **Upload confirm handler**: Check `confirmResult.kind === "gameMedia"` before accessing `confirmResult.gameMedia`
6. **canDelete computation**: For each item, `canDelete = addedBy.id === currentUserId || viewerGameRole === "OWNER" || viewerGameRole === "EDITOR"`
7. **Render items**: Pass `GameMediaNode` to `GameMediaItem`, pass `canDelete`, `gameVisibility`
8. **Empty state**: Use `Empty` component from `src/components/ui/empty.tsx`
9. **Load more**: Update `loadGameMedia` in `game/actions.ts` to use `gameMediaFragment` and return `Edge<GameMediaNode>[]` (this change is deferred to this task to keep the build green — see Task 3 note)

- [ ] **Step 2: Update GameMediaUploadPlaceholder**

The `GameMediaUploadPlaceholder` component itself does not need props changes -- it still accepts `{ filename, status, onDismiss }`. The upload confirm handling in `GameMediaGallery.uploadSingleFile` must be updated to check `confirmResult.kind === "gameMedia"` and construct the `Edge<GameMediaNode>` from `confirmResult.gameMedia` instead of `confirmResult.resource`.

- [ ] **Step 3: Update DeleteMediaDialog**

Add handling for authorization errors from `response.errors` (Cerbos denial). Show toast: `t("media.delete.noPermission")`.

- [ ] **Step 4: Run tests**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`
Expected: Some existing tests may need updates for the new prop types. Fix any failures.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/game-media-gallery.tsx src/components/game/game-media-upload-placeholder.tsx src/components/game/delete-media-dialog.tsx src/app/[locale]/game/actions.ts
git commit -m "refactor(game-media): update gallery, placeholder, delete dialog, and loadGameMedia for GameMediaNode"
```

---

## Task 12: Wire up GameDetailClient

**Files:**
- Modify: `src/components/game/live/game-detail-client.tsx`

- [ ] **Step 1: Compute `canContribute` live inside GameDetailClient**

Remove the `canUpload` prop from `GameDetailClientProps`. Compute `canContribute` from live state so it reacts to WebSocket events (participants joining/leaving, game status changes):

```ts
const canContribute =
  (isParticipant || state.game.viewerGameRole != null) &&
  (state.game.gameStatus === GameStatus.IN_PROGRESS ||
    state.game.gameStatus === GameStatus.COMPLETE);
```

This uses the existing live `isParticipant` (already computed from `state.game.participants.edges`) and `state.game.viewerGameRole` / `state.game.gameStatus` from the WebSocket reducer.

- [ ] **Step 2: Replace GameMediaGallery with GameMediaSection**

Replace the gallery section (around lines 207-215):

```tsx
<section className="mt-8">
  <GameMediaSection
    gameId={state.game.id}
    initialMedia={game.media.edges}
    initialPageInfo={game.media.pageInfo}
    canContribute={canContribute}
    currentUserId={currentUserId}
    viewerGameRole={state.game.viewerGameRole}
    gameVisibility={state.game.visibility}
  />
</section>
```

- [ ] **Step 3: Verify build passes**

Run: `npm run build 2>&1 | tee /tmp/build.txt`
Expected: Build succeeds -- the full component tree is now wired up

- [ ] **Step 4: Run all tests**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`
Fix any remaining test failures from prop changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/live/game-detail-client.tsx
git commit -m "feat(game-media): wire GameMediaSection into GameDetailClient"
```

---

## Task 13: CSP configuration

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add CSP headers**

**Important:** Preserve the existing `createNextIntlPlugin` / `withNextIntl` wrapper. Only add the `headers()` function to the `nextConfig` object:

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    testProxy: !!process.env.PLAYWRIGHT,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com https://player.twitch.tv https://www.instagram.com",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

- [ ] **Step 2: Verify dev server starts**

Run: `npm run build 2>&1 | tee /tmp/build.txt`
Expected: Build succeeds with CSP headers configured

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat(game-media): add CSP frame-src directive for embed domains"
```

---

## Task 14: Update existing tests

**Files:**
- Modify: existing test files that reference `Resource` in game media context

- [ ] **Step 1: Find and update tests referencing old types**

Run: `grep -rn "Resource" __tests__/ --include="*.tsx" --include="*.ts" | grep -i media`

Update any tests that use `Resource` type in game media context to use `GameMediaNode` (specifically `ImageMediaNode` for upload tests). Update mock data factories to produce `GameMediaNode` objects.

- [ ] **Step 2: Run all unit tests**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`
Expected: All tests pass

- [ ] **Step 3: Run lint**

Run: `npm run lint 2>&1 | tee /tmp/lint.txt`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add __tests__/
git commit -m "test(game-media): update existing tests for GameMediaNode types"
```

---

## Task 15: Playwright integration tests

**Files:**
- Create: `tests/fixtures/game-media-factories.ts`
- Create: `tests/pages/game-media-add-link.spec.ts`

- [ ] **Step 1: Create mock data factories**

Create `tests/fixtures/game-media-factories.ts` with factory functions for each `GameMediaNode` type (`createImageMedia`, `createVideoMedia`, `createLivestreamMedia`, `createLinkMedia`) and for `ResolveUrlResponse`.

- [ ] **Step 2: Add GraphQL handler for game media operations**

Update `tests/fixtures/graphql-handlers.ts` to handle:
- `resolveUrl` query
- `addGameMediaLink` mutation
- `deleteGameMedia` mutation
- Updated `game` query returning `GameMediaNode` in the media connection

- [ ] **Step 3: Write add-link Playwright test**

```ts
// tests/pages/game-media-add-link.spec.ts
// Test the happy path:
// 1. Navigate to game detail page
// 2. Click "Add Link" button
// 3. Paste a YouTube URL
// 4. Click "Preview"
// 5. Verify preview renders (title, thumbnail, source badge)
// 6. Click "Add"
// 7. Verify media item appears in gallery
// 8. Verify success toast
```

- [ ] **Step 4: Write add-link error test**

Test duplicate URL error and rate limit countdown behavior.

- [ ] **Step 5: Run Playwright tests**

Run: `npx playwright test tests/pages/game-media-add-link.spec.ts 2>&1 | tee /tmp/pw-results.txt`
Then read `/tmp/pw-results.txt` for results.

- [ ] **Step 6: Commit**

```bash
git add tests/
git commit -m "test(game-media): add Playwright tests for add-link flow"
```

---

## Task 16: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test 2>&1 | tee /tmp/test-results.txt`

- [ ] **Step 2: Run lint**

Run: `npm run lint 2>&1 | tee /tmp/lint.txt`

- [ ] **Step 3: Run build**

Run: `npm run build 2>&1 | tee /tmp/build.txt`

- [ ] **Step 4: Run Playwright tests**

Run: `npx playwright test 2>&1 | tee /tmp/pw-results.txt`

- [ ] **Step 5: Fix any failures, commit**

All four checks (test, lint, build, Playwright) must pass before the feature is considered complete.

---

## Plan Review (Resolved)

All critical and high issues from the adversarial review have been addressed in the plan above. See below for the original findings and how they were resolved.

### CRITICAL Issues

#### 1. Task 13 CSP config destroys next-intl plugin wrapper (CRITICAL, Confidence: 98%)

**Problem:** Task 13's `next.config.ts` code replaces the entire file with `export default nextConfig`, which removes the `createNextIntlPlugin` / `withNextIntl` wrapper. The current file at `/home/kevinlee/workspace/playground/playground-web-client/next.config.ts` (line 10-11) uses:
```ts
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```
The plan's code overwrites this with `export default nextConfig;`, which will break all i18n functionality -- every page using `getTranslations`, `useTranslations`, or locale-based routing will fail.

**Impact:** Complete application breakage. No pages will render correctly.

**Fix:** Preserve the `withNextIntl` wrapper:
```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  experimental: {
    testProxy: !!process.env.PLAYWRIGHT,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com https://player.twitch.tv https://www.instagram.com",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

#### 2. Task 3 ConfirmUploadResult change breaks profile-avatar.tsx (CRITICAL, Confidence: 95%)

**Problem:** Task 3 Step 2 changes `ConfirmUploadResult` from `{ success: boolean; resource?: Resource; ... }` to a discriminated union with a `kind` field. This breaks `src/components/profile/profile-avatar.tsx` at lines 118 and 134, which check `confirmResult.resource` directly. The plan does not list `profile-avatar.tsx` as a modified file, and no task addresses this breakage.

The current code at `profile-avatar.tsx:118`:
```ts
if (!confirmResult.success || !confirmResult.resource) {
```
After the discriminated union change, `resource` is only available on the `kind: "resource"` variant, so `confirmResult.resource` will be a TypeScript error on the union type.

**Impact:** TypeScript compilation failure after Task 3. The build will fail until `profile-avatar.tsx` is updated.

**Fix:** Either:
- (a) Add `profile-avatar.tsx` to Task 3's modified files list and update it to check `confirmResult.kind === "resource"` before accessing `.resource`, OR
- (b) Make `ConfirmUploadResult` backward-compatible by keeping `resource?: Resource` alongside the new `kind` and `gameMedia` fields (less clean but avoids cross-file breakage).

### HIGH Issues

#### 3. Task 4 commits with known TypeScript errors, blocking build (HIGH, Confidence: 90%)

**Problem:** Task 4 Step 5 says "Expected: TypeScript errors expected in `game-detail-client.tsx` (props mismatch -- will be fixed in next task)". But Task 5-8 create new standalone components that do NOT fix `game-detail-client.tsx`. The fix comes in Task 12. This means Tasks 4 through 11 (8 tasks) have a broken build.

The plan says to verify the build in Task 10 Step 2, but the build will fail because:
- `page.tsx` passes `canContribute` and `currentUserId` to `GameDetailClient` (Task 4)
- `GameDetailClient` still expects `canUpload` (not updated until Task 12)

**Impact:** Cannot verify correctness of Tasks 5-11 with a build check. Any typo or logic error in those tasks won't be caught until Task 12.

**Fix:** Reorder Task 12 (wire up GameDetailClient) immediately after Task 4. Tasks 5-11 create new components that can be committed independently -- they don't need the build to pass to be written/tested in isolation. But wiring up `GameDetailClient` before those tasks will also fail because it references `GameMediaSection` which doesn't exist yet.

Better approach: In Task 4, simultaneously update `GameDetailClientProps` to accept the new props (adding `currentUserId`, `canContribute`; keeping `canUpload` temporarily as optional). This keeps the build green through all tasks.

#### 4. Missing viewerGameRole prop threading for delete permissions (HIGH, Confidence: 92%)

**Problem:** Task 11 Step 1 item 6 says to compute `canDelete = addedBy.id === currentUserId || viewerGameRole === "OWNER" || viewerGameRole === "EDITOR"`. But `viewerGameRole` is never passed as a prop to `GameMediaSection` (Task 10 props interface), `GameMediaGallery` (Task 11), or `GameMediaItem` (Task 9).

The design doc File Changes Summary line 1041 explicitly says "pass `viewerGameRole`", but the implementation plan's `GameMediaSectionProps` (Task 10) does not include it, and no task threads it from `GameDetailClient` through the component tree.

**Impact:** Editors and owners will not be able to delete other users' media items. The `canDelete` computation will only check `addedBy.id === currentUserId`, making the second half of the condition dead code.

**Fix:** Add `viewerGameRole: GameRole | null` to `GameMediaSectionProps` in Task 10 and thread it through to `GameMediaGallery`. The gallery computes `canDelete` using both `currentUserId` and `viewerGameRole`. Alternatively, compute `canDeleteAny: boolean` in `GameMediaSection` from `viewerGameRole` and pass that simpler boolean down.

#### 5. Task 3 loadGameMedia return type change breaks GameMediaGallery at build time (HIGH, Confidence: 88%)

**Problem:** Task 3 Step 3 changes `loadGameMedia` to return `Edge<GameMediaNode>[]` instead of `Edge<Resource>[]`. But `GameMediaGallery` (which calls `loadGameMedia` at line 67-76) still expects `Edge<Resource>[]` and won't be updated until Task 11. This means the build will break after Task 3 -- the plan says "Build succeeds (server actions are not yet called from any component)" but `loadGameMedia` IS already called from `GameMediaGallery`.

Current code at `game-media-gallery.tsx:67`:
```ts
const result = await loadGameMedia(gameId, 12, pageInfo.endCursor ?? undefined);
```
After changing the return type, `result.edges` will be `Edge<GameMediaNode>[]` but the component's state is `Edge<Resource>[]`. TypeScript will error on the assignment `setMedia((prev) => [...prev, ...result.edges])`.

**Impact:** Build breaks after Task 3, not recoverable until Task 11.

**Fix:** Either:
- (a) Move the `loadGameMedia` return type change to Task 11 when `GameMediaGallery` is also updated, OR
- (b) Keep the old `loadGameMedia` signature and create a new `loadGameMediaV2` in Task 3, switching `GameMediaGallery` to use it in Task 11.

#### 6. Plan omits PUBLIC game unauthenticated access changes (HIGH, Confidence: 95%)

**Problem:** The design doc (section 7, "Unauthenticated access for PUBLIC games") requires:
- Removing the auth redirect for PUBLIC games (`page.tsx` lines 78-81)
- Using `query()` instead of `authQuery()` when unauthenticated
- Rendering the gallery as read-only for unauthenticated users

The design doc's File Changes Summary also lists "remove auth redirect for PUBLIC games" for `page.tsx`. No task in the plan addresses any of these requirements.

**Impact:** PUBLIC games will remain inaccessible to unauthenticated users, contradicting the design spec. This is a significant feature gap.

**Fix:** Add a step to Task 4 (or a new task) that:
1. Removes the hard redirect at `page.tsx:78-81`
2. Conditionally uses `query()` vs `authQuery()` based on session presence
3. Sets `currentUserId` to `null` and `canContribute` to `false` when unauthenticated
4. Passes `playerId` as `null` (or 0) when unauthenticated and skips the `meResponse` query

### MEDIUM Issues

#### 7. isParticipant prop duplication creates stale data risk (MEDIUM, Confidence: 85%)

**Problem:** Task 4 passes `isParticipant` from `page.tsx` as a prop to `GameDetailClient`, but `GameDetailClient` currently computes `isParticipant` live from `state.game.participants.edges` (line 163). The live computation uses the WebSocket-updated reducer state, which means it updates in real-time when participants join/leave. Passing it as a static prop from the server would be stale.

The plan's Task 12 adds `isParticipant` to `GameDetailClientProps`, but doesn't say whether to remove the existing live computation. If both exist, which value should `GameMediaSection` use?

**Impact:** If the server-computed `isParticipant` is used instead of the live-computed one, the media section won't update when a user joins a game via WebSocket. Upload/add-link controls might not appear until page refresh.

**Fix:** Do NOT pass `isParticipant` as a prop. Keep the existing live computation inside `GameDetailClient` and compute `canContribute` there too (using the live `isParticipant` and `state.game.viewerGameRole` and `state.game.gameStatus`). This ensures the media section reacts to live game events.

#### 8. GameMediaUploadPlaceholder has no onConfirm prop (MEDIUM, Confidence: 95%)

**Problem:** Task 11 Step 2 says "Change the `onConfirm` callback signature from `(resource: Resource)` to `(gameMedia: GameMediaNode)`." But the actual `GameMediaUploadPlaceholder` component has no `onConfirm` callback -- its props are `{ filename, status, onDismiss }`. The upload confirm logic is entirely in `GameMediaGallery.uploadSingleFile`.

**Impact:** Implementer confusion. The step describes a change to a prop that doesn't exist.

**Fix:** Rewrite Task 11 Step 2 to: "The `GameMediaUploadPlaceholder` component itself does not need props changes -- it still accepts `{ filename, status, onDismiss }`. The upload confirm handling in `GameMediaGallery.uploadSingleFile` must be updated to check `confirmResult.kind === 'gameMedia'` and construct the `Edge<GameMediaNode>` from `confirmResult.gameMedia` instead of `confirmResult.resource`."

#### 9. PROTECTED game visibility not addressed for privacy disclosure (MEDIUM, Confidence: 80%)

**Problem:** The `GameVisibility` enum has three values: `PUBLIC`, `PROTECTED`, and `PRIVATE`. The design doc and plan only discuss privacy disclosure behavior for `PUBLIC` (no disclosure) and `PRIVATE` (show disclosure). `PROTECTED` visibility is not mentioned.

**Impact:** `PROTECTED` games will either show or not show the privacy disclosure depending on which branch the implementer defaults to. Inconsistent user experience for protected games.

**Fix:** Clarify in the `EmbedPlayer` implementation that `PROTECTED` games should show the privacy disclosure (same as `PRIVATE`), since `PROTECTED` games have restricted access and the same privacy concerns apply. The condition should be `gameVisibility !== "PUBLIC"`.

#### 10. Task 4 line references may be inaccurate (MEDIUM, Confidence: 75%)

**Problem:** Task 4 references specific line numbers in `page.tsx`: "lines 166-169" for `canUpload` logic and "around line 461-476" for `GameDetailClient` usage, and "around line 119-126" for the media query. However, these line numbers are based on the current file state and may shift after Task 2 and Task 3 modify other files. More importantly, the actual current `canUpload` logic is at lines 166-169 (confirmed), the media query is at lines 119-126 (confirmed), and the `GameDetailClient` usage is at lines 461-476 (confirmed).

These are currently accurate but fragile -- if any earlier task adds imports to `page.tsx` (e.g., Task 4 Step 2 imports `gameMediaFragment`), the line numbers shift.

**Impact:** Minor confusion for implementers relying on line numbers.

**Fix:** Use code patterns instead of line numbers (e.g., "Replace the `canUpload` assignment" rather than "lines 166-169"). Or note these are approximate.

### LOW Issues

#### 11. Task 2 i18n key update says "replace" but should "merge" (LOW, Confidence: 85%)

**Problem:** Task 2 Step 2 says "Replace the existing `game.media` section with the expanded keys." The existing section has keys like `upload`, `uploading`, `empty`, `emptyParticipant` that may still be used by other components or the gallery during the intermediate state before Task 11 completes. Replacing (instead of merging) risks removing keys that are still referenced.

**Impact:** If existing keys are removed before their consumers are updated, i18n lookups will return key paths as strings.

**Fix:** Change "Replace" to "Merge the new keys into the existing `game.media` section. Keep existing keys that may still be referenced until their consumers are updated."

#### 12. Test import path for messages uses unusual relative path (LOW, Confidence: 90%)

**Problem:** Task 5's test file imports messages as `import messages from "@/../../messages/en.json"`. This path works but is unusual and fragile. The `@/` prefix maps to `./src/`, so `@/../../messages/en.json` resolves to `./messages/en.json` via `../../` from `src/`.

**Impact:** Functional but non-standard. May confuse other developers.

**Fix:** This is an existing pattern in the codebase (if it exists elsewhere). If not, consider using a direct relative path or verifying this import pattern works with Vitest's module resolution.

### Summary

| # | Issue | Severity | Confidence | Impact |
|---|-------|----------|------------|--------|
| 1 | CSP config destroys next-intl plugin | CRITICAL | 98% | All pages break -- no i18n |
| 2 | ConfirmUploadResult change breaks profile-avatar.tsx | CRITICAL | 95% | Build fails -- unrelated file breaks |
| 3 | Task 4 commits with known TS errors, 8 tasks with broken build | HIGH | 90% | Cannot verify correctness of Tasks 5-11 |
| 4 | viewerGameRole not threaded for delete permissions | HIGH | 92% | Editors/owners cannot delete others' media |
| 5 | loadGameMedia return type change breaks gallery | HIGH | 88% | Build fails after Task 3 |
| 6 | PUBLIC game unauthenticated access not implemented | HIGH | 95% | Feature gap: public games still auth-gated |
| 7 | isParticipant prop duplication creates stale data | MEDIUM | 85% | Media controls won't react to live events |
| 8 | Placeholder has no onConfirm prop (plan describes non-existent change) | MEDIUM | 95% | Implementer confusion |
| 9 | PROTECTED visibility unaddressed for privacy disclosure | MEDIUM | 80% | Inconsistent UX for protected games |
| 10 | Line number references fragile | MEDIUM | 75% | Minor implementer confusion |
| 11 | i18n "replace" should be "merge" | LOW | 85% | Temporary i18n breakage possible |
| 12 | Unusual test import path for messages | LOW | 90% | Non-standard but functional |

### Recommended Fixes

**For Critical issues:**

1. **CSP config (Issue 1):** Update Task 13's code block to preserve `createNextIntlPlugin` import and `withNextIntl` wrapper. The `headers()` function goes inside `nextConfig`, but the export must remain `withNextIntl(nextConfig)`.

2. **ConfirmUploadResult (Issue 2):** Add `src/components/profile/profile-avatar.tsx` to Task 3's modified files. Update `profile-avatar.tsx` to handle the new discriminated union:
   ```ts
   if (!confirmResult.success) { ... }
   if (confirmResult.kind !== "resource") { ... }
   setProfilePicture(confirmResult.resource);
   ```

**For High issues:**

3. **Build breakage ordering (Issues 3 and 5):** Restructure the task ordering so that type changes and their consumers are updated atomically. The safest approach: defer `loadGameMedia` return type change from Task 3 to Task 11, and update `GameDetailClientProps` in Task 4 to accept BOTH old and new props temporarily (add `currentUserId?`, `canContribute?` as optional; keep `canUpload?` as optional). Task 12 then removes the deprecated optional props.

4. **viewerGameRole threading (Issue 4):** Add `viewerGameRole: GameRole | null` to `GameMediaSectionProps` in Task 10 and to `GameMediaGalleryProps` in Task 11. Pass it from `GameDetailClient` via `state.game.viewerGameRole`.

5. **Unauthenticated access (Issue 6):** Add a new step to Task 4 that conditionally skips the auth redirect and `meResponse` query for PUBLIC game visibility. This is a non-trivial change that may warrant its own task.
