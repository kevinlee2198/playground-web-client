# Game Media -- Frontend Design

## 1. Overview

The Game Media feature evolves the existing photo/video upload gallery into a unified content hub. Every piece of content associated with a game -- uploaded photos, YouTube embeds, livestream players, Hudl film links, league recap articles -- is a **GameMedia** item rendered based on its concrete GraphQL type (`__typename`) and `source`.

The existing `GameMediaGallery` component (`src/components/game/game-media-gallery.tsx`) currently renders a grid of `Resource` items fetched from `game.media`. This design replaces that with a richer gallery that handles four content types (`ImageMedia`, `VideoMedia`, `LivestreamMedia`, `LinkMedia`), eight sources, and a two-phase "Add Link" flow with URL resolution preview.

### Interface-based GraphQL design

The backend returns a `GameMedia` interface with four concrete types instead of a single type with nullable fields. The frontend discriminates on `__typename` instead of a `type` enum:

- `__typename === "ImageMedia"` -- uploaded or externally-sourced image
- `__typename === "VideoMedia"` -- uploaded or externally-sourced video (also what a livestream becomes after ending)
- `__typename === "LivestreamMedia"` -- a live stream (always live by definition)
- `__typename === "LinkMedia"` -- a rich link preview

`MediaStatus` is eliminated. A `LivestreamMedia` is always live. When it ends, the backend transitions it to a `VideoMedia`. Since the frontend uses plain `fetch()` with `json-to-graphql-query` (no normalized cache), `__typename` changes are free -- no cache invalidation needed. The next fetch simply returns the new type.

### Key changes from existing implementation

- `game.media` connection returns `GameMedia` interface types instead of `Resource`
- New "Add Link" button alongside existing "Upload" button
- Live section pinned above the gallery grid when a `LivestreamMedia` exists
- Link cards and embedded video players alongside uploaded photos
- Delete flow changes from `deleteResource` to `deleteGameMedia`
- Upload confirm returns `ConfirmGameMediaUploadResponse` with `gameMedia` -- the `url` field on `GameMedia` provides presigned S3 URLs for uploads directly (no separate `resource` field needed)
- `resolveUrl` is a **Query**, not a Mutation
- Live detection uses `__typename === "LivestreamMedia"` instead of `status === "LIVE"`

## 2. Component Architecture

```
GameDetailClient (existing, client component)
  |  Props: currentUserId, isParticipant, gameVisibility (threaded from page.tsx)
  |
  +-- GameMediaSection (new, client component - replaces direct GameMediaGallery usage)
        |  Props: currentUserId, isParticipant, canContribute, gameVisibility
        |
        +-- [aria-live="polite" wrapper]
        |     +-- LiveStreamSection (client component, conditional)
        |           +-- EmbedPlayer (client component - auto-loads iframe for LIVE)
        |           +-- BreathingDot + LIVE Badge (existing component)
        |
        +-- GameMediaGallery (client component - refactored)
        |     +-- GameMediaItem (client component - refactored)
        |     |     +-- ImageMediaItem (renders uploaded images)
        |     |     +-- UploadedVideoMediaItem (renders uploaded videos with native player)
        |     |     +-- EmbedMediaItem (renders external video thumbnail + click-to-play)
        |     |     +-- LinkCardMediaItem (renders rich preview card for LinkMedia type)
        |     +-- GameMediaUploadPlaceholder (existing, unchanged)
        |     +-- "Load More" button (existing pattern)
        |
        +-- MediaControls (client component)
        |     +-- Upload button (existing pattern, triggers file input)
        |     +-- "Add Link" button (opens AddLinkDialog)
        |
        +-- AddLinkDialog (client component)
        |     +-- URL input field (TanStack Form + Zod validation)
        |     +-- LinkPreviewCard (shows resolved URL preview)
        |     +-- Countdown timer (shown when rate limited)
        |     +-- sr-only aria-live region for rate limit announcements
        |
        +-- DeleteMediaDialog (existing, updated to use deleteGameMedia)
```

### Server vs Client component split

All gallery components are **client components** because they require:
- Interactive state (upload progress, dialog open/close, click-to-play toggles)
- `useTranslations` hook
- Event handlers (file selection, link submission, delete confirmation)

The game detail **page** (`src/app/[locale]/game/[id]/page.tsx`) remains a server component. It fetches the initial `GameMedia` connection server-side and passes it as props, identical to the current pattern with `Resource`.

## 3. Embed Rendering

### Iframe sandboxing strategy

All external video embeds use a hardcoded iframe template. No raw HTML from oEmbed is ever rendered.

