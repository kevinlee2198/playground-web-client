/**
 * Reusable GraphQL query fragment objects for json-to-graphql-query.
 * Import and spread these into query objects to avoid duplication.
 */

/**
 * Profile picture thumbnail selection for the Resource interface.
 * Use as: profilePicture: profilePictureThumbnailFragment
 */
export const profilePictureThumbnailFragment = {
  __typename: true,
  __on: [{ __typeName: "ImageResource", thumbnailUrl: true }],
};

/**
 * Player reference fragment matching the PlayerRef type.
 * Use as: player: playerRefFragment or players: playerRefFragment
 */
export const playerRefFragment = {
  id: true,
  user: {
    displayName: true,
    username: true,
    profilePicture: profilePictureThumbnailFragment,
  },
};

/**
 * Inline fragments for the Resource interface.
 * Use as: resource: resourceFragment
 */
export const resourceFragment = {
  __typename: true,
  id: true,
  filename: true,
  size: true,
  mimeType: true,
  downloadUrl: true,
  createdDate: true,
  __on: [
    {
      __typeName: "ImageResource",
      width: true,
      height: true,
      thumbnailUrl: true,
    },
    {
      __typeName: "FileResource",
    },
  ],
};

/**
 * Shared fields for embed-capable media types (VideoMedia, LivestreamMedia).
 * Does NOT include embedUrl — each type aliases that to a unique key to avoid
 * a GraphQL FieldsConflict error (nullable String vs non-null String!).
 */
const embedMediaFields = {
  description: true,
  embedWidth: true,
  embedHeight: true,
};

/**
 * Inline fragments for the GameMedia interface.
 * ImageMedia has no extra fields so it needs no __on entry.
 *
 * VideoMedia.embedUrl is nullable (String) while LivestreamMedia.embedUrl is
 * non-null (String!). graphql-java rejects merging fields with different
 * nullability shapes, so each type aliases embedUrl to a unique response key.
 * Use normalizeGameMedia() to map the aliased keys back to embedUrl.
 */
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
      ...embedMediaFields,
      videoEmbedUrl: { __aliasFor: "embedUrl" },
    },
    {
      __typeName: "LivestreamMedia",
      ...embedMediaFields,
      livestreamEmbedUrl: { __aliasFor: "embedUrl" },
    },
    { __typeName: "LinkMedia", description: true },
  ],
};

/**
 * Maps aliased embedUrl fields back to the canonical embedUrl key.
 * Call on every raw GameMedia node returned from a query using gameMediaFragment.
 *
 * Uses `any` because GraphQL responses are untyped at runtime. Type safety
 * is provided by the callers' return type annotations.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGameMedia(raw: any): any {
  if (raw?.__typename === "VideoMedia") {
    const { videoEmbedUrl, ...rest } = raw;
    return { ...rest, embedUrl: videoEmbedUrl ?? null };
  }
  if (raw?.__typename === "LivestreamMedia") {
    const { livestreamEmbedUrl, ...rest } = raw;
    return { ...rest, embedUrl: livestreamEmbedUrl };
  }
  return raw;
}

/**
 * Normalizes aliased embedUrl fields across an array of connection edges.
 * Use on paginated GameMedia responses that return edges with gameMediaFragment nodes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeGameMediaEdges(edges: any[]): any[] {
  return edges.map((edge) => ({
    ...edge,
    node: normalizeGameMedia(edge.node),
  }));
}

/**
 * Chat user fields fragment.
 * Use as: user: chatUserFragment
 */
export const chatUserFragment = {
  id: true,
  firstName: true,
  lastName: true,
  displayName: true,
};

/**
 * Shared fields for UserChatMessage types (user, updatedDate, deletedDate, replyTo).
 * These fields are NOT on the base ChatMessage interface anymore.
 */
const userChatMessageFields = {
  user: chatUserFragment,
  updatedDate: true,
  deletedDate: true,
  replyTo: {
    __typename: true,
    id: true,
    user: chatUserFragment,
    __on: [
      { __typeName: "TextChatMessage", content: true },
      {
        __typeName: "MediaChatMessage",
        caption: true,
        resource: resourceFragment,
      },
    ],
  },
};

/**
 * Inline fragments for all ChatMessage concrete types.
 * Includes both user message types and system message types.
 * Use as: __on: chatMessageInlineFragments
 */
export const chatMessageInlineFragments = [
  {
    __typeName: "TextChatMessage",
    ...userChatMessageFields,
    content: true,
  },
  {
    __typeName: "MediaChatMessage",
    ...userChatMessageFields,
    caption: true,
    resource: resourceFragment,
  },
  {
    __typeName: "MemberJoinedChatMessage",
    member: chatUserFragment,
  },
  {
    __typeName: "MemberLeftChatMessage",
    member: chatUserFragment,
  },
];

/**
 * Reusable chat message node selection.
 * Base fields only (id, createdDate, __typename); user-specific fields
 * are fetched via inline fragments.
 * Use as: node: chatMessageNodeSelection
 */
export const chatMessageNodeSelection = {
  __typename: true,
  id: true,
  createdDate: true,
  __on: chatMessageInlineFragments,
};

/**
 * Inline fragments for ChatRoom types (DirectMessageChatRoom / GroupChatRoom).
 * Use as: __on: chatRoomInlineFragments
 */
export const chatRoomInlineFragments = [
  {
    __typeName: "DirectMessageChatRoom",
    canMessage: true,
  },
  {
    __typeName: "GroupChatRoom",
    name: true,
  },
];

