import { GameCardSkeleton } from "@/components/game/game-card-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile Header */}
      <section className="mb-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full sm:h-32 sm:w-32" />

          <div className="flex flex-1 flex-col items-center gap-2 sm:items-start">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-64 sm:w-96" />
            <div className="mt-2 flex gap-3">
              <Skeleton className="h-9 w-32 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>
          </div>
        </div>
      </section>

      {/* Game History */}
      <section>
        <Skeleton className="mb-4 h-7 w-36" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      </section>
    </main>
  );
}