```tsx
<iframe
  src={embedUrl}
  title={title ?? `${source} video`}
  width={embedWidth ?? 560}
  height={embedHeight ?? 315}
  // allow-same-origin is required for third-party embeds (YouTube, Vimeo, etc.) to access
  // their own cookies/localStorage. NEVER add same-origin domains to TRUSTED_EMBED_DOMAINS
  // as this would allow the embedded content to escape the sandbox.
  sandbox="allow-scripts allow-same-origin"
  allow="autoplay; encrypted-media"
  loading="lazy"
  referrerPolicy="no-referrer"
  className={cn(
    "w-full rounded-lg",
    source === "TIKTOK" ? "aspect-[9/16] max-w-sm mx-auto" : "aspect-video"
  )}
/>
```

### Trusted domain allowlist

A constant in `src/lib/embed-config.ts`:

```ts
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

If `embedUrl` does not match the allowlist, the item falls back to a `LinkCardMediaItem` rendering (thumbnail + "Open in [Provider]" button). This handles cases like Hudl where embeds are auth-gated.

### Click-to-play pattern

External video embeds default to a **static thumbnail** with a play button overlay and provider icon. The iframe loads only when the user clicks. This prevents performance issues from many simultaneous iframes.

The play button overlay must have an accessible label: `aria-label={t("media.playVideo", { title: media.title ?? source })}`. The click-to-play transition uses a fade: the thumbnail fades out (`motion-safe:duration-300`) while the iframe fades in.

Exception: **LivestreamMedia** items auto-load the iframe since live content is time-sensitive.

### Privacy for PRIVATE games

The `EmbedPlayer` component accepts a `gameVisibility` prop. For PRIVATE games, external embeds show a click-to-load pattern with an explicit disclosure: "Loading this video will share data with [Provider]." The thumbnail is rendered from the cached `thumbnailUrl` only -- no third-party requests until the user clicks.

The disclosure text uses `aria-describedby` so screen readers announce the privacy implication before the user activates the play button:

```tsx
<button aria-label={t("media.playVideo", { title })} aria-describedby={`privacy-${media.id}`}>
  <img src={thumbnailUrl} alt={title ?? ""} />
  <PlayIcon />
</button>
<p id={`privacy-${media.id}`} className="text-xs text-muted-foreground">
  {t("media.privacyDisclosure", { provider })}
</p>
```

For auth-gated providers (Hudl), the `LinkPreviewCard` in the AddLinkDialog shows an additional note: "Viewers may need to sign in to {provider} to watch this video."

## 4. GraphQL Queries & Mutations

All queries use `json-to-graphql-query` syntax consistent with existing patterns.

### GameMedia fragment

The fragment uses inline fragments (`__on`) to request type-specific fields from each concrete type. The `__typename` field is always requested for discrimination.

```ts
// src/lib/graphql-fragments.ts

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

### Fetching game media connection (initial load in page.tsx)

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

Pagination uses `first`/`after` (top-down, newest first). The frontend does **not** specify a sort direction -- it relies on the backend default of DESC by id. This matches the CLAUDE.md pagination convention for top-down feeds.

### Load more game media (server action)

```ts
export async function loadGameMedia(
  gameId: number,
  first: number,
  after?: string,
): Promise<{ edges: Edge<GameMediaNode>[]; pageInfo: PageInfo } | null> {
  const response = await authQuery({
    game: {
      __args: { id: gameId },
      media: {
        __args: { first, ...(after ? { after } : {}) },
        edges: {
          cursor: true,
          node: gameMediaFragment,
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    },
  });

  return response.data?.game?.media || null;
}
```

### resolveUrl query (Add Link phase 1)

`resolveUrl` is a **Query**, not a Mutation. This means it is not serialized with mutations, which is better for UX -- the preview can load while other mutations are in-flight.

Note: `resolveUrl` is wrapped in a server action despite being a query because it is triggered interactively from the `AddLinkDialog` client component. The result should not be cached (each URL resolution involves external HTTP requests).

```ts
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
        {
          __typeName: "GameNotFoundError",
          message: true,
        },
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
        {
          __typeName: "RateLimitedError",
          message: true,
          retryAfterSeconds: true,
        },
        {
          __typeName: "GameNotInProgressError",
          message: true,
        },
      ],
    },
  });

  // ... extractQueryResult pattern
}
```

Note: `GameNotFoundError` and `UrlResolutionError` are explicitly fragmented (not using `errorFragment`) so the frontend can distinguish between them for differentiated error UIs.

### addGameMediaLink mutation (Add Link phase 2)

