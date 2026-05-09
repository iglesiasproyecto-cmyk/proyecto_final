import { Skeleton } from "@/app/components/ui/skeleton";

interface FormSkeletonProps {
  fields?: number;
  showTextarea?: boolean;
  showButtons?: boolean;
}

export function FormSkeleton({
  fields = 4,
  showTextarea = true,
  showButtons = true,
}: FormSkeletonProps) {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: Math.min(fields, 4) }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>

      {showTextarea && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}