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
 * Inline fragments for ChatMessage types (TextChatMessage / MediaChatMessage).
 * Use as: __on: chatMessageInlineFragments
 */
export const chatMessageInlineFragments = [
  {
    __typeName: "TextChatMessage",
    content: true,
  },
  {
    __typeName: "MediaChatMessage",
    caption: true,
    resource: resourceFragment,
  },
];

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
