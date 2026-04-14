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
    id: number;
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
  errorCode?: UrlResolutionErrorCode;
  message?: string;
  existingGameMediaId?: string;
  retryAfterSeconds?: number;
}

export interface DeleteGameMediaActionResult {
  success: boolean;
  errorType?: string;
  message?: string;
}