```ts
export async function addGameMediaLink(
  url: string,
  gameId: number,
): Promise<AddGameMediaLinkActionResult> {
  const response = await authMutate({
    addGameMediaLink: {
      __args: { input: { gameId, url } },
      __typename: true,
      __on: [
        {
          __typeName: "AddGameMediaLinkResponse",
          gameMedia: gameMediaFragment,
        },
        {
          __typeName: "DuplicateMediaError",
          message: true,
          existingGameMediaId: true,
        },
        {
          __typeName: "RateLimitedError",
          message: true,
          retryAfterSeconds: true,
        },
        {
          __typeName: "GameNotFoundError",
          message: true,
        },
        {
          __typeName: "GameNotInProgressError",
          message: true,
        },
        {
          __typeName: "UrlResolutionError",
          message: true,
          errorCode: true,
        },
        errorFragment,
      ],
    },
  });

  // ... extractMutationResult pattern
}
```

### deleteGameMedia mutation

```ts
export async function deleteGameMedia(
  id: string,
): Promise<DeleteGameMediaActionResult> {
  const response = await authMutate({
    deleteGameMedia: {
      __args: { input: { id } },
      __typename: true,
      __on: [
        { __typeName: "DeleteGameMediaResponse", id: true },
        errorFragment,
      ],
    },
  });

  // ... extractMutationResult pattern
}
```

### confirmUpload changes

The existing `confirmUpload` server action handles the `ConfirmGameMediaUploadResponse` union member. When the upload context is `gameMedia`, the response contains a `GameMedia` node directly. The `url` field on `GameMedia` provides the presigned S3 download URL for uploads.

```ts
export async function confirmUpload(resourceId: string): Promise<ConfirmUploadResult> {
  const response = await authMutate({
    confirmUpload: {
      __args: { input: { resourceId } },
      __typename: true,
      __on: [
        { __typeName: "ConfirmUploadResponse", resource: resourceFragment },
        { __typeName: "ConfirmGameMediaUploadResponse", gameMedia: gameMediaFragment },
        errorFragment,
      ],
    },
  });

  const raw = response.data.confirmUpload;
  if (raw.__typename === "ConfirmGameMediaUploadResponse") {
    return { success: true, gameMedia: raw.gameMedia };
  }
  if (raw.__typename === "ConfirmUploadResponse") {
    return { success: true, resource: raw.resource };
  }
  return { success: false, message: raw.message };
}
```

When a game media upload is confirmed, the `GameMediaUploadPlaceholder` receives the `GameMediaNode` from the response and replaces the placeholder with the rendered media item. The `gameMedia.url` field contains the presigned S3 URL for rendering the uploaded image or video.

## 5. Add Link Flow

### Step-by-step UX

1. User clicks "Add Link" button in the media controls area
2. `AddLinkDialog` opens with a URL text input field
3. User pastes a URL and submits the form
4. **Loading state**: Input is disabled, a spinner appears, "Resolving link..." text shown
5. Server action `resolveUrl` is called (as a query)
6. **Success**: `LinkPreviewCard` renders showing thumbnail, title, description, detected type/source
7. User reviews the preview and clicks "Add" to confirm
8. Server action `addGameMediaLink` is called with the `resolvedUrl`
9. **Success**: Dialog closes, new `GameMedia` item is prepended to the gallery, toast shown
10. **Cancel**: User clicks "Cancel" or closes dialog, no action taken

### AddLinkDialog component

```tsx
// Simplified structure
function AddLinkDialog({ gameId, open, onOpenChange, onMediaAdded }) {
  const [preview, setPreview] = useState<ResolveUrlResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<LinkError | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);

  // Reset state when dialog closes
  function handleOpenChange(open: boolean) {
    if (!open) {
      setPreview(null);
      setError(null);
      setRateLimitCountdown(null);
    }
    onOpenChange(open);
  }

  // Phase 1: Resolve URL
  function handleResolve(url: string) {
    startTransition(async () => {
      const result = await resolveUrl(url, gameId);
      if (result.success) setPreview(result.data);
      else if (result.errorType === "RateLimitedError") {
        setRateLimitCountdown(result.retryAfterSeconds);
      } else if (result.errorType === "DuplicateMediaError") {
        setPreview(null); // Clear stale preview
        setError(result);
      } else {
        setError(result);
      }
    });
  }

  // Phase 2: Confirm
  function handleConfirm() {
    startTransition(async () => {
      const result = await addGameMediaLink(preview.resolvedUrl, gameId);
      if (result.success) {
        onMediaAdded(result.gameMedia);
        onOpenChange(false);
        toast.success(t("media.linkAdded"));
      } else if (result.errorType === "UrlResolutionError") {
        // UrlResolutionError in Phase 2: show as toast since the URL input is not visible
        toast.error(URL_ERROR_MESSAGES[result.errorCode] ?? result.message);
      } else if (result.errorType === "DuplicateMediaError") {
        toast.error(t("media.errors.duplicateLink"));
      } else if (result.errorType === "RateLimitedError") {
        setRateLimitCountdown(result.retryAfterSeconds);
      } else {
        toast.error(result.message);
      }
    });
  }

  // Rate limit countdown timer -- uses setTimeout (one per tick) instead of
  // setInterval to avoid creating/destroying intervals on every state update
  useEffect(() => {
    if (rateLimitCountdown == null || rateLimitCountdown <= 0) return;
    const timer = setTimeout(() => {
      setRateLimitCountdown((prev) => (prev != null && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [rateLimitCountdown]);

  // Render: URL input -> preview -> confirm/cancel
  // Phase 2 "Add" button shows spinner when isPending:
  //   <Button disabled={isPending}>
  //     {isPending && <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
  //     {isPending ? t("media.addLinkDialog.adding") : t("media.addLinkDialog.confirm")}
  //   </Button>
  // When rateLimitCountdown is set, the button is disabled and shows "Try again in {n}s"
  //
  // Screen reader announcements for rate limit:
  //   <div role="status" aria-live="assertive" className="sr-only">
  //     {rateLimitCountdown != null && rateLimitCountdown === initialCountdown
  //       ? t("media.errors.rateLimited", { seconds: rateLimitCountdown })
  //       : rateLimitCountdown === null ? t("media.rateLimitCleared") : null}
  //   </div>
}
```

