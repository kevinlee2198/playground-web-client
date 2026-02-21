# File Upload Feature -- Technical Design

## 1. Architecture Overview

The file upload feature spans three domains (profile picture, game media, chat media) but shares a common upload pipeline. The design introduces a **shared upload utility layer** consumed by domain-specific components. All upload mutations go through server actions (for `authMutate`), while the actual S3 PUT is a direct client-side `fetch` (since the client must stream file bytes to S3, this cannot be a server action).

### Key Architectural Decision: Hybrid Server Action + Client Upload

The two-phase upload flow requires a split:

1. **Phase 1 (requestUpload)** and **Phase 3 (confirmUpload / deleteResource)**: Server actions using `authMutate`. These are thin wrappers that call GraphQL mutations.
2. **Phase 2 (S3 PUT)**: Client-side `fetch` using the presigned URL. This must happen in the browser because the file bytes live on the client. Using `XMLHttpRequest` or `fetch` with the presigned URL is a standard pattern and does not need authentication headers (the URL itself is the credential).

This means all three upload contexts are **client components** at the interactive layer, with server actions for GraphQL calls.

---

## 2. Shared Upload Infrastructure

### 2.1 File Validation Utilities

**File:** `src/lib/upload-validation.ts`

Pure functions, no `"use client"` directive needed (importable from both server and client).

```typescript
/** Supported upload context types */
export type UploadContext = "profilePicture" | "gameMedia" | "chatMedia";

/** MIME types allowed for image uploads */
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

/** MIME types allowed for video uploads */
export const VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

/** All media MIME types (images + videos) */
export const MEDIA_MIME_TYPES = [...IMAGE_MIME_TYPES, ...VIDEO_MIME_TYPES] as const;

/** File size limits in bytes */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB

export type ImageMimeType = (typeof IMAGE_MIME_TYPES)[number];
export type VideoMimeType = (typeof VIDEO_MIME_TYPES)[number];
export type MediaMimeType = (typeof MEDIA_MIME_TYPES)[number];

export interface FileValidationResult {
  valid: boolean;
  error?: "invalidType" | "fileTooLarge";
}

/** Returns the `accept` attribute value for file inputs */
export function getAcceptAttribute(context: UploadContext): string {
  if (context === "profilePicture") {
    return IMAGE_MIME_TYPES.join(",");
  }
  return MEDIA_MIME_TYPES.join(",");
}

export function isImageMimeType(mimeType: string): mimeType is ImageMimeType {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function isVideoMimeType(mimeType: string): mimeType is VideoMimeType {
  return (VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
}

/** Validate a file against the rules for a given upload context */
export function validateFile(
  file: File,
  context: UploadContext,
): FileValidationResult {
  const allowedTypes =
    context === "profilePicture" ? IMAGE_MIME_TYPES : MEDIA_MIME_TYPES;

  if (!(allowedTypes as readonly string[]).includes(file.type)) {
    return { valid: false, error: "invalidType" };
  }

  const maxSize = isVideoMimeType(file.type) ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    return { valid: false, error: "fileTooLarge" };
  }

  return { valid: true };
}

/** Format bytes to a human-readable string (e.g., "10 MB") */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Return the human-readable max file size string for error messages */
export function getMaxSizeLabel(mimeType: string): string {
  return isVideoMimeType(mimeType) ? "100 MB" : "10 MB";
}
```

### 2.2 Upload Server Actions

**File:** `src/app/[locale]/upload/actions.ts`

