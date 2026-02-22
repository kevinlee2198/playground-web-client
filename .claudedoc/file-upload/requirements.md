# File Upload Feature -- Requirements

## Overview

Add file upload support across three areas of the application: **user profile pictures**, **game media** (photos/videos), and **chat media** (photos/videos). All uploads use a two-phase flow: the client requests a presigned URL from the backend, uploads the file directly to S3, then confirms the upload.

---

## 1. Upload Flow (Shared Across All Upload Contexts)

### 1.1 Two-Phase Upload Process

All uploads follow the same backend flow:

1. **Phase 1 -- Request Upload:** Client calls `requestUpload` with file metadata (filename, mimeType, size) and an upload context. The server validates the metadata and returns a presigned S3 PUT URL and a `resourceId`.
2. **Phase 2 -- S3 Upload:** Client uploads the file bytes directly to the presigned URL via an HTTP PUT request.
3. **Phase 3 -- Confirm Upload:** Client calls `confirmUpload` with the `resourceId` to transition the resource from REQUESTED to PERMANENT. **Exception:** Chat media resources are confirmed automatically when `sendChatMessage` is called -- `confirmUpload` must NOT be called for chat media.

### 1.2 Client-Side Validation

The UI must perform client-side validation before calling `requestUpload` for instant user feedback. The server is the ultimate authority and will reject invalid files at the `requestUpload` step, but the client should catch common issues early.

**Profile pictures (images only):**
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Max file size: 10 MB