### URL validation (client-side, pre-submit)

Zod schema validates the input before calling `resolveUrl`:

```ts
const urlSchema = z.string().url({ message: t("media.addLink.invalidUrl") });
```

## 6. Error Handling

| Error Type | When it occurs | User-facing behavior |
|---|---|---|
| `DuplicateMediaError` | resolveUrl or addGameMediaLink when URL already exists in game | Toast: "This link has already been added to this game." No dialog close -- user can try a different URL |
| `UrlResolutionError` (`INVALID_SCHEME`) | resolveUrl when URL uses non-https scheme | Inline error below input: "Please use an https:// URL" |
| `UrlResolutionError` (`SSRF_BLOCKED`) | resolveUrl when URL resolves to blocked IP range | Inline error below input: "This URL cannot be accessed" |
| `UrlResolutionError` (`TIMEOUT`) | resolveUrl when URL takes too long to respond | Inline error below input: "The URL took too long to respond. Please try again." |
| `UrlResolutionError` (`UNREACHABLE`) | resolveUrl when URL host cannot be reached | Inline error below input: "Could not reach this URL. Please check it and try again." |
| `UrlResolutionError` (`UNSUPPORTED_FORMAT`) | resolveUrl when URL format is unsupported | Inline error below input: "This URL format is not supported." |
| `GameNotFoundError` | resolveUrl or addGameMediaLink when game was deleted | Toast: "Game not found." (edge case -- user would already be redirected) |
| `GameNotInProgressError` | resolveUrl or addGameMediaLink when game status is not IN_PROGRESS or COMPLETE | Toast: "This game is no longer accepting media." |
| `RateLimitedError` | resolveUrl or addGameMediaLink when rate limit exceeded | "Add Link" button disabled with countdown timer showing seconds remaining (from `retryAfterSeconds`). Timer counts down in real-time. Button re-enables when timer reaches zero. |
| `GameMediaNotFoundError` | deleteGameMedia when media was already deleted | Toast: "This media item no longer exists." Remove from local state |
| Authorization error on delete | deleteGameMedia when Cerbos denies the request | Toast: "You don't have permission to delete this media." (arrives as `response.errors`, not a union member) |
| GraphQL network errors | Any server action failure | Toast with generic error message from `response.errors[0].message` |

### UrlResolutionError handling

The `UrlResolutionError` type includes an `errorCode` field with the following values. The frontend maps each code to a user-friendly message:

```ts
const URL_ERROR_MESSAGES: Record<string, string> = {
  INVALID_SCHEME: t("media.errors.invalidScheme"),
  SSRF_BLOCKED: t("media.errors.urlCannotBeAccessed"),
  TIMEOUT: t("media.errors.urlTimeout"),
  UNREACHABLE: t("media.errors.urlUnreachable"),
  UNSUPPORTED_FORMAT: t("media.errors.unsupportedFormat"),
};
```

The error is displayed inline below the URL input field. If the `errorCode` is unrecognized, fall back to the generic message from `error.message`.

## 7. Permissions & Visibility

### Conditional rendering rules

| Element | Condition | Notes |
|---|---|---|
| Upload button | `canContribute` (see below) | Participants OR editors/owners, when game is IN_PROGRESS or COMPLETE |
| Add Link button | Same as Upload button | Same permission model |
| Delete button on own media | `addedBy.id === currentUserId` | `currentUserId` is the Keycloak user ID (string), passed from `page.tsx` via `meResponse.data.me.id` |
| Delete button on any media | `viewerGameRole === OWNER` OR `viewerGameRole === EDITOR` | Organizers and editors can delete any item |
| Gallery (read) | Anyone who can view the game | PUBLIC games visible to unauthenticated users |
| Live section | Always shown when a `LivestreamMedia` item exists | Read-only for all viewers |
| Media controls section | Hidden when `!canContribute` | No "Add Link" or "Upload" for viewers who cannot contribute |

