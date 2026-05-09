import { Skeleton } from "@/app/components/ui/skeleton";

interface ProfileSkeletonProps {
  showTabs?: boolean;
  showSections?: boolean;
}

export function ProfileSkeleton({
  showTabs = true,
  showSections = true,
}: ProfileSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {showTabs && (
        <div className="flex gap-2 border-b">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" />
          ))}
        </div>
      )}

      {showSections && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card p-6 space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}