**Game media (images and videos):**
- Allowed image MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`
- Allowed video MIME types: `video/mp4`, `video/quicktime`, `video/webm`
- Max file size for images: 10 MB
- Max file size for videos: 100 MB

**Chat media (images and videos):**
- Same allowed MIME types as game media
- Same file size limits as game media

If the user selects a file that fails client-side validation, display an inline error message explaining the issue (wrong file type, file too large). Do not call `requestUpload`.

If the file passes client-side validation but the server rejects it at the `requestUpload` step, display the server's error message via a toast notification.

### 1.3 Upload Progress Feedback

During the S3 upload step, display a spinner with a brief "Uploading…" indicator. No progress bar or percentage is needed. The upload status region must use `aria-live="polite"` so screen readers announce state changes. Spinners and loading animations must respect `prefers-reduced-motion` (disable or simplify animation when the user prefers reduced motion).

### 1.4 Relevant Backend Operations

- `requestUpload` -- Phase 1: sends file metadata and upload context, receives presigned URL and resource ID
- `confirmUpload` -- Phase 2 confirmation: transitions resource from REQUESTED to PERMANENT (not used for chat media)
- `deleteResource` -- deletes a resource and its backing file from S3

---

## 2. User Profile Picture Upload

### 2.1 Authentication and Authorization

- The user must be authenticated.
- Only the logged-in user can change their own profile picture. The upload trigger only appears when viewing your own profile (`isOwnProfile === true`).

### 2.2 Upload Trigger

- When viewing your own profile, the profile avatar displays a camera/edit icon overlay on hover, on focus, and always visible on touch devices. The overlay is a `<button>` with `aria-label="Change profile picture"` and is keyboard-accessible (focusable via Tab, activated via Enter/Space).
- Clicking or activating the overlay opens a context menu or popover with options:
  - **"Upload photo"** -- opens the system file picker
  - **"Remove photo"** -- only shown when a profile picture already exists; removes the current picture and returns to the initials fallback

### 2.3 File Selection and Preview

- The file picker is restricted to image types (`accept` attribute for images).
- After the user selects a file, a preview/confirmation dialog appears showing the selected image.
- **Image cropping (deferred):** Ideally the dialog would include a crop-to-square tool so the user can frame their photo. If this is too complex for the first iteration, defer cropping but still show the preview dialog with a "Upload" and "Cancel" button. Add a TODO comment in the code noting that cropping should be added here.
- The preview dialog serves as the confirmation step -- the upload does not begin until the user clicks "Upload" (or "Save" / "Confirm").

### 2.4 Upload Behavior

- Upload context: `userProfilePicture` (with `placeholder: true` since there is no resize support yet)
- After a successful upload and confirmation, the avatar immediately updates to show the new profile picture. The page should reflect the change without requiring a full page reload.
- If the user already has a profile picture and uploads a new one, the old picture is replaced. The client should delete the old resource after the new one is confirmed (call `deleteResource` with the old resource ID).

### 2.5 Remove Profile Picture

- When the user selects "Remove photo," display a confirmation prompt (e.g., "Are you sure you want to remove your profile picture?").
- On confirmation, call `deleteResource` with the current profile picture's resource ID.
- After successful deletion, the avatar reverts to the initials fallback.

### 2.6 Error Handling

- If `requestUpload` fails: show a toast with the server error message.
- If the S3 upload fails: show a toast with a generic "Failed to upload profile picture" message.
- If `confirmUpload` fails: show a toast with a generic "Failed to save profile picture" message.
- If `deleteResource` fails (for remove or replace): show a toast with "Failed to remove profile picture."

### 2.7 Relevant Backend Operations

- `requestUpload` with `userProfilePicture` context -- requests presigned URL for profile picture
- `confirmUpload` -- confirms the profile picture upload
- `deleteResource` -- removes the old/current profile picture
- `me` query (with `profilePicture` field) -- fetches the current user's profile picture to display and to get the resource ID for deletion

---

## 3. Game Media Upload

### 3.1 Authentication and Authorization

- The user must be authenticated.
- Only users who are **participants** in the game (players on a team or individual participants) can upload media to that game.
- The upload button must be hidden from non-participants.

### 3.2 Game Status Restriction

- Media upload is only available for games with status **IN_PROGRESS** or **COMPLETE**.
- For **SCHEDULED** games, the media section should not show an upload button (but may still display existing media if any exists from a status change).

### 3.3 Media Section Visibility

- The media section (gallery card) is **always visible** on the game detail page, regardless of whether media exists.
- When empty and the user is a participant (and game status allows uploads), show an empty state message encouraging the user to upload photos or videos, alongside the upload button.
- When empty and the user is not a participant (or game is SCHEDULED), show an empty state message like "No media yet."

### 3.4 Upload Trigger

- An "Upload" or "Add Media" button appears within the media section card header.
- Clicking the button opens the system file picker. The file picker accepts both image and video types.
- **Multi-file upload:** Support selecting multiple files at once from the file picker. Each file goes through the two-phase upload flow independently. Files appear in the gallery as they complete (not all at once). If any individual file fails, show an error toast for that file but continue uploading the others.

### 3.5 Upload Behavior

- Upload context: `gameMedia` (with the game's ID)
- After each file is uploaded and confirmed, it appears in the media gallery immediately without a full page reload.
- During upload, show a spinner/placeholder in the gallery grid for each file being uploaded.

### 3.6 Media Display

**Images:**
- Display as thumbnails in the responsive grid (existing behavior -- `thumbnailUrl` if available, otherwise `downloadUrl`). Thumbnail `<img>` elements must include explicit `width` and `height` attributes to prevent layout shift, and `loading="lazy"` for below-fold items.
- Clicking an image opens it at full resolution (existing behavior opens in new tab; this is acceptable for this iteration).

**Videos:**
- Display as a thumbnail in the grid with a play button overlay. The play button overlay must be a `<button>` with `aria-label="Play video"`. The thumbnail can be the first frame or a generic video icon if no thumbnail is available (the server may not generate video thumbnails immediately).
- Clicking plays the video inline. The video player should support basic controls (play/pause, seek, volume, fullscreen). Use the native HTML `<video>` element with `preload="metadata"` so the browser loads dimensions without downloading the full file.
- The video `src` should use the `downloadUrl` from the resource.

### 3.7 Media Deletion

- Any game participant can delete any media item (not just the uploader).
- Each media item in the gallery has a delete button (visible on hover and focus for desktop, accessible via a long-press or context menu on mobile). The delete button must be a `<button>` with `aria-label="Delete media"` and must be keyboard-accessible. Gallery items should use `touch-action: manipulation` to avoid double-tap zoom delay on touch devices.
- Clicking delete shows a confirmation dialog: "Are you sure you want to delete this media? This action cannot be undone."
- On confirmation, call `deleteResource` and remove the item from the gallery immediately.
- Non-participants do not see delete controls.

### 3.8 Error Handling

- If `requestUpload` fails for a file: show a toast with the error (e.g., "Failed to upload [filename]: [server error]").
- If the S3 upload fails: show a toast with "Failed to upload [filename]."
- If `confirmUpload` fails: show a toast with "Failed to save [filename]."
- If `deleteResource` fails: show a toast with "Failed to delete media."

### 3.9 Relevant Backend Operations

- `requestUpload` with `gameMedia` context (requires `gameId`) -- requests presigned URL for game media
- `confirmUpload` -- confirms the game media upload
- `deleteResource` -- deletes a media item
- `game` query (with `media` connection field) -- fetches paginated game media (already used by `GameMediaGallery`)

---

## 4. Chat Media Upload

### 4.1 Authentication and Authorization

- The user must be authenticated and a member of the chat room.

### 4.2 Attachment Trigger

- A "+" button with `aria-label="Attach file"` is added to the left of the message input textarea. The button must be keyboard-accessible.
- Clicking the "+" button opens a dropdown menu with an option: **"Photo / Video"** (this leaves room for future menu items like audio).
- Selecting "Photo / Video" opens the system file picker restricted to image and video types.

### 4.3 File Selection and Preview

- After the user selects a file, a preview appears above the message input area (replacing the reply preview area, or stacked above it if replying and attaching simultaneously is supported -- for simplicity, **attaching a file clears any active reply**).
- The preview shows:
  - A thumbnail of the image, or a video icon with filename for videos
  - The filename and file size
  - A remove/dismiss button (X) with `aria-label="Remove attachment"` to cancel the attachment before sending
- **No caption support.** The existing text input is disabled or hidden while a file is attached. The user sends the media message by clicking the send button with just the file.

### 4.4 Send Behavior

- When the user clicks send with a file attached:
  1. Call `requestUpload` with `chatMedia` context (requires `chatRoomId`).
  2. Upload the file to S3 via the presigned URL.
  3. Call `sendChatMessage` with `mediaMessage` input (requires `resourceId` from step 1). This automatically confirms the resource -- do NOT call `confirmUpload`.
- During the upload, show a spinner on the send button or in the preview area. The send button should be disabled while uploading.
- After sending, the media message appears in the chat (via the mutation response and/or WebSocket event, matching existing message handling patterns).

### 4.5 Media Display in Chat Messages

The existing `MessageBubble` component already renders `MediaChatMessage` with images and file icons. Enhance it:

**Images:** Already rendered as clickable thumbnails (existing behavior). No changes needed.

**Videos:** Currently rendered as a generic file icon with download link. Update to:
- Display an inline video player (or a thumbnail with play button) within the message bubble. Play button overlays must include `aria-label="Play video"`.
- Use the native HTML `<video>` element with controls and `preload="metadata"`.
- Keep a reasonable max height/width constraint so the video player does not dominate the chat.

### 4.6 Error Handling

- If client-side validation fails: show an inline error in the preview area (e.g., "File too large" or "Unsupported file type") and do not proceed.
- If `requestUpload` fails: show a toast with the server error, clear the attachment preview.
- If the S3 upload fails: show a toast with "Failed to upload file," clear the attachment preview.
- If `sendChatMessage` fails: show a toast with the existing "Failed to send message" error.

### 4.7 Future Consideration (Out of Scope)

- **Audio messages:** The "+" menu is designed to support additional media types in the future. Audio upload is explicitly out of scope for this iteration but should be easy to add as another menu option.

### 4.8 Relevant Backend Operations

- `requestUpload` with `chatMedia` context (requires `chatRoomId`) -- requests presigned URL for chat media
- `sendChatMessage` with `mediaMessage` input (requires `resourceId`, optional `caption`, optional `replyToId`) -- sends the media message and auto-confirms the resource. Note: per requirements, `caption` will be omitted (always null/undefined), and `replyToId` will be omitted (attachment clears reply).

---

## 5. Security Considerations

- **Authentication:** All upload and delete operations require an authenticated session. The client uses `authMutate` / `authQuery` for all GraphQL calls, which automatically injects the Bearer token.
- **Authorization:** The backend enforces that the authenticated user is authorized for the specific upload context (e.g., can only upload to games they participate in). The UI hides upload controls from unauthorized users as a UX convenience, but the backend is the security boundary.
- **Presigned URLs:** Download URLs (`downloadUrl`, `thumbnailUrl`) are presigned and ephemeral. They are generated by the server on demand and should not be cached long-term by the client.
- **File content:** Uploaded files are served from S3 via presigned URLs. The UI renders images via `<img>` tags and videos via `<video>` tags. Since these are from a controlled S3 bucket (not user-supplied URLs), XSS risk from file content is minimal, but the UI should not render arbitrary HTML from file contents.

---

## 6. Internationalization (i18n)

All new user-facing strings require translation keys under the `messages/en.json` file. Below are the required keys and their English values.

### 6.1 Profile Picture Upload

```
"profile.picture.upload": "Upload photo"
"profile.picture.remove": "Remove photo"
"profile.picture.removeConfirm.title": "Remove Profile Picture"
"profile.picture.removeConfirm.description": "Are you sure you want to remove your profile picture?"
"profile.picture.removeConfirm.confirm": "Remove"
"profile.picture.removeConfirm.cancel": "Cancel"
"profile.picture.uploading": "Uploading…"
"profile.picture.preview.title": "Upload Profile Picture"
"profile.picture.preview.confirm": "Upload"
"profile.picture.preview.cancel": "Cancel"
"profile.picture.success": "Profile picture updated"
"profile.picture.removed": "Profile picture removed"
"profile.picture.errors.uploadFailed": "Failed to upload profile picture"
"profile.picture.errors.saveFailed": "Failed to save profile picture"
"profile.picture.errors.removeFailed": "Failed to remove profile picture"
"profile.picture.errors.fileTooLarge": "Image must be less than 10 MB"
"profile.picture.errors.invalidType": "Please select a JPEG, PNG, WebP, or GIF image"
```

### 6.2 Game Media Upload

```
"game.media.upload": "Add Media"
"game.media.uploading": "Uploading…"
"game.media.empty": "No media yet"
"game.media.emptyParticipant": "Share photos and videos from this game"
"game.media.delete.title": "Delete Media"
"game.media.delete.description": "Are you sure you want to delete this media? This action cannot be undone."
"game.media.delete.confirm": "Delete"
"game.media.delete.cancel": "Cancel"
"game.media.success": "Media uploaded"
"game.media.deleted": "Media deleted"
"game.media.errors.uploadFailed": "Failed to upload {filename}"
"game.media.errors.saveFailed": "Failed to save {filename}"
"game.media.errors.deleteFailed": "Failed to delete media"
"game.media.errors.fileTooLarge": "File must be less than {limit}"
"game.media.errors.invalidType": "Please select an image or video file"
```

### 6.3 Chat Media Upload

```
"chat.media.photoVideo": "Photo / Video"
"chat.media.uploading": "Uploading…"
"chat.media.errors.uploadFailed": "Failed to upload file"
"chat.media.errors.fileTooLarge": "File must be less than {limit}"
"chat.media.errors.invalidType": "Please select an image or video file"
```

---

## 7. Scope

### 7.1 In Scope

- Profile picture upload, replace, and remove (camera icon overlay on own profile avatar)
- Profile picture preview/confirmation dialog before upload
- Game media upload (multi-file) for game participants on IN_PROGRESS and COMPLETE games
- Game media grid display with inline video playback
- Game media deletion by any game participant
- Always-visible media section on game detail page with empty state
- Chat media upload via "+" menu in message input
- Chat media file preview before sending
- Inline video playback in chat message bubbles
- Client-side file type and size validation
- Spinner-based upload progress indication
- All i18n translation keys
- Error handling with toast notifications

### 7.2 Out of Scope (Deferred)

- Client-side image cropping for profile pictures (add TODO in code)
- Chat media captions
- Audio message support in chat (the "+" menu design should accommodate future additions)
- Drag-and-drop file upload
- Upload progress bars / percentage
- Chat media while replying to a message (attachment clears reply)
- Bulk deletion of game media
- Video thumbnail generation on the client (rely on server-generated thumbnails)
- Settings/edit profile page (the upload is done directly from the profile avatar)
