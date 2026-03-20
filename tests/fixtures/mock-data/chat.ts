import { buildConnection, emptyConnection } from "./connection";

const defaultRoom = {
  id: "room-1",
  name: "Test Room",
  lastMessage: { content: "Hello", createdAt: new Date().toISOString() },
  members: [],
};

export function mockChatRoomsResponse(rooms?: Record<string, unknown>[]) {
  return {
    data: {
      chatRooms: buildConnection(rooms ?? [defaultRoom]),
    },
  };
}

export function mockEmptyChatRoomsResponse() {
  return { data: { chatRooms: emptyConnection() } };
}
