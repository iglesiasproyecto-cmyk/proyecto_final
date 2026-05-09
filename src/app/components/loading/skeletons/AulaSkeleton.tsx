import { Skeleton } from "@/app/components/ui/skeleton";

interface AulaSkeletonProps {
  courses?: number;
  columns?: number;
}

export function AulaSkeleton({ courses = 3, columns = 3 }: AulaSkeletonProps) {
  const gridCols: Record<number, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>

      <div className={`grid ${gridCols[columns] || gridCols[3]} gap-4`}>
        {Array.from({ length: courses }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-card overflow-hidden"
          >
            <Skeleton className="h-36 w-full rounded-none" />

            <div className="p-5 space-y-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />

              <div className="pt-2 space-y-2">
                <div className="flex justify-between text-xs">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ModuleSkeletonProps {
  modules?: number;
}

export function ModuleSkeleton({ modules = 4 }: ModuleSkeletonProps) {
  return (
    <div className="space-y-4 animate-pulse">
      {Array.from({ length: modules }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border bg-card p-4 space-y-3"
        >
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>

          <Skeleton className="h-2 w-full rounded-full" />

          <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}