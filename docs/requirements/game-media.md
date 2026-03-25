# Game Media — Product Requirements

## Overview

Evolve the existing game media gallery from a simple photo/video upload feature into a unified content hub that supports direct uploads, external video embeds, livestreams, and rich link previews. The gallery should serve both casual pickup games (friends sharing phone photos and clips) and structured intramural leagues (automated game recordings, league photographer albums, livestreams, film links).

## Core Concept

Every piece of content associated with a game — whether it's a phone photo, a YouTube livestream, a Hudl film link, or a league recap article — is a **GameMedia** item. The gallery renders each item based on its type and source. One model, one gallery, many content sources.

## Media Types

| Type | What it is | How it renders |
|------|-----------|----------------|
| `IMAGE` | Photo or screenshot | Direct render in gallery grid |
| `VIDEO` | Recorded video (uploaded or external) | Video player — native for uploads, embedded iframe for external providers |
| `LIVESTREAM` | Real-time video stream | Embedded player with live indicator, pinned above the gallery while active. When the stream ends, the `type` transitions to `VIDEO` and `status` to `ACTIVE`, making it a regular video in the gallery. |
| `LINK` | External resource (article, stats page, social post) | Rich preview card with thumbnail, title, and description |

## Media Sources

| Source | Provider | Expected content types | Embed method |
|--------|----------|----------------------|--------------|
| `UPLOAD` | Self-hosted (S3) | Image, Video | Direct render / native player |
| `YOUTUBE` | YouTube | Video, Livestream | Sandboxed iframe via `youtube-nocookie.com` |
| `TWITCH` | Twitch | Livestream, Video (VOD) | Sandboxed iframe |
| `HUDL` | Hudl | Video (game film) | Link card with thumbnail (Hudl content is often auth-gated; see "Auth-Required Content" below) |
| `VIMEO` | Vimeo | Video | Sandboxed iframe (oEmbed) |
| `TIKTOK` | TikTok | Video | Sandboxed iframe (oEmbed) |
| `INSTAGRAM` | Instagram | Image, Video | Sandboxed iframe (oEmbed; requires Facebook App Token) |
| `CUSTOM_URL` | Any website | Link | Rich preview card via Open Graph / meta tag extraction. Never rendered as an iframe. |

New sources can be added over time by adding an enum value and an embed resolver. No structural changes needed.

## Data Model (Suggested)

### GameMedia Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | ID | Unique identifier |
| `game` | Game | The game this media belongs to |
| `type` | MediaType | `IMAGE`, `VIDEO`, `LIVESTREAM`, `LINK` |
| `source` | MediaSource | `UPLOAD`, `YOUTUBE`, `TWITCH`, `HUDL`, `VIMEO`, `TIKTOK`, `INSTAGRAM`, `CUSTOM_URL` |
| `status` | MediaStatus | `ACTIVE` (default), `LIVE` (livestream in progress) |
| `url` | String | Content URL — S3 URL for uploads, external URL for everything else |
| `embedUrl` | String? | The iframe `src` URL extracted from the oEmbed response. Only the URL is stored — never raw HTML. |
| `embedWidth` | Int? | Embed width from oEmbed response |
| `embedHeight` | Int? | Embed height from oEmbed response |
| `thumbnailUrl` | String? | Gallery thumbnail — auto-generated for uploads, fetched via oEmbed for external |
| `title` | String? | Display name — auto-populated from oEmbed/meta tags for external, optional for uploads |
| `description` | String? | Auto-populated from oEmbed/meta tags for external links |
| `addedBy` | User | Who contributed this media |
| `createdAt` | DateTime | When it was added |
| `updatedAt` | DateTime | When it was last modified (e.g., livestream status transition) |
| `resource` | Resource? | Reference to the existing Resource entity for `UPLOAD` source items. `null` for external sources. This preserves compatibility with the current file storage system. |

**Note on `embedHtml`**: Raw HTML from oEmbed responses is intentionally NOT stored. Only the extracted `embedUrl` is persisted. The frontend constructs sandboxed iframes using the `embedUrl` and an allowlist of trusted provider domains. This eliminates stored XSS risk from malicious or compromised oEmbed endpoints.

### Enums

```
enum MediaType { IMAGE, VIDEO, LIVESTREAM, LINK }
enum MediaSource { UPLOAD, YOUTUBE, TWITCH, HUDL, VIMEO, TIKTOK, INSTAGRAM, CUSTOM_URL }
enum MediaStatus { ACTIVE, LIVE }
```

**Note**: `ENDED` is not a status. When a livestream ends, the item transitions from `type: LIVESTREAM, status: LIVE` to `type: VIDEO, status: ACTIVE`. This avoids ambiguity — ended livestreams ARE videos, not a special third state.

