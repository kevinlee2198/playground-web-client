import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading settings">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-10 w-full max-w-xs" />
      </div>
      <Skeleton className="h-10 w-28" />
    </div>
  );
}
