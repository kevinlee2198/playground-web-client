import { Skeleton } from "@/components/ui/skeleton";

const TEAM_BORDER_COLORS = ["border-l-primary", "border-l-accent"] as const;

export default function GameDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6">
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Hero skeleton */}
      <div className="rounded-3xl bg-secondary/50 p-6 sm:p-8">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Score block */}
        <div className="flex items-center justify-between gap-4 px-4 sm:px-8">
          <div className="flex-1 text-center space-y-2">
            <Skeleton className="mx-auto h-5 w-24" />
            <Skeleton className="mx-auto h-14 w-20" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
          <div className="flex-1 text-center space-y-2">
            <Skeleton className="mx-auto h-5 w-24" />
            <Skeleton className="mx-auto h-14 w-20" />
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 mt-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Action bar skeleton */}
      <div className="mt-4 flex items-center gap-2">
        <Skeleton className="h-11 w-full md:w-32" />
        <Skeleton className="h-11 w-11 ml-auto shrink-0" />
      </div>

      {/* Participants skeleton */}
      <section className="mt-8">
        <Skeleton className="h-6 w-32 mb-4" />

        <div className="grid gap-4 md:grid-cols-2">
          {TEAM_BORDER_COLORS.map((borderColor) => (
            <div
              key={borderColor}
              className={`bg-card rounded-2xl shadow-card border-l-[3px] ${borderColor} p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-8 rounded-full shrink-0" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Media skeleton */}
      <section className="mt-8">
        <Skeleton className="h-6 w-24 mb-4" />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </section>

      {/* Box scores skeleton -- rendered inline since the Suspense boundary
          with GameBoxScoresSkeleton only fires after page data loads */}
      <section className="mt-8">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg bg-card px-4 py-3 shadow-card"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="size-5 rounded" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