### Relationship with Existing `Resource` Type

The current backend uses a `Resource` type (with `ImageResource` and `FileResource` subtypes) for uploaded files. The `GameMedia` entity wraps `Resource` for uploads via a `resource` field — it does not replace it. This means:

- Existing upload/confirm/delete flows continue to work against `Resource`
- `GameMedia` adds the metadata layer (type, source, title, etc.) on top
- External sources (links, embeds) have `resource: null`
- The `game.media` connection return type changes from `Resource` to `GameMedia`, which is a breaking change for existing queries. All frontend media components will need to be updated.

## User Flows

### Adding Content: Direct Upload (existing flow, enhanced)

1. User taps "Upload" on the media gallery
2. Selects one or more files (images or videos)
3. Files are validated (type, size) and uploaded to S3
4. GameMedia items are created with `type: IMAGE` or `VIDEO`, `source: UPLOAD`, `status: ACTIVE`, `resource` pointing to the uploaded `Resource`

**Enhancement for v2**: Bulk upload with progress indicators for league photographers dumping many photos at once.

### Adding Content: Paste a Link

1. User taps "Add Link" on the media gallery
2. Pastes a URL into an input field
3. Backend resolves the URL (see "URL Resolution Service" below):
   - Follow redirects (up to 3) to resolve shorteners (`youtu.be`, `bit.ly`, `t.co`) to the final URL
   - Check the final URL's domain against known providers (youtube.com → `YOUTUBE`, hudl.com → `HUDL`, etc.)
   - Fetch oEmbed data if the provider supports it (title, thumbnail, embed URL + dimensions)
   - Fall back to Open Graph / meta tag extraction for unknown URLs (title, description, image)
   - Auto-detect type: video providers → `VIDEO`, unknown → `LINK`
4. **Duplicate check**: If the resolved URL already exists as a GameMedia item in the same game, return an error: "This link has already been added to this game" with a reference to the existing item.
5. Preview is shown to the user (thumbnail, title, description) for confirmation
6. User confirms → GameMedia item is created

**URL resolution examples:**

| Pasted URL | Resolved as |
|-----------|-------------|
| `https://youtube.com/watch?v=abc` | `type: VIDEO, source: YOUTUBE` |
| `https://youtu.be/abc` | Redirect resolved → `type: VIDEO, source: YOUTUBE` |
| `https://bit.ly/xyz` | Redirect resolved → detected based on final URL domain |
| `https://youtube.com/live/abc` | `type: LIVESTREAM, source: YOUTUBE` (if currently live) or `type: VIDEO` (if VOD) |
| `https://www.hudl.com/video/3/abc/123` | `type: VIDEO, source: HUDL` |
| `https://vimeo.com/123456` | `type: VIDEO, source: VIMEO` |
| `https://www.tiktok.com/@user/video/123` | `type: VIDEO, source: TIKTOK` |
| `https://www.instagram.com/reel/abc` | `type: VIDEO, source: INSTAGRAM` |
| `https://leaguesite.com/recap/week-5` | `type: LINK, source: CUSTOM_URL` |

**Rate limiting**: Max 10 link submissions per game per user per hour. Max 30 per user per day across all games. Each submission triggers a server-side fetch, so rate limiting prevents abuse of the URL resolution service.

### Adding Content: Start a Livestream

1. User taps "Go Live" on the game detail page (mobile app only for v1 — the web client does not show a "Go Live" button)
2. Mobile app handles YouTube OAuth, broadcast creation, and RTMP streaming
3. Mobile app calls a mutation to create a GameMedia item with `type: LIVESTREAM, source: YOUTUBE, status: LIVE`, including the YouTube broadcast URL and embed URL
4. The web client detects the LIVE media item and pins the YouTube embed above the gallery
5. Mobile app sends a heartbeat mutation at least every 60 seconds while streaming
6. When the stream ends, the mobile app calls a mutation to transition the item to `type: VIDEO, status: ACTIVE`
7. The item becomes a regular video in the gallery (YouTube VOD is automatically available)

**Orphan protection**: If no heartbeat is received within 3 minutes, the backend auto-transitions the item to `type: VIDEO, status: ACTIVE`. Additionally, any `LIVE` items older than 4 hours are auto-transitioned regardless of heartbeat. When a game transitions to COMPLETE, any remaining LIVE items are also auto-transitioned.

### Viewing Content

The gallery renders items based on type. **All external video embeds use a click-to-play pattern by default**: the gallery shows a static thumbnail with a play button overlay and provider icon. The iframe loads only when the user clicks. This prevents performance issues from loading many iframes simultaneously.

