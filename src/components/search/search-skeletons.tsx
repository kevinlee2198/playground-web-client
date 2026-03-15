import { Skeleton } from "@/components/ui/skeleton";

interface SearchSkeletonsProps {
  count?: number;
}

export function SearchSkeletons({ count = 3 }: SearchSkeletonsProps) {
  return (
    <div className="divide-y">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-1.5 px-4 py-2.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
