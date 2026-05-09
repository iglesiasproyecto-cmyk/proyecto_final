import { Skeleton } from "@/app/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showPagination?: boolean;
  columnWidths?: string[];
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  showPagination = false,
  columnWidths,
}: TableSkeletonProps) {
  const defaultWidths = Array.from({ length: columns }, (_, i) => {
    if (i === 0) return "flex-1";
    if (i === columns - 1) return "w-24";
    return "flex-1";
  });
  const widths = columnWidths || defaultWidths;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden animate-pulse">
      <div className="border-b bg-muted/30 p-4">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={`h-4 ${widths[i]}`} />
          ))}
        </div>
      </div>

      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={rowIdx} className="p-4 flex gap-4 items-center hover:bg-muted/20 transition-colors">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={colIdx}
                className={`h-4 ${widths[colIdx]} ${
                  colIdx === 0 ? "skeleton-shimmer" : ""
                }`}
              />
            ))}
          </div>
        ))}
      </div>

      {showPagination && (
        <div className="border-t bg-muted/30 p-4 flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}
    </div>
  );
}