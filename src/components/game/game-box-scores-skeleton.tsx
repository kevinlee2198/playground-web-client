import { Skeleton } from "@/components/ui/skeleton";

export function GameBoxScoresSkeleton() {
  return (
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
  );
}