/**
 * Inline fragments for the GameMetadata union type.
 * Use as: metadata: gameMetadataFragment
 */
export const gameMetadataFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "BaseballGameMetadata",
      innings: true,
    },
    {
      __typeName: "BasketballGameMetadata",
      basketballFormat: {
        __aliasFor: "format",
      },
      periods: true,
    },
    {
      __typeName: "TennisGameMetadata",
      tennisFormat: {
        __aliasFor: "format",
      },
      tennisBestOf: {
        __aliasFor: "bestOf",
      },
      tiebreakFinalSet: true,
    },
    {
      __typeName: "FootballGameMetadata",
      footballFormat: {
        __aliasFor: "format",
      },
      periods: true,
    },
    {
      __typeName: "PickleballGameMetadata",
      pickleballFormat: {
        __aliasFor: "format",
      },
      pickleballBestOf: {
        __aliasFor: "bestOf",
      },
      pointsPerGame: true,
      winByTwo: true,
      scoringType: true,
    },
  ],
};

/**
 * Inline fragments for the ParticipantMetadata union type.
 * Use as: metadata: participantMetadataFragment
 */
export const participantMetadataFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "BaseballParticipantMetadata",
      score: true,
    },
    {
      __typeName: "BasketballParticipantMetadata",
      score: true,
    },
    {
      __typeName: "TennisParticipantMetadata",
      setsWon: true,
      sets: { gamesWon: true, tiebreakPoints: true },
    },
    {
      __typeName: "FootballParticipantMetadata",
      score: true,
    },
    {
      __typeName: "PickleballParticipantMetadata",
      gamesWon: true,
      games: { pointsScored: true },
    },
  ],
};

/**
 * Participant node fragment for game card queries (basic info + metadata).
 * Fetches TeamInstance and IndividualParticipant inline fragments.
 */
export const participantNodeFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "TeamInstance",
      id: true,
      name: true,
      players: playerRefFragment,
      metadata: participantMetadataFragment,
    },
    {
      __typeName: "IndividualParticipant",
      id: true,
      player: playerRefFragment,
      metadata: participantMetadataFragment,
    },
  ],
};

/**
 * Fragment for viewerFollowingPlayers on feed game nodes.
 */
export const viewerFollowingPlayersFragment = {
  nodes: {
    id: true,
    user: {
      id: true,
      displayName: true,
      profilePicture: profilePictureThumbnailFragment,
    },
  },
  totalCount: true,
};

/**
 * Participant node fragment for game detail queries (full info + metadata).
 * Includes description on TeamInstance.
 */
export const participantDetailNodeFragment = {
  __typename: true,
  __on: [
    {
      __typeName: "TeamInstance",
      id: true,
      name: true,
      description: true,
      players: playerRefFragment,
      metadata: participantMetadataFragment,
    },
    {
      __typeName: "IndividualParticipant",
      id: true,
      player: playerRefFragment,
      metadata: participantMetadataFragment,
    },
  ],
};

/**
 * Location fields fragment for Game queries.
 * Use as: location: locationFragment
 */
export const locationFragment = {
  id: true,
  name: true,
  address: {
    street: true,
    city: true,
    state: true,
    postalCode: true,
    country: true,
  },
  coordinates: {
    latitude: true,
    longitude: true,
  },
};

/**
 * User reference fragment with id, username, and displayName.
 * Shared across notification and invitation fragments.
 */
const userRefFragment = {
  id: true,
  username: true,
  displayName: true,
};

/**
 * Inline fragments for Notification types.
 * Use as: __on: notificationInlineFragments
 */
export const notificationInlineFragments = [
  {
    __typeName: "NewFollowerNotification",
    follower: userRefFragment,
  },
  {
    __typeName: "GameStartedNotification",
    game: {
      id: true,
      sportType: true,
    },
  },
  {
    __typeName: "GameInvitationReceivedNotification",
    inviter: userRefFragment,
    game: {
      id: true,
      sportType: true,
    },
    invitation: {
      id: true,
    },
  },
];

/**
 * Full game invitation node for the organizer's invitation list.
 * Use as: node: gameInvitationFragment
 */
export const gameInvitationFragment = {
  id: true,
  inviter: userRefFragment,
  invitee: userRefFragment,
  status: true,
  acceptedDate: true,
  createdDate: true,
};

/**
 * Minimal invitation shape for Game.viewerInvitation.
 * Use as: viewerInvitation: viewerInvitationFragment
 */
export const viewerInvitationFragment = {
  id: true,
  status: true,
  inviter: { id: true, displayName: true },
};

/**
 * Follow state fields returned by followUser / unfollowUser mutations.
 * Use as: user: followUserStateFragment
 */
export const followUserStateFragment = {
  id: true,
  viewerFollowsUser: true,
  userFollowsViewer: true,
  followerCount: true,
  followingCount: true,
};

/**
 * User reference fields inside a Follow edge node (follower / following).
 * Includes follow relationship fields visible to the viewer.
 * Use as: follower: followUserRefFragment  or  following: followUserRefFragment
 */
export const followUserRefFragment = {
  id: true,
  username: true,
  displayName: true,
  profilePicture: profilePictureThumbnailFragment,
  viewerFollowsUser: true,
  userFollowsViewer: true,
};

/**
 * Catch-all fragment for the Error interface in union result types.
 * Every error type implements this interface, so this matches all errors.
 * The __typename at the union level still gives the specific error type.
 * Use as: __on: [{ __typeName: "SuccessResponse", ...fields }, errorFragment]
 */
export const errorFragment = { __typeName: "Error", message: true };
