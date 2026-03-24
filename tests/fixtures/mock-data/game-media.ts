import { TEST_USER } from "../auth.fixture";

export function mockImageMedia(overrides?: Record<string, unknown>) {
  return {
    __typename: "ImageMedia",
    id: "media-img-1",
    source: "UPLOAD",
    url: "https://s3.example.com/game-media/photo.jpg",
    thumbnailUrl: "https://s3.example.com/game-media/thumb.jpg",
    title: "Game photo",
    addedBy: {
      id: TEST_USER.id,
      displayName: "Test User",
      username: TEST_USER.username,
    },
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  };
}

export function mockVideoMedia(overrides?: Record<string, unknown>) {
  return {
    __typename: "VideoMedia",
    id: "media-vid-1",
    source: "YOUTUBE",
    url: "https://www.youtube.com/watch?v=abc123",
    thumbnailUrl: "https://img.youtube.com/vi/abc123/0.jpg",
    title: "Game Highlights",
    description: "First half highlights",
    embedUrl: "https://www.youtube-nocookie.com/embed/abc123",
    embedWidth: 560,
    embedHeight: 315,
    addedBy: {
      id: TEST_USER.id,
      displayName: "Test User",
      username: TEST_USER.username,
    },
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  };
}

export function mockLivestreamMedia(overrides?: Record<string, unknown>) {
  return {
    __typename: "LivestreamMedia",
    id: "media-live-1",
    source: "YOUTUBE",
    url: "https://www.youtube.com/live/xyz",
    thumbnailUrl: null,
    title: "Live Game Stream",
    description: "Streaming now",
    embedUrl: "https://www.youtube-nocookie.com/embed/xyz?autoplay=1",
    embedWidth: 560,
    embedHeight: 315,
    addedBy: {
      id: TEST_USER.id,
      displayName: "Test User",
      username: TEST_USER.username,
    },
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  };
}

export function mockLinkMedia(overrides?: Record<string, unknown>) {
  return {
    __typename: "LinkMedia",
    id: "media-link-1",
    source: "CUSTOM_URL",
    url: "https://example.com/article",
    thumbnailUrl: "https://example.com/og-image.jpg",
    title: "Game Recap Article",
    description: "A recap of the game",
    addedBy: {
      id: TEST_USER.id,
      displayName: "Test User",
      username: TEST_USER.username,
    },
    createdAt: new Date().toISOString(),
    updatedAt: null,
    ...overrides,
  };
}

export function mockResolveUrlResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      resolveUrl: {
        __typename: "ResolveUrlResponse",
        type: "VIDEO",
        source: "YOUTUBE",
        resolvedUrl: "https://www.youtube.com/watch?v=abc123",
        title: "Test Video Title",
        description: "Test description",
        thumbnailUrl: "https://img.youtube.com/vi/abc123/0.jpg",
        embedUrl: "https://www.youtube-nocookie.com/embed/abc123",
        embedWidth: 560,
        embedHeight: 315,
        ...overrides,
      },
    },
  };
}

export function mockAddGameMediaLinkResponse(
  overrides?: Record<string, unknown>,
) {
  return {
    data: {
      addGameMediaLink: {
        __typename: "AddGameMediaLinkResponse",
        gameMedia: mockVideoMedia(overrides),
      },
    },
  };
}

export function mockDeleteGameMediaResponse(id = "media-1") {
  return {
    data: {
      deleteGameMedia: {
        __typename: "DeleteGameMediaResponse",
        id,
      },
    },
  };
}

export function mockDuplicateMediaError() {
  return {
    data: {
      resolveUrl: {
        __typename: "DuplicateMediaError",
        message: "This link already exists",
        existingGameMediaId: "existing-1",
      },
    },
  };
}

export function mockRateLimitedError(retryAfterSeconds = 30) {
  return {
    data: {
      resolveUrl: {
        __typename: "RateLimitedError",
        message: "Too many requests",
        retryAfterSeconds,
      },
    },
  };
}
