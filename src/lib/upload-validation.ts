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
export const MEDIA_MIME_TYPES = [
  ...IMAGE_MIME_TYPES,
  ...VIDEO_MIME_TYPES,
] as const;

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
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Return the human-readable max file size string for error messages */
export function getMaxSizeLabel(mimeType: string): string {
  return isVideoMimeType(mimeType) ? "100 MB" : "10 MB";
}