### Unauthenticated access for PUBLIC games

The game detail page currently redirects unauthenticated users to `/`. This redirect must be removed for PUBLIC games. When unauthenticated:
- Gallery renders as read-only (images, video thumbnails, link cards, livestream)
- No upload or add-link controls
- Use `query()` instead of `authQuery()` for the media connection

### Livestream permissions

Only game **participants** can start livestreams (not editors). This is enforced on the backend via Cerbos policy. The web client does not show any livestream start controls (mobile only for v1), so no frontend permission logic is needed for this.

### canContribute logic update

Current code checks `isParticipant` only. Must be updated to check **both** participant status and management role. `viewerGameRole` is only non-null for OWNER/EDITOR -- regular participants have `viewerGameRole: null`. So the check must be:

```ts
const canContribute =
  (isParticipant || game.viewerGameRole != null) &&
  (game.gameStatus === GameStatus.IN_PROGRESS ||
    game.gameStatus === GameStatus.COMPLETE);
```

This covers regular participants (who are in the participants list) AND editors/owners (who have a `viewerGameRole`). Both `isParticipant` and `canContribute` are computed in `page.tsx` and passed as props.

### currentUserId threading

The delete permission check needs the Keycloak user ID (string) to compare against `addedBy.id`. The page already fetches `meResponse.data.me.id` -- this must be threaded through as a new prop:

1. `page.tsx` passes `currentUserId={meResponse.data.me.id}` to `GameDetailClient`
2. `GameDetailClient` passes it to `GameMediaSection`
3. `GameMediaSection` passes it to `GameMediaGallery` and `GameMediaItem`
4. `GameMediaItem` compares `addedBy.id === currentUserId` (both strings)

**Important**: `currentUserId` (string, Keycloak user ID) is NOT the same as `playerId` (number, Player entity ID). Do not confuse these.

## 8. Upload Integration

The existing upload flow (`requestGameMediaUpload` -> S3 PUT -> `confirmUpload`) continues to work. Changes:

1. **`confirmUpload` response**: When the upload context is `gameMedia`, the backend returns `ConfirmGameMediaUploadResponse` with a `gameMedia` field instead of `ConfirmUploadResponse` with a `resource` field. The server action must handle both union members.

2. **Gallery state update**: On successful upload, the new `GameMedia` node is appended to the gallery state (not a `Resource`). The `GameMediaUploadPlaceholder` receives the `GameMediaNode` from the confirm response and transitions to the rendered media item.

3. **Upload placeholder**: `GameMediaUploadPlaceholder` is unchanged -- it shows a spinner during upload and an error state on failure, keyed by a local UUID. On confirm success, it receives a `GameMediaNode` (not a `Resource`).

4. **Gallery item rendering**: Uploaded images and videos are rendered by `ImageMediaItem` and `UploadedVideoMediaItem` respectively, using `gameMedia.url` for the image `src` and video `src`. The `url` field on `GameMedia` provides presigned S3 URLs for upload-sourced items.

### confirmUpload server action changes

`ConfirmUploadResult` becomes a discriminated union to safely handle both return paths:

```ts
type ConfirmUploadResult =
  | { success: true; kind: "resource"; resource: Resource }
  | { success: true; kind: "gameMedia"; gameMedia: GameMediaNode }
  | { success: false; errorType: string; message: string };
```

```ts
export async function confirmUpload(resourceId: string): Promise<ConfirmUploadResult> {
  const response = await authMutate({
    confirmUpload: {
      __args: { input: { resourceId } },
      __typename: true,
      __on: [
        { __typeName: "ConfirmUploadResponse", resource: resourceFragment },
        { __typeName: "ConfirmGameMediaUploadResponse", gameMedia: gameMediaFragment },
        errorFragment,
      ],
    },
  });

  const raw = response.data.confirmUpload;
  if (raw.__typename === "ConfirmGameMediaUploadResponse") {
    return { success: true, kind: "gameMedia", gameMedia: raw.gameMedia };
  }
  if (raw.__typename === "ConfirmUploadResponse") {
    return { success: true, kind: "resource", resource: raw.resource };
  }
  return { success: false, errorType: raw.__typename, message: raw.message };
}
```

When a game media upload is confirmed, the gallery handler checks `confirmResult.kind === "gameMedia"` before accessing `confirmResult.gameMedia`. The `GameMediaUploadPlaceholder` receives the `GameMediaNode` from the response and replaces the placeholder with the rendered media item. The `gameMedia.url` field contains the presigned S3 URL for rendering the uploaded image or video.

