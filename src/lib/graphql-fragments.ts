/**
 * Reusable GraphQL query fragment objects for json-to-graphql-query.
 * Import and spread these into query objects to avoid duplication.
 */

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
      __typeName: "BasketballGameMetadata",
      basketballSubtype: {
        __aliasFor: "subtype",
      },
      periods: true,
    },
    {
      __typeName: "TennisGameMetadata",
      tennisSubtype: {
        __aliasFor: "subtype",
      },
      bestOf: true,
      tiebreakFinalSet: true,
    },
    {
      __typeName: "FootballGameMetadata",
      footballSubtype: {
        __aliasFor: "subtype",
      },
      periods: true,
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
      players: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
    {
      __typeName: "IndividualParticipant",
      id: true,
      player: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
  ],
};

/**
 * Fragment for viewerFriendPlayers on feed game nodes.
 * Fetches friend player names, user display name, and profile picture thumbnail.
 */
export const viewerFriendPlayersFragment = {
  nodes: {
    id: true,
    firstName: true,
    lastName: true,
    user: {
      id: true,
      displayName: true,
      profilePicture: {
        __typename: true,
        __on: [
          {
            __typeName: "ImageResource",
            thumbnailUrl: true,
          },
        ],
      },
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
      players: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
    {
      __typeName: "IndividualParticipant",
      id: true,
      player: { id: true, firstName: true, lastName: true },
      metadata: participantMetadataFragment,
    },
  ],
};

/**
 * Inline fragments for Notification types.
 * Use as: __on: notificationInlineFragments
 */
export const notificationInlineFragments = [
  {
    __typeName: "FriendRequestReceivedNotification",
    sender: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  {
    __typeName: "FriendRequestAcceptedNotification",
    accepter: {
      id: true,
      username: true,
      displayName: true,
    },
  },
  {
    __typeName: "GameStartedNotification",
    game: {
      id: true,
      sportType: true,
    },
  },
];