```typescript
"use server";

import { resourceFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";

interface RequestUploadResult {
  success: boolean;
  uploadUrl?: string | null;
  resourceId?: string;
  error?: string;
}

interface ConfirmUploadResult {
  success: boolean;
  resource?: Resource; // from @/lib/types/resource
  error?: string;
}

interface DeleteResourceResult {
  success: boolean;
  error?: string;
}

// ---- requestUpload variants ----

export async function requestProfilePictureUpload(
  filename: string,
  mimeType: string,
  size: number,
): Promise<RequestUploadResult> {
  try {
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: {
            filename,
            mimeType,
            size,
            context: {
              userProfilePicture: { placeholder: true },
            },
          },
        },
        uploadUrl: true,
        resourceId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      uploadUrl: response.data.requestUpload.uploadUrl,
      resourceId: response.data.requestUpload.resourceId,
    };
  } catch {
    return { success: false, error: "Failed to request upload" };
  }
}

export async function requestGameMediaUpload(
  filename: string,
  mimeType: string,
  size: number,
  gameId: number,
): Promise<RequestUploadResult> {
  try {
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: {
            filename,
            mimeType,
            size,
            context: {
              gameMedia: { gameId },
            },
          },
        },
        uploadUrl: true,
        resourceId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      uploadUrl: response.data.requestUpload.uploadUrl,
      resourceId: response.data.requestUpload.resourceId,
    };
  } catch {
    return { success: false, error: "Failed to request upload" };
  }
}

export async function requestChatMediaUpload(
  filename: string,
  mimeType: string,
  size: number,
  chatRoomId: string,
): Promise<RequestUploadResult> {
  try {
    const response = await authMutate({
      requestUpload: {
        __args: {
          input: {
            filename,
            mimeType,
            size,
            context: {
              chatMedia: { chatRoomId },
            },
          },
        },
        uploadUrl: true,
        resourceId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      uploadUrl: response.data.requestUpload.uploadUrl,
      resourceId: response.data.requestUpload.resourceId,
    };
  } catch {
    return { success: false, error: "Failed to request upload" };
  }
}

// ---- confirmUpload ----

export async function confirmUpload(
  resourceId: string,
): Promise<ConfirmUploadResult> {
  try {
    const response = await authMutate({
      confirmUpload: {
        __args: { input: { resourceId } },
        resource: resourceFragment,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      resource: response.data.confirmUpload.resource,
    };
  } catch {
    return { success: false, error: "Failed to confirm upload" };
  }
}

// ---- deleteResource ----

export async function deleteResource(
  resourceId: string,
): Promise<DeleteResourceResult> {
  try {
    const response = await authMutate({
      deleteResource: {
        __args: { input: { resourceId } },
        id: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to delete resource" };
  }
}
```

### 2.3 S3 Upload Utility (Client-Side)

**File:** `src/lib/s3-upload.ts`

```typescript
/**
 * Upload a file directly to S3 via a presigned PUT URL.
 * This runs client-side since file bytes are in the browser.
 */
export async function uploadToS3(
  file: File,
  uploadUrl: string,
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      return { success: false };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}
```

### 2.4 sendMediaChatMessage Server Action

**File:** Added to `src/app/[locale]/chat/actions.ts`

```typescript
export async function sendMediaMessage(
  chatRoomId: string,
  resourceId: string,
): Promise<{ success: boolean; message?: ChatMessageNode; error?: string }> {
  try {
    const response = await authMutate({
      sendChatMessage: {
        __args: {
          input: {
            mediaMessage: {
              chatRoomId,
              resourceId,
            },
          },
        },
        chatMessage: chatMessageNodeSelection,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      message: response.data.sendChatMessage.chatMessage,
    };
  } catch {
    return { success: false, error: "Failed to send message" };
  }
}
```

---

## 3. Profile Picture Upload

### 3.1 Component Hierarchy

```
src/app/[locale]/user/[username]/page.tsx     (Server Component - existing, modified)
  -> src/components/profile/profile-header.tsx (Server Component - existing, modified)
       -> src/components/profile/profile-avatar.tsx (Client Component - NEW)
            -> src/components/profile/profile-picture-menu.tsx (Client Component - NEW)
            -> src/components/profile/profile-picture-preview-dialog.tsx (Client Component - NEW)
            -> src/components/profile/remove-picture-dialog.tsx (Client Component - NEW)
```

### 3.2 ProfileHeader Changes