## 9. Livestream Display

The web client does not initiate livestreams (mobile only for v1) but must display them. The web client has **no livestream mutation code** -- it only reads and renders `LivestreamMedia` items from the game media connection.

### Live section layout

When a `LivestreamMedia` item exists in the media connection, the `LiveStreamSection` component renders above the gallery grid. The container uses `max-w-3xl mx-auto` to prevent excessive width on wide viewports.

The `LiveStreamSection` is wrapped in an `aria-live="polite"` region so screen readers announce when a livestream appears or disappears:

```tsx
<div role="status" aria-live="polite">
  {liveMedia && <LiveStreamSection media={liveMedia} />}
</div>
```

```
+--------------------------------------------------+
|  [● LIVE badge]  Stream Title                    |
|                                                  |
|  +--------------------------------------------+ |
|  |                                            | |
|  |       YouTube / Twitch iframe              | |
|  |       (auto-loaded, no click-to-play)      | |
|  |                                            | |
|  +--------------------------------------------+ |
|                                                  |
|  Added by @username                              |
+--------------------------------------------------+
```

### LIVE badge

Uses the existing `BreathingDot` component (`src/components/game/breathing-dot.tsx`) with `animate-breathe` and `bg-live` color, which already respects `prefers-reduced-motion`. Do NOT use `animate-pulse` (that's for skeleton loading states).

```tsx
<Badge variant="destructive">
  <BreathingDot />
  <span className="sr-only">Currently </span>
  {t("media.live")}
</Badge>
```

### Auto-load exception

Unlike regular video embeds that use click-to-play, `LivestreamMedia` items auto-load the iframe because live content is time-sensitive. The `EmbedPlayer` component accepts a `autoLoad` prop:

```tsx
<EmbedPlayer embedUrl={liveMedia.embedUrl} autoLoad={true} />
```

### Stream end transition

When a `LivestreamMedia` item transitions to a `VideoMedia` (via WebSocket subscription event or page refresh), the `LiveStreamSection` disappears and the item moves into the regular gallery grid as a video embed. No special transition animation needed -- the next render simply won't find a `LivestreamMedia` item. The `__typename` change is the signal.

### Detection

The live item is identified by filtering the media edges using `__typename`:

```ts
const liveMedia = media.find(
  (edge) => edge.node.__typename === "LivestreamMedia",
);
```

If multiple `LivestreamMedia` items exist (shouldn't per requirements, but defensively), take the most recently created one.

## 10. Pagination

Follows the existing "Load More" button pattern used by the current `GameMediaGallery`.

- **Direction**: Top-down (newest first). Backend sorts **DESC** by id. Client uses `first`/`after`. The frontend does **not** specify a sort direction -- it relies on the backend default.
- **Page size**: 12 items per page (consistent with current implementation).
- **Load more**: Button at bottom of gallery grid, disabled while loading, shows spinner.
- **Server action**: `loadGameMedia(gameId, 12, endCursor)` -- same pattern, updated to return `GameMediaNode[]` instead of `Resource[]`.

The `LivestreamMedia` item is always fetched as part of the initial page load (included in the first page of media). It is filtered out of the grid and rendered separately in `LiveStreamSection`.

**Media count correction**: When a livestream exists, the grid media count must exclude it. The media count badge and grid rendering use only the filtered list:

```ts
const gridMedia = media.filter((e) => e.node.__typename !== "LivestreamMedia");
const mediaCount = gridMedia.length + uploadingFiles.size;
```

This prevents the count badge from being 1 higher than the number of visible grid items.

## 11. Empty State

When no media exists and the user can contribute, use the existing `Empty` component from `src/components/ui/empty.tsx` for consistency with the design system:

```tsx
<Empty>
  <EmptyHeader>
    <EmptyMedia variant="icon"><Camera /></EmptyMedia>
    <EmptyTitle>{t("media.emptyTitle")}</EmptyTitle>
    <EmptyDescription>{t("media.emptyUploadPrompt")}</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>
    <div className="flex gap-2">
      <Button>{t("media.uploadPhoto")}</Button>
      <Button variant="outline">{t("media.addLink")}</Button>
    </div>
  </EmptyContent>
</Empty>
```

When no media exists and the user cannot contribute (viewer / unauthenticated):

The entire media section is hidden (consistent with current behavior where `isEmpty && !canContribute` returns `null`).

## 12. i18n

New translation keys added under `game.media`:

Note: The existing `game.media.empty` and `game.media.emptyParticipant` keys should be verified for usage elsewhere before removal.

```json
{
  "game": {
    "media": {
      "title": "Media",
      "loadMore": "Load More",
      "uploadPhoto": "Upload",
      "addLink": "Add Link",
      "linkAdded": "Link added",
      "emptyTitle": "No media yet",
      "emptyUploadPrompt": "Upload photos or add a link to get started.",
      "live": "LIVE",
      "playVideo": "Play {title}",
      "openInProvider": "Open in {provider}",
      "opensInNewTab": "(opens in new tab)",
      "privacyDisclosure": "Loading this video will share data with {provider}.",
      "authRequiredNote": "Viewers may need to sign in to {provider} to watch this video.",
      "rateLimitCleared": "You can now add links again.",
      "addLinkDialog": {
        "title": "Add a Link",
        "urlLabel": "URL",
        "urlPlaceholder": "Paste a YouTube, Hudl, or any URL",
        "invalidUrl": "Please enter a valid URL",
        "resolve": "Preview",
        "resolving": "Resolving link...",
        "confirm": "Add",
        "adding": "Adding...",
        "cancel": "Cancel",
        "previewTitle": "Preview",
        "rateLimitCountdown": "Try again in {seconds}s"
      },
      "delete": {
        "title": "Delete Media",
        "description": "Are you sure you want to delete this media? This action cannot be undone.",
        "confirm": "Delete",
        "cancel": "Cancel",
        "noPermission": "You don't have permission to delete this media."
      },
      "success": "Media uploaded",
      "deleted": "Media deleted",
      "errors": {
        "uploadFailed": "Failed to upload {filename}",
        "saveFailed": "Failed to save {filename}",
        "deleteFailed": "Failed to delete media",
        "fileTooLarge": "File must be less than {limit}",
        "invalidType": "Please select an image or video file",
        "duplicateLink": "This link has already been added to this game.",
        "invalidScheme": "Please use an https:// URL",
        "urlCannotBeAccessed": "This URL cannot be added. Please check the URL and try a different one.",
        "urlTimeout": "The URL took too long to respond. Please try again.",
        "urlUnreachable": "Could not reach this URL. Please check it and try again.",
        "unsupportedFormat": "This URL format is not supported.",
        "rateLimited": "Too many links added recently. Try again in {seconds} seconds.",
        "gameNotFound": "Game not found.",
        "gameNotInProgress": "This game is no longer accepting media."
      }
    }
  }
}
```

## 13. CSP Configuration

Content Security Policy `frame-src` directives for trusted embed domains. There are no existing CSP headers in `next.config.ts`, so this adds the full `headers()` configuration:

```ts
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
```

The `frame-src` directive uses space-separated origins within a single directive. This enforces the embed domain allowlist at the browser level, complementing the client-side `isEmbeddable()` check.

## 14. Type Definitions

### Response types (from server)

```ts
// src/lib/types/game-media.ts

/**
 * MediaType is used ONLY for ResolveUrlResponse preview.
 * For persisted entities, use __typename discrimination.
 */
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

/** Base fields shared by all GameMedia concrete types */
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

/** An uploaded or externally-sourced image */
export interface ImageMediaNode extends GameMediaBase {
  __typename: "ImageMedia";
}

/** An uploaded or externally-sourced video */
export interface VideoMediaNode extends GameMediaBase {
  __typename: "VideoMedia";
  description: string | null;
  embedUrl: string | null;
  embedWidth: number | null;
  embedHeight: number | null;
}

/** A live stream (always live by definition) */
export interface LivestreamMediaNode extends GameMediaBase {
  __typename: "LivestreamMedia";
  description: string | null;
  embedUrl: string;
  embedWidth: number | null;
  embedHeight: number | null;
}

/** A rich link preview */
export interface LinkMediaNode extends GameMediaBase {
  __typename: "LinkMedia";
  description: string | null;
}

/**
 * Discriminated union of all GameMedia concrete types.
 * Use __typename to narrow:
 *   if (node.__typename === "VideoMedia") { node.embedUrl ... }
 */
export type GameMediaNode =
  | ImageMediaNode
  | VideoMediaNode
  | LivestreamMediaNode
  | LinkMediaNode;

/** Preview returned by resolveUrl query */
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
```

### Server action result types

```ts
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

### Updated GameDetail type

```ts
// In src/lib/types/game.ts, update GameDetail.media:

export interface GameDetail {
  // ... existing fields ...
  media: {
    edges: Edge<GameMediaNode>[];
    pageInfo: PageInfo;
  };
}
```

## 15. Testing Strategy

### Vitest unit tests

| Component | Test file | What to test |
|---|---|---|
| `isEmbeddable()` | `__tests__/lib/embed-config.test.ts` | Allowlist matching, invalid URLs, edge cases |
| `GameMediaItem` | `__tests__/components/game/game-media-item.test.tsx` | Renders correct sub-component for each `__typename` + source combo |
| `EmbedPlayer` | `__tests__/components/game/embed-player.test.tsx` | Click-to-play behavior, auto-load for LivestreamMedia, sandbox attributes |
| `LinkCardMediaItem` | `__tests__/components/game/link-card-media-item.test.tsx` | Renders thumbnail, title, description, opens URL in new tab |
| `LiveStreamSection` | `__tests__/components/game/live-stream-section.test.tsx` | Renders when `LivestreamMedia` item exists, hidden when none exists |
| `AddLinkDialog` | `__tests__/components/game/add-link-dialog.test.tsx` | URL validation, resolve flow, error display, confirm/cancel, rate limit countdown timer |
| `GameMediaGallery` | `__tests__/components/game/game-media-gallery.test.tsx` | Mixed content rendering, load more, empty state, permission gating |

### Playwright integration tests

| Flow | Test file | What to test |
|---|---|---|
| Upload photo | `tests/pages/game-media-upload.spec.ts` | File selection, upload progress, confirm, media appears in gallery |
| Add link | `tests/pages/game-media-add-link.spec.ts` | Paste URL, preview renders, confirm, media appears in gallery |
| Add link (duplicate) | same file | Paste existing URL, duplicate error shown |
| Add link (rate limit) | same file | Trigger rate limit, button disabled with countdown timer, re-enables after timer |
| Delete media | `tests/pages/game-media-delete.spec.ts` | Delete own media, delete as editor, confirm dialog |
| Gallery pagination | `tests/pages/game-media-gallery.spec.ts` | Load more button, new items appended |
| Livestream display | `tests/pages/game-media-livestream.spec.ts` | `LivestreamMedia` item pinned above grid, LIVE badge, auto-load iframe |
| Unauthenticated view | `tests/pages/game-media-public.spec.ts` | PUBLIC game shows gallery, no controls |
| Blocked user filtering | `tests/pages/game-media-blocked.spec.ts` | Media from blocked users does not appear in the gallery |

All Playwright tests use MSW to mock GraphQL responses via `withMeGuard()` and the `graphql-handlers.ts` fixture pattern.

## File Changes Summary

### New files

| File | Purpose |
|---|---|
| `src/lib/types/game-media.ts` | TypeScript types for GameMedia (discriminated union with `__typename`), including `UrlResolutionErrorCode` |
| `src/lib/embed-config.ts` | Trusted embed domain allowlist and `isEmbeddable()` |
| `src/components/game/game-media-section.tsx` | Top-level orchestrator (live section + gallery + controls) |
| `src/components/game/live-stream-section.tsx` | Pinned live stream player |
| `src/components/game/embed-player.tsx` | Sandboxed iframe with click-to-play |
| `src/components/game/link-card-media-item.tsx` | Rich preview card for LinkMedia type |
| `src/components/game/add-link-dialog.tsx` | Two-phase add link dialog with rate limit countdown timer |
| `src/app/[locale]/game/media-actions.ts` | Server actions: resolveUrl (query), addGameMediaLink, deleteGameMedia |

### Modified files

| File | Changes |
|---|---|
| `src/app/[locale]/game/[id]/page.tsx` | Update media query to use `gameMediaFragment` (with `__typename` + inline fragments), update `canContribute` logic to check `isParticipant \|\| viewerGameRole != null`, pass `currentUserId` and `gameVisibility`, remove auth redirect for PUBLIC games |
| `src/components/game/live/game-detail-client.tsx` | Replace `GameMediaGallery` with `GameMediaSection`, pass `viewerGameRole`, `currentUserId`, `isParticipant`, and `gameVisibility` |
| `src/components/game/game-media-gallery.tsx` | Refactor to use `GameMediaNode` (discriminated union) instead of `Resource`, add "Add Link" button, update delete to use `deleteGameMedia`, filter livestream from grid count |
| `src/components/game/game-media-item.tsx` | Refactor to dispatch to type-specific renderers based on `__typename` instead of `type` enum |
| `src/components/game/game-media-upload-placeholder.tsx` | Update to receive `GameMediaNode` (not `Resource`) on confirm success |
| `src/components/game/delete-media-dialog.tsx` | Add authorization error handling (toast for Cerbos denial from `response.errors`) |
| `src/app/[locale]/upload/actions.ts` | Update `confirmUpload` to handle `ConfirmGameMediaUploadResponse`, update `ConfirmUploadResult` to discriminated union with `kind` field |
| `src/app/[locale]/game/actions.ts` | Update `loadGameMedia` to return `GameMediaNode[]` |
| `src/lib/graphql-fragments.ts` | Add `gameMediaFragment` (with `__typename`, inline fragments for type-specific fields) |
| `src/lib/types/game.ts` | Update `GameDetail.media` type from `Resource` to `GameMediaNode` |
| `messages/en.json` | Add new translation keys under `game.media` (including `errorCode`-specific messages) |
| `next.config.ts` | Add `headers()` configuration with CSP `frame-src` directive for embed domains |
