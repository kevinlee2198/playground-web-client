import { Skeleton } from "@/components/ui/skeleton";

export function GameCardSkeleton() {
  return (
    <div
      data-testid="game-card-skeleton"
      className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10 shadow-card"
    >
      {/* Accent strip */}
      <Skeleton className="h-[3px] w-full rounded-none" />

      <div className="space-y-3 p-4 sm:p-5">
        {/* Sport info row */}
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        {/* Score block */}
        <div className="rounded-xl bg-secondary p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 space-y-2 text-center">
              <Skeleton className="mx-auto h-4 w-20" />
              <Skeleton className="mx-auto h-8 w-10" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
            <div className="flex-1 space-y-2 text-center">
              <Skeleton className="mx-auto h-4 w-20" />
              <Skeleton className="mx-auto h-8 w-10" />
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    </div>
  );
}
