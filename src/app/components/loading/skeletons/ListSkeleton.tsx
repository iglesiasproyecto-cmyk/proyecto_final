import { Skeleton } from "@/app/components/ui/skeleton";

interface ListSkeletonProps {
  items?: number;
  avatar?: boolean;
  showBadge?: boolean;
  showActions?: boolean;
}

export function ListSkeleton({
  items = 5,
  avatar = true,
  showBadge = false,
  showActions = true,
}: ListSkeletonProps) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 rounded-2xl border bg-card"
        >
          {avatar && <Skeleton className="h-12 w-12 rounded-full" />}

          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>

          {showBadge && <Skeleton className="h-6 w-20 rounded-full" />}

          {showActions && (
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function NotificationSkeleton({ items = 4 }: { items?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={`flex items-start gap-4 p-4 rounded-2xl border ${
            i === 0 ? "bg-card" : "bg-card"
          }`}
        >
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  );
}