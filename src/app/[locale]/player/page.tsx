import { PlayerProfileCard } from "@/components/player/player-profile-card";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { authQuery } from "@/lib/graphql-request";
import type { Metadata } from "next";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Player Profile | Playground",
  description: "Manage your player profile",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function PlayerPage({ params }: PageProps) {
  const { locale } = await params;

  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  // Fetch data using me.player instead of separate currentPlayer
  const response = await authQuery({
    me: {
      id: true,
      firstName: true,
      lastName: true,
      player: {
        id: true,
        firstName: true,
        lastName: true,
        age: true,
        height: true,
        weight: true,
        biography: true,
      },
    },
  });

  const user = response.data?.me;
  const player = user?.player;

  // Handle error state
  if (!user) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-semibold text-destructive">
            Failed to load player profile
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please try refreshing the page
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PlayerProfileCard
        initialPlayer={player}
        userDefaults={{
          firstName: user.firstName,
          lastName: user.lastName,
        }}
      />
    </main>
  );
}