The existing `ProfileHeader` is a server component. It currently renders the avatar directly. It will be refactored to delegate avatar rendering to a new client component `ProfileAvatar` when `isOwnProfile` is true, while keeping the server component for the non-interactive case (other users' profiles).

**Modified `src/components/profile/profile-header.tsx`:**

- When `isOwnProfile === true`, render `<ProfileAvatar>` (interactive, client component)
- When `isOwnProfile === false`, keep the current static `<Avatar>` rendering (server component, no JS)
- Pass the full `profilePicture` resource (including `id`) to `ProfileAvatar`

### 3.3 ProfileAvatar (Client Component)

**File:** `src/components/profile/profile-avatar.tsx`

```typescript
"use client";

interface ProfileAvatarProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    profilePicture: Resource | null;
  };
}
```

**Behavior:**

- Renders the avatar with a camera/edit overlay button
- Overlay appears on hover (via CSS `group-hover`), on focus (`:focus-within`), and always on touch devices (`@media (pointer: coarse)`)
- The overlay button has `aria-label` from `t("profile.picture.changeLabel")` -- wait, that key is not in the requirements. Use the text "Change profile picture" as a hardcoded aria-label, or add an i18n key. Per requirements, `aria-label="Change profile picture"` is sufficient. Add an i18n key: `"profile.picture.changeLabel": "Change profile picture"`
- Clicking the overlay opens the `ProfilePictureMenu` (a `DropdownMenu`)
- Contains a hidden `<input type="file">` triggered by the "Upload photo" menu item
- Manages local state: `profilePicture` (the current Resource, or null), `selectedFile` (File | null), `previewUrl` (string via `URL.createObjectURL`), `isUploading` (boolean)
- On file selection: validates with `validateFile("profilePicture")`, shows preview dialog
- On preview confirm: runs the full upload pipeline (requestUpload -> S3 PUT -> confirmUpload -> delete old resource if exists)
- On success: updates local `profilePicture` state to the new resource (no full page reload via `router.refresh()` -- use local state)

**CSS for overlay visibility on touch devices:**

```css
/* Tailwind classes */
className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 touch:opacity-100"
```

Note: Tailwind does not have a `touch:` variant by default. Use `@media (pointer: coarse)` via a custom CSS rule or use the `@media (hover: none)` pattern. The simplest approach is to make the overlay always visible on mobile via `[@media(hover:none)]:opacity-100` using Tailwind's arbitrary variant syntax:

```
className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100"
```

### 3.4 ProfilePictureMenu

**File:** `src/components/profile/profile-picture-menu.tsx`

Uses `DropdownMenu` from shadcn/ui. Options:

1. "Upload photo" (always visible) -- triggers hidden file input
2. "Remove photo" (only when `profilePicture !== null`) -- opens remove confirmation dialog

### 3.5 ProfilePicturePreviewDialog

**File:** `src/components/profile/profile-picture-preview-dialog.tsx`

Uses `Dialog` from shadcn/ui. Shows:

- The selected image as a preview (using `URL.createObjectURL(file)`)
- "Upload" and "Cancel" buttons
- Spinner during upload with `aria-live="polite"` status region
- TODO comment for future cropping

```typescript
interface ProfilePicturePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file: File;
  previewUrl: string;
  onConfirm: () => void;
  isUploading: boolean;
}
```

### 3.6 RemovePictureDialog

**File:** `src/components/profile/remove-picture-dialog.tsx`

Uses `AlertDialog` from shadcn/ui. Follows the same pattern as `DeleteGameDialog`.

```typescript
interface RemovePictureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isRemoving: boolean;
}
```

### 3.7 Data Flow -- Profile Picture Upload

```
User clicks overlay -> Menu opens
User clicks "Upload photo" -> File picker opens
User selects file -> Client validates file (validateFile)
  If invalid -> toast error, stop
  If valid -> Preview dialog opens
User clicks "Upload" in preview dialog ->
  1. requestProfilePictureUpload(filename, mimeType, size) [server action]
     If error -> toast error, close dialog
  2. If uploadUrl is not null -> uploadToS3(file, uploadUrl) [client-side fetch]
     If error -> toast error, close dialog
     (uploadUrl is null for LOCAL storage dev environments -- skip S3 step)
  3. confirmUpload(resourceId) [server action]
     If error -> toast error, close dialog
  4. If old profilePicture exists -> deleteResource(oldResourceId) [server action, fire-and-forget]
     If error -> toast warning (non-blocking)
  5. Update local state with new resource
  6. Toast success
  7. Close dialog
```

### 3.8 UserProfilePage Changes

The `me` query in `page.tsx` already fetches `profilePicture: resourceFragment`. The query for the viewed user (`user` query) also already fetches `profilePicture: resourceFragment`. No query changes needed.

However, the page must pass the full resource data (including `id`) to `ProfileHeader`, which it already does.

---

## 4. Game Media Upload

### 4.1 Component Hierarchy

```
src/app/[locale]/game/[id]/page.tsx              (Server Component - existing, modified)
  -> src/components/game/game-media-gallery.tsx   (Client Component - existing, heavily modified)
       -> src/components/game/game-media-item.tsx  (Client Component - NEW)
       -> src/components/game/game-media-upload-placeholder.tsx (Client Component - NEW)
       -> src/components/game/delete-media-dialog.tsx (Client Component - NEW)
```

### 4.2 GameDetailPage Changes

**Modified `src/app/[locale]/game/[id]/page.tsx`:**

- The media gallery section is now **always visible** (remove the conditional `game.media && game.media.edges.length > 0`)
- **Type fix:** Change `GameDetail.media` from optional (`media?:`) to required (`media:`) in `src/lib/types/game.ts` since the query always fetches this field
- Pass `isParticipant` and `canUpload` flags to `GameMediaGallery`
- `isParticipant` is determined by checking if `player.id` appears in any participant's player list
- `canUpload` is `isParticipant && (game.gameStatus === "IN_PROGRESS" || game.gameStatus === "COMPLETE")`

```typescript
// Determine if current player is a participant
const isParticipant = game.participants.edges.some((edge) => {
  const node = edge.node;
  if (node.__typename === "TeamInstance") {
    return node.players.some((p) => p.id === player.id);
  }
  if (node.__typename === "IndividualParticipant") {
    return node.player.id === player.id;
  }
  return false;
});

const canUpload =
  isParticipant &&
  (game.gameStatus === GameStatus.IN_PROGRESS ||
    game.gameStatus === GameStatus.COMPLETE);
```

### 4.3 GameMediaGallery Refactoring

**Modified `src/components/game/game-media-gallery.tsx`:**

New props:

```typescript
interface GameMediaGalleryProps {
  gameId: number;
  initialMedia: Edge<Resource>[];
  initialPageInfo: PageInfo;
  canUpload: boolean;     // show upload button
  isParticipant: boolean; // show delete controls
}
```

**Changes:**

- Always renders (no early return for empty media)
- When empty + `canUpload`: show `EmptyDescription` with "Share photos and videos from this game" + "Add Media" button
- When empty + `!isParticipant`: show `EmptyDescription` with "No media yet"
- "Add Media" button in card header (when `canUpload`)
- Hidden multi-file input (`<input type="file" multiple accept="..." />`)
- Each selected file gets an upload placeholder in the grid
- Track uploading files in state: `uploadingFiles: Map<string, { file: File; status: "uploading" | "error" }>`
- Each completed upload appends to `media` state
- Multi-file: iterate files, run each through the pipeline independently (`Promise.allSettled` is not needed -- process sequentially or use `Promise.all` to run them concurrently)
- **Important: All `uploadingFiles` and `media` state mutations must use the functional updater form** to avoid state corruption from concurrent uploads completing simultaneously (e.g., `setUploadingFiles(prev => { const next = new Map(prev); next.delete(fileId); return next; })`)

**Decision: Concurrent vs Sequential multi-file upload.**

Use concurrent upload with `Promise.allSettled` on each file's pipeline individually. This means all files start uploading at once. Each file's placeholder transitions from "uploading" to "complete" or "error" independently. This provides the fastest total upload time and the requirement explicitly says "Files appear in the gallery as they complete (not all at once)."

### 4.4 GameMediaItem (Client Component)

**File:** `src/components/game/game-media-item.tsx`

Renders a single media item in the gallery grid.

```typescript
interface GameMediaItemProps {
  resource: Resource;
  isParticipant: boolean;
  onDelete: (resourceId: string) => void;
}
```

**For images:**

- Thumbnail in aspect-square container
- Uses `<img>` with explicit `width` and `height` from `ImageResource` (if available) or a fixed aspect ratio container
- `loading="lazy"` attribute
- Click opens full resolution (existing behavior -- open in new tab via `<a>` with `target="_blank"`)
- Delete button on hover/focus (absolute positioned, with `aria-label="Delete media"`)

**For videos (FileResource with video MIME type or future VideoResource):**

Since the GraphQL schema currently only has `ImageResource` and `FileResource`, video files will be typed as `FileResource`. Distinguish by checking `resource.mimeType`:

- Display a thumbnail placeholder with a play button overlay (`<button aria-label="Play video">`)
- The thumbnail is a generic video icon (from lucide `Film` or `Video`)
- Click plays inline using a native `<video>` element with `controls`, `preload="metadata"`, and max height/width constraints
- State toggle: `isPlaying` -- swaps between thumbnail+play button and the `<video>` element
- Delete button same as images

**Touch device handling:**

- Delete button: `touch-action: manipulation` on the gallery item
- The delete button is visible on hover for desktop, always visible on touch (`[@media(hover:none)]:opacity-100`)

### 4.5 GameMediaUploadPlaceholder

**File:** `src/components/game/game-media-upload-placeholder.tsx`

```typescript
interface GameMediaUploadPlaceholderProps {
  filename: string;
  status: "uploading" | "error";
  onDismiss?: () => void; // called when user clicks X on an error placeholder
}
```

- "uploading": skeleton/spinner with `Loader2` animated icon
- "error": error state with a red tint and a dismiss (X) button so the user can remove the failed placeholder from the grid
- Uses `aria-live="polite"` for screen reader announcements
- Respects `prefers-reduced-motion` by using Tailwind's `motion-reduce:animate-none` on the spinner

### 4.6 DeleteMediaDialog

**File:** `src/components/game/delete-media-dialog.tsx`

Uses `AlertDialog`, same pattern as `DeleteGameDialog`.

```typescript
interface DeleteMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}
```

### 4.7 Data Flow -- Game Media Upload

```
User clicks "Add Media" -> multi-file picker opens
User selects files -> Client validates each file
  Invalid files -> toast error per file, skip
  Valid files -> for each file, add uploading placeholder to grid
  For each valid file (concurrently):
    1. requestGameMediaUpload(filename, mimeType, size, gameId) [server action]
       If error -> toast error with filename, mark placeholder as error
    2. If uploadUrl is not null -> uploadToS3(file, uploadUrl) [client-side fetch]
       If error -> toast error with filename, mark placeholder as error
       (uploadUrl is null for LOCAL storage dev environments -- skip S3 step)
    3. confirmUpload(resourceId) [server action]
       If error -> toast error with filename, mark placeholder as error
    4. On success -> remove placeholder, append resource to media state, toast success
```

### 4.8 Data Flow -- Game Media Deletion

```
User clicks delete on a media item -> confirmation dialog opens
User confirms -> deleteResource(resourceId) [server action]
  If error -> toast error
  If success -> remove resource from local media state, toast success
```

---

## 5. Chat Media Upload

### 5.1 Component Hierarchy

```
src/components/chat/conversation-view.tsx   (Client Component - existing, modified)
  -> src/components/chat/message-input.tsx   (Client Component - existing, heavily modified)
       -> src/components/chat/chat-attachment-menu.tsx (Client Component - NEW)
       -> src/components/chat/chat-attachment-preview.tsx (Client Component - NEW)
  -> src/components/chat/message-bubble.tsx  (Client Component - existing, modified for video)
```

### 5.2 MessageInput Changes

**Modified `src/components/chat/message-input.tsx`:**

New interface:

```typescript
interface MessageInputProps {
  onSendText: (content: string, replyToId?: string) => void;
  onSendMedia: (file: File) => Promise<void>;
  replyTo: ChatMessageNode | null;
  onClearReply: () => void;
  disabled?: boolean;
}
```

**Rename `onSend` to `onSendText`** and add `onSendMedia` for the media upload path.

**New state:**

```typescript
const [attachedFile, setAttachedFile] = useState<File | null>(null);
const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
const [attachmentError, setAttachmentError] = useState<string | null>(null);
const [isUploadingMedia, setIsUploadingMedia] = useState(false);
```

**Behavior:**

- A "+" button (`ChatAttachmentMenu`) appears to the left of the textarea
- When a file is attached, the textarea is hidden and replaced by `ChatAttachmentPreview`
- Attaching a file clears any active reply (per requirements)
- Send button sends the media (calls `onSendMedia(file)`)
- Send button is disabled while `isUploadingMedia`
- Cleanup: revoke `URL.createObjectURL` on unmount or file change

### 5.3 ChatAttachmentMenu

**File:** `src/components/chat/chat-attachment-menu.tsx`

Uses `DropdownMenu`. Single option: "Photo / Video" (with `ImageIcon` or `Camera` icon from lucide).

```typescript
interface ChatAttachmentMenuProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}
```

- "+" button with `aria-label="Attach file"` (add i18n key: `"chat.media.attachFile": "Attach file"`)
- Clicking "Photo / Video" triggers a hidden file input
- The file input has `accept` set to `MEDIA_MIME_TYPES.join(",")`

### 5.4 ChatAttachmentPreview

**File:** `src/components/chat/chat-attachment-preview.tsx`

```typescript
interface ChatAttachmentPreviewProps {
  file: File;
  previewUrl: string | null; // null for videos
  error: string | null;
  onRemove: () => void;
}
```

Shows:

- For images: thumbnail preview
- For videos: `Film` icon + filename
- Filename and file size (using `formatFileSize`)
- Remove (X) button with `aria-label="Remove attachment"` (add i18n key: `"chat.media.removeAttachment": "Remove attachment"`)
- Inline error message if validation failed

### 5.5 ConversationView Changes

**Modified `src/components/chat/conversation-view.tsx`:**

Add `handleSendMedia` function:

```typescript
const handleSendMedia = async (file: File) => {
  // 1. Request upload
  const uploadResult = await requestChatMediaUpload(
    file.name,
    file.type,
    file.size,
    roomId,
  );
  if (!uploadResult.success) {
    toast.error(uploadResult.error || t("chat.media.errors.uploadFailed"));
    throw new Error("Request upload failed");
  }

  // 2. Upload to S3 (skip if uploadUrl is null -- LOCAL storage dev environments)
  if (uploadResult.uploadUrl) {
    const s3Result = await uploadToS3(file, uploadResult.uploadUrl);
    if (!s3Result.success) {
      toast.error(t("chat.media.errors.uploadFailed"));
      throw new Error("S3 upload failed");
    }
  }

  // 3. Send media message (auto-confirms resource -- do NOT call confirmUpload)
  const sendResult = await sendMediaMessage(roomId, uploadResult.resourceId!);
  if (!sendResult.success || !sendResult.message) {
    toast.error(sendResult.error || t("chat.errors.sendMessage"));
    throw new Error("Send message failed");
  }

  // 4. Append message to list (same dedup logic as handleSend)
  const newEdge: Edge<ChatMessageNode> = {
    cursor: sendResult.message.id,
    node: sendResult.message,
  };
  setMessages((prev) => {
    if (prev.some((edge) => edge.node.id === sendResult.message!.id)) {
      return prev;
    }
    return [...prev, newEdge];
  });

  onLastMessageUpdate(roomId, sendResult.message);
};
```

Pass `onSendMedia={handleSendMedia}` to `MessageInput` and rename `onSend` to `onSendText`.

**Important: `MessageInput` must wrap the `onSendMedia` call in `try/finally`** to reset `isUploadingMedia` and clear the attachment on both success and failure:

```typescript
const handleSendMedia = async () => {
  if (!attachedFile || isUploadingMedia) return;
  setIsUploadingMedia(true);
  try {
    await onSendMedia(attachedFile);
    // Success: clear attachment
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachedFile(null);
    setAttachmentPreviewUrl(null);
    setAttachmentError(null);
  } catch {
    // Error already toasted by ConversationView.handleSendMedia
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachedFile(null);
    setAttachmentPreviewUrl(null);
  } finally {
    setIsUploadingMedia(false);
  }
};
```

### 5.6 MessageBubble Changes -- Video Playback

**Modified `src/components/chat/message-bubble.tsx`:**

In the `MediaChatMessage` rendering branch, detect video content by checking `resource.mimeType`:

```typescript
// Inside the media rendering section:
const isVideo = isVideoMimeType(message.resource.mimeType);

if (isVideo) {
  // Render inline video player instead of FileIcon download link
  return (
    <div className="space-y-2">
      <video
        controls
        preload="metadata"
        className="max-h-64 max-w-full rounded-md"
        src={message.resource.downloadUrl}
      >
        Your browser does not support the video element.
      </video>
      {message.caption && (
        <div className="whitespace-pre-wrap break-words text-sm">
          {message.caption}
        </div>
      )}
    </div>
  );
}
```

Import `isVideoMimeType` from `@/lib/upload-validation`.

The existing image rendering path stays the same. The existing `FileResource` download-link rendering becomes the fallback for non-image, non-video files (which should not occur per the upload restrictions, but is defensive).

---

## 6. TypeScript Types

### 6.1 No new type files needed

The existing `Resource`, `ImageResource`, and `FileResource` types in `src/lib/types/resource.ts` already cover all resource types. The upload-related server action result types are defined inline in the actions file.

### 6.2 Type additions to consider

Since videos are stored as `FileResource` in the current schema, `isVideoMimeType` is the canonical way to distinguish videos from other file types. No new interface is needed unless the backend adds a `VideoResource` type later. If that happens, add it to the `Resource` union in `src/lib/types/resource.ts`.

---

## 7. State Management

### 7.1 Profile Picture

- **Local component state** in `ProfileAvatar` for the current profile picture resource. Initialized from props, updated after upload/delete.
- No global state or context needed.
- `URL.createObjectURL` for preview. **Must revoke old URL before creating a new one on repeated file selections** (not just on unmount). Use a cleanup effect: `useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);`

### 7.2 Game Media

- **Local component state** in `GameMediaGallery` (already uses `useState` for `media` and `pageInfo`).
- Add `uploadingFiles` state: `Map<string, UploadingFile>` where key is a client-generated UUID and value tracks the file and status.
- Completed uploads are appended to `media` state.

### 7.3 Chat Media

- **Local component state** in `MessageInput` for the attached file.
- Upload status is managed via `isUploadingMedia` boolean.
- After send, `ConversationView.handleSendMedia` appends the message to the existing `messages` state.

---

## 8. i18n Keys

Add the following to `messages/en.json`:

```json
{
  "profile": {
    "picture": {
      "changeLabel": "Change profile picture",
      "upload": "Upload photo",
      "remove": "Remove photo",
      "removeConfirm": {
        "title": "Remove Profile Picture",
        "description": "Are you sure you want to remove your profile picture?",
        "confirm": "Remove",
        "cancel": "Cancel"
      },
      "uploading": "Uploading\u2026",
      "preview": {
        "title": "Upload Profile Picture",
        "confirm": "Upload",
        "cancel": "Cancel"
      },
      "success": "Profile picture updated",
      "removed": "Profile picture removed",
      "errors": {
        "uploadFailed": "Failed to upload profile picture",
        "saveFailed": "Failed to save profile picture",
        "removeFailed": "Failed to remove profile picture",
        "fileTooLarge": "Image must be less than 10 MB",
        "invalidType": "Please select a JPEG, PNG, WebP, or GIF image"
      }
    }
  },
  "game": {
    "media": {
      "upload": "Add Media",
      "uploading": "Uploading\u2026",
      "empty": "No media yet",
      "emptyParticipant": "Share photos and videos from this game",
      "delete": {
        "title": "Delete Media",
        "description": "Are you sure you want to delete this media? This action cannot be undone.",
        "confirm": "Delete",
        "cancel": "Cancel"
      },
      "success": "Media uploaded",
      "deleted": "Media deleted",
      "errors": {
        "uploadFailed": "Failed to upload {filename}",
        "saveFailed": "Failed to save {filename}",
        "deleteFailed": "Failed to delete media",
        "fileTooLarge": "File must be less than {limit}",
        "invalidType": "Please select an image or video file"
      }
    }
  },
  "chat": {
    "media": {
      "attachFile": "Attach file",
      "removeAttachment": "Remove attachment",
      "photoVideo": "Photo / Video",
      "uploading": "Uploading\u2026",
      "errors": {
        "uploadFailed": "Failed to upload file",
        "fileTooLarge": "File must be less than {limit}",
        "invalidType": "Please select an image or video file"
      }
    }
  }
}
```

**Important:** `game.media.title` and `game.media.loadMore` already exist in the current `en.json`. The new keys must be **merged into** the existing `game.media` object — do not replace it. Preserve the existing `title` and `loadMore` keys. The `profile.picture` keys are new and nested under the existing `profile` namespace.

---

## 9. shadcn/ui Components Used

All required shadcn/ui components are **already installed**:

- `Dialog` -- profile picture preview
- `AlertDialog` -- remove profile picture, delete game media
- `DropdownMenu` -- profile picture menu, chat attachment menu
- `Button` -- upload triggers, actions
- `Card` -- game media gallery (already used)
- `Avatar` -- profile avatar (already used)
- `Empty` -- empty states for game media

No new shadcn/ui components need to be added via `npx shadcn@latest add`.

---

## 10. File Manifest

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/lib/upload-validation.ts` | Utility | File validation, MIME type constants, size limits |
| `src/lib/s3-upload.ts` | Utility (client) | S3 presigned URL PUT helper |
| `src/app/[locale]/upload/actions.ts` | Server Action | requestUpload, confirmUpload, deleteResource |
| `src/components/profile/profile-avatar.tsx` | Client Component | Interactive avatar with upload overlay |
| `src/components/profile/profile-picture-menu.tsx` | Client Component | Upload/remove dropdown menu |
| `src/components/profile/profile-picture-preview-dialog.tsx` | Client Component | Image preview + confirm dialog |
| `src/components/profile/remove-picture-dialog.tsx` | Client Component | Remove confirmation alert dialog |
| `src/components/game/game-media-item.tsx` | Client Component | Single media item (image/video) with delete |
| `src/components/game/game-media-upload-placeholder.tsx` | Client Component | Upload progress placeholder |
| `src/components/game/delete-media-dialog.tsx` | Client Component | Delete media confirmation dialog |
| `src/components/chat/chat-attachment-menu.tsx` | Client Component | "+" button with Photo/Video option |
| `src/components/chat/chat-attachment-preview.tsx` | Client Component | File preview above message input |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/profile/profile-header.tsx` | Delegate avatar to `ProfileAvatar` when `isOwnProfile` |
| `src/lib/types/game.ts` | Change `GameDetail.media` from optional to required |
| `src/components/game/game-media-gallery.tsx` | Add upload, delete, empty states, video support |
| `src/app/[locale]/game/[id]/page.tsx` | Always show media section, pass `canUpload`/`isParticipant` |
| `src/components/chat/message-input.tsx` | Add attachment menu, preview, media send flow |
| `src/components/chat/message-bubble.tsx` | Add inline video player for video media messages |
| `src/components/chat/conversation-view.tsx` | Add `handleSendMedia`, pass to MessageInput |
| `src/app/[locale]/chat/actions.ts` | Add `sendMediaMessage` server action |
| `messages/en.json` | Add all i18n keys from section 8 |

---

## 11. Accessibility

1. **Profile avatar overlay**: `<button aria-label="Change profile picture">`, keyboard-accessible via Tab, activated via Enter/Space
2. **Upload status**: `<div aria-live="polite">` wrapping upload status text ("Uploading...", "Upload complete", etc.)
3. **Spinners**: Use `motion-reduce:animate-none` to disable spinner animation when user prefers reduced motion
4. **Game media delete button**: `<button aria-label="Delete media">`, keyboard-accessible
5. **Video play button overlay**: `<button aria-label="Play video">`, keyboard-accessible
6. **Chat attachment button**: `<button aria-label="Attach file">`, keyboard-accessible
7. **Chat attachment remove**: `<button aria-label="Remove attachment">`, keyboard-accessible
8. **All dialogs**: Use existing Dialog/AlertDialog components which already handle focus trapping and Escape to close

---

## 12. Security Considerations

1. **Presigned URLs are ephemeral**: The `downloadUrl` and `thumbnailUrl` from resources are presigned with expiration. The client should not cache these long-term. Since we use local component state and the page re-fetches on navigation, this is handled naturally.
2. **No client-side auth headers for S3**: The presigned URL itself is the credential. The `uploadToS3` function uses a plain `fetch` with no `Authorization` header, only `Content-Type`.
3. **Server is the authority**: Client-side validation is UX convenience only. The server re-validates at `requestUpload` time and will reject invalid files.
4. **File content safety**: We only render files via `<img>` and `<video>` tags, never as arbitrary HTML. The `src` attributes point to S3 presigned URLs from a controlled bucket.

---

## 13. API / Schema Feedback

The current GraphQL schema is well-designed for this feature. A few observations:

1. **Video resources**: Currently, video uploads will be typed as `FileResource` in the schema. The `ImageResource` type has `width`, `height`, and `thumbnailUrl` but there is no `VideoResource`. This means video thumbnails are not available (the client must show a generic video icon). This is acceptable for v1 per the requirements: "a generic video icon if no thumbnail is available." If the backend adds a `VideoResource` type later, the client would need a minor update to the `Resource` union and the rendering logic.

2. **ResourceConnection on Game**: The `game.media` field returns `ResourceConnection`, which is correct. The `Resource` interface includes `mimeType`, which is sufficient to distinguish images from videos on the client.

3. **No `uploadUrl` for LOCAL storage**: The `RequestUploadResponse.uploadUrl` can be null for dev environments with LOCAL storage. The client should handle this gracefully. If `uploadUrl` is null, skip the S3 upload step (the file is presumably already stored locally by the server). This edge case should be documented in the implementation.

---

## 14. Alternative Approaches Considered

### 14.1 Server Component vs Client Component for Upload Actions

**Considered:** Using Next.js Server Actions with `FormData` for the file upload (where the file bytes are sent to the server, which then uploads to S3).

**Rejected because:** This would double the bandwidth (client -> Next.js server -> S3). The presigned URL flow is specifically designed for client-to-S3 direct upload. The client already has the file bytes.

### 14.2 Global Upload State (React Context or Zustand)

**Considered:** A global upload manager context that tracks all in-progress uploads across the app.

**Rejected because:** Each upload context (profile, game, chat) is scoped to a specific page/component and does not need cross-page state. Local component state is simpler and sufficient. If uploads needed to survive navigation (e.g., background uploads), global state would be warranted, but the requirements explicitly show upload status inline with no background upload concept.

### 14.3 `useTransition` vs `useState` for upload loading states

**Considered:** Using React's `useTransition` for server action loading states (as seen in `DeleteGameDialog`).

**Decided:** Use `useState` for `isUploading` because the upload pipeline is not a single server action -- it is a multi-step sequence (server action -> client fetch -> server action). `useTransition` works well for a single server action call, but not for a composed async flow. `useState` with manual `setIsUploading(true/false)` is more appropriate here.

### 14.4 `revalidatePath` vs Local State Updates

**Considered:** Calling `revalidatePath` after uploads to refetch data from the server.

**Decided:** Use local state updates for immediate UI feedback. `revalidatePath` would cause a full page refetch, which is slower and causes layout shifts. The client already has the confirmed resource data from the `confirmUpload` response and can update local state directly. The next time the user navigates to the page, the server will return the fresh data.

---

## 15. Edge Cases

1. **Upload URL is null**: For LOCAL storage dev environments, `uploadUrl` may be null. Handle by skipping the S3 step (treat as success).
2. **Race condition: old resource deletion fails**: If the old profile picture cannot be deleted after a new one is uploaded, the user still sees the new picture. Log the error and toast a non-blocking warning. The old resource becomes orphaned on S3 (backend should have a cleanup job for this).
3. **Large video upload on slow connection**: The upload spinner runs until S3 responds. No timeout is set on the `fetch` call. This is acceptable for v1 but a timeout could be added later.
4. **Component unmounts during upload**: If the user navigates away during upload, the in-flight fetch/server-action may complete but the state update will be a no-op (React ignores `setState` on unmounted components). The resource may end up in REQUESTED state on the server. The backend should have a TTL-based cleanup for REQUESTED resources.
5. **Multiple rapid file selections**: In the profile picture flow, selecting a new file while a preview dialog is open should replace the previous selection. The dialog's `file` and `previewUrl` props update, and the old `createObjectURL` is revoked.
6. **Chat: sending media while WebSocket delivers the same message**: The same deduplication logic used for text messages applies. `sendMediaMessage` returns the message, which is inserted into state with dedup checking.
