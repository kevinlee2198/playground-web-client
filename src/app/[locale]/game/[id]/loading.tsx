import { Skeleton } from "@/components/ui/skeleton";

export default function GameDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-6">
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Hero skeleton */}
      <div className="rounded-3xl bg-secondary/50 p-6 sm:p-8">
        {/* Sport info row */}
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

        {/* Metadata row */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mt-8 space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
