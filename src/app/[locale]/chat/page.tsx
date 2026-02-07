import { ChatLayout } from "@/components/chat/chat-layout";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { authQuery } from "@/lib/graphql-request";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { loadChatRooms } from "./actions";

export const metadata: Metadata = {
  title: "Chat | Playground",
  description: "Chat with your friends",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ room?: string }>;
}

export default async function ChatPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const { room } = await searchParams;

  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  // Fetch current user info
  const userResponse = await authQuery({
    me: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  const currentUser = userResponse.data?.me;

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-semibold text-destructive">
            Failed to load user profile
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </main>
    );
  }

  // Fetch initial chat rooms (first 20)
  const chatRoomsData = await loadChatRooms(20);

  if (!chatRoomsData) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-semibold text-destructive">
            Failed to load chat rooms
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </main>
    );
  }

  // Parse initialRoomId from search params
  const initialRoomId = room || null;

  return (
    <div className="h-[calc(100vh-4rem)] overflow-hidden">
      <ChatLayout
        initialRooms={chatRoomsData.edges}
        initialPageInfo={chatRoomsData.pageInfo}
        currentUser={{
          id: currentUser.id,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
        }}
        initialRoomId={initialRoomId}
      />
    </div>
  );
}