- **Images**: Thumbnail grid. Click to open full-size lightbox.
- **Videos (uploaded)**: Thumbnail with play button overlay. Click to play in an inline player or lightbox.
- **Videos (external)**: Thumbnail with provider icon overlay (YouTube, Hudl, etc.). Click loads the sandboxed iframe embed.
- **Livestreams (LIVE)**: Pinned above the gallery grid in a prominent card with a "LIVE" badge. The iframe auto-loads (exception to the click-to-play rule since live content is time-sensitive). Only one livestream can be pinned at a time (if multiple, most recent takes priority).
- **Links**: Rich preview card with thumbnail, title, and description. Click opens the URL in a new tab.

**Auth-required content**: Some providers (notably Hudl) require the viewer to be authenticated on the provider's platform. If an embed fails to load, the gallery should fall back to a link card with the cached thumbnail, title, and an "Open in [Provider]" button. The "Add Link" preview step should display a note: "Viewers may need to sign in to [Provider] to watch this video."

### Deleting Content

- The user who added the media item can delete it
- Game organizers/editors can delete any media item in the game
- Deleting an uploaded file also removes the associated `Resource` and S3 object
- Deleting an external link/video just removes the GameMedia record (the external content is unaffected)

## Gallery Layout

### Sections (top to bottom)

1. **Live section** (conditional): Only visible when a LIVE stream exists. Prominent embedded player with live indicator. Collapses when no active stream.
2. **Content grid**: All other media in reverse chronological order. Mixed content types in a responsive grid — images, video thumbnails, and link cards all coexist.
3. **Add content controls**: "Upload" button + "Add Link" button. Visible only to participants and editors when the game is IN_PROGRESS or COMPLETE. No "Go Live" button on web (mobile only for v1).

### Pagination

Infinite scroll or "Load more", consistent with current behavior.

### Empty State

"No media yet. Upload photos or add a link to get started." with Upload and Add Link buttons.

## Permissions

| Action | Who can do it |
|--------|---------------|
| View media | Anyone who can view the game (respects game visibility) |
| Upload files | Game participants and editors (`viewerGameRole != null`), when game is IN_PROGRESS or COMPLETE |
| Add links | Game participants and editors (`viewerGameRole != null`), when game is IN_PROGRESS or COMPLETE |
| Start livestream | Game participants, when game is IN_PROGRESS (mobile only for v1) |
| Delete own media | The user who added it |
| Delete any media | Game organizer and editors |

**Note**: The current upload permission logic only checks participant status, not editor role. Editors who are not participants (e.g., a league photographer granted editor access) should also be able to upload and add links.

## Privacy Considerations

### Third-Party Embeds and Viewer Data

When an iframe embed loads (YouTube, Vimeo, TikTok, etc.), the viewer's browser makes direct requests to the third-party provider, sending their IP address, cookies, and browser fingerprint. This has privacy implications:

- **YouTube**: Embeds must use `youtube-nocookie.com` instead of `youtube.com` to reduce tracking.
- **PRIVATE games**: Use a **click-to-load** pattern for all external embeds (not just videos). The gallery shows only the cached thumbnail and provider attribution. The iframe loads only when the user explicitly clicks, with a disclosure: "Loading this video will share data with [Provider]."
- **PUBLIC games**: Click-to-play is the default for performance reasons (see "Viewing Content"), which also serves as a privacy benefit.

This behavior should be documented in the app's privacy policy.

## Security Requirements

### URL Resolution — SSRF Prevention

The URL resolution service fetches arbitrary user-supplied URLs server-side. This creates a Server-Side Request Forgery (SSRF) risk. The backend must implement:

- **Scheme restriction**: Only allow `https://` URLs. Reject `http://`, `file://`, `ftp://`, `gopher://`, and all other schemes.
- **Private IP blocking**: After DNS resolution, reject any URL that resolves to a private/reserved IP range (RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`; link-local: `169.254.0.0/16`; loopback: `127.0.0.0/8`; IPv6 equivalents).
- **Redirect limits**: Follow a maximum of 3 redirects. Perform private IP checks on each redirect destination.
- **Timeout**: 5 second maximum for the entire resolution chain (DNS + HTTP).
- **Known provider allowlist**: For oEmbed fetches, only query oEmbed endpoints for known providers (YouTube, Vimeo, TikTok, Instagram). Do not blindly discover oEmbed endpoints via `<link>` tags in arbitrary HTML.
- **Open Graph fallback**: For `CUSTOM_URL`, fetch only the HTML `<head>` (stop reading after `</head>` or 100KB, whichever comes first) to extract meta tags. Do not fetch the full page body.

### Embed Rendering — XSS Prevention

- **Never render raw HTML** from oEmbed responses. The `embedHtml` field does not exist in the data model.
- The backend extracts only the `embedUrl` (iframe `src`), `embedWidth`, and `embedHeight` from oEmbed responses.
- The frontend constructs iframes using a **hardcoded template** with `sandbox="allow-scripts allow-same-origin"` and the `embedUrl` as `src`.
- The iframe `src` domain must match a **frontend allowlist** of trusted embed domains: `youtube-nocookie.com`, `player.vimeo.com`, `www.tiktok.com`, `player.twitch.tv`, `www.instagram.com`, etc. If the domain is not in the allowlist, fall back to a link card (never render an iframe).
- `CUSTOM_URL` / `LINK` items are rendered as rich preview cards using only text and images extracted from Open Graph meta tags — never as iframes.
- A Content Security Policy with explicit `frame-src` directives should be configured to enforce the embed domain allowlist at the browser level.

## Interaction with Existing Features

### Current Media Gallery

The existing upload flow continues to work. The `GameMedia` model wraps the existing `Resource` type for uploads. The gallery component is extended to render additional content types (embeds, link cards) alongside existing uploads.

The `game.media` connection return type changes from `Resource` to `GameMedia`. This is a breaking change — all existing media components and queries will need to be updated to use the new type. Existing `Resource` data is migrated to `GameMedia` with `type: IMAGE` or `VIDEO`, `source: UPLOAD`, `status: ACTIVE`.

### Unauthenticated Access

Per the landing page requirements: unauthenticated users can view the media gallery (read-only) on PUBLIC games. They see all content types (images, videos, embeds, links) but cannot upload, add links, or interact with add controls.

### Game Invitations

No direct interaction. Media is tied to the game, not to invitations.

## Backend Requirements

### URL Resolution Service

When a user submits a URL, the backend needs to:

1. Validate the URL (scheme, SSRF checks — see "Security Requirements")
2. Follow redirects (up to 3) to resolve shorteners to the final URL
3. Check for duplicate: if the resolved URL already exists for this game, return `DuplicateMediaError`
4. Identify the provider from the final URL's domain
5. For known providers: fetch oEmbed data and extract `embedUrl`, dimensions, `title`, `thumbnailUrl`
6. For unknown URLs: fetch HTML `<head>` and extract Open Graph meta tags (`og:title`, `og:description`, `og:image`)
7. Return: `type`, `source`, `title`, `description`, `thumbnailUrl`, `embedUrl`, `embedWidth`, `embedHeight`

This can be a dedicated endpoint or part of the "add media" mutation (resolve + create in one call). The resolution should happen server-side to avoid CORS issues and to cache oEmbed responses.

### oEmbed Endpoints

| Provider | Endpoint | Auth required |
|----------|----------|---------------|
| YouTube | `https://www.youtube.com/oembed?url=...` | No |
| Vimeo | `https://vimeo.com/api/oembed.json?url=...` | No |
| TikTok | `https://www.tiktok.com/oembed?url=...` | No |
| Instagram | `https://graph.facebook.com/v18.0/instagram_oembed?url=...` | Yes — requires Facebook App Access Token |

For providers without oEmbed (Hudl, generic URLs), fall back to Open Graph meta tag extraction.

### Livestream Management

- Mutation to create a LIVE media item (called by mobile app when stream starts)
- Heartbeat mutation (called by mobile app every 60 seconds while streaming)
- Mutation to end a livestream: transitions `type: LIVESTREAM → VIDEO`, `status: LIVE → ACTIVE`
- **Auto-transition**: If no heartbeat received within 3 minutes, auto-transition to VIDEO/ACTIVE
- **Max duration**: LIVE items older than 4 hours auto-transition regardless of heartbeat
- **Game completion**: When a game transitions to COMPLETE, any remaining LIVE items auto-transition

### Migration

Existing `Resource` items in the `game.media` connection should be migrated to `GameMedia` entries:
- `ImageResource` → `type: IMAGE, source: UPLOAD, status: ACTIVE, resource: <existing Resource>`
- `FileResource` (video) → `type: VIDEO, source: UPLOAD, status: ACTIVE, resource: <existing Resource>`

The `game.media` connection return type changes from `Connection<Resource>` to `Connection<GameMedia>`. This is a breaking schema change for existing clients.

## Out of Scope (v1)

- Broadcasting from the web client (mobile only for v1)
- Multiple simultaneous livestreams per game (one at a time for simplicity)
- Media albums or folders (flat chronological gallery for now)
- Comments or reactions on individual media items
- Media tagging (tag players in photos)
- Automatic highlight detection / clip generation
- Media from non-game contexts (e.g., team photos, league branding)
- Download / export functionality
- Watermarking
- "Mute link submissions from this user" (use block for now)
