import { Skeleton } from "@/app/components/ui/skeleton";

interface CardSkeletonProps {
  items?: number;
  columns?: number;
  showImage?: boolean;
  showActions?: boolean;
}

export function CardSkeleton({
  items = 3,
  columns = 3,
  showImage = false,
  showActions = true,
}: CardSkeletonProps) {
  const gridCols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  return (
    <div className={`grid ${gridCols[columns] || gridCols[3]} gap-4 animate-pulse`}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-card p-5 space-y-4"
        >
          <div className="flex items-start gap-4">
            {showImage && (
              <Skeleton className="h-12 w-12 rounded-lg" />
            )}
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>

          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {showActions && (
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}