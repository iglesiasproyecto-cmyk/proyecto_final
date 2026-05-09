import { Skeleton } from "@/app/components/ui/skeleton";

interface SidebarSkeletonProps {
  items?: number;
  collapsed?: boolean;
}

export function SidebarSkeleton({ items = 8, collapsed = false }: SidebarSkeletonProps) {
  return (
    <div className={`space-y-6 animate-pulse ${collapsed ? "px-2" : "px-4"}`}>
      <div className="flex items-center gap-3 px-2 py-2">
        <Skeleton className="h-10 w-10 rounded-lg" />
        {!collapsed && <Skeleton className="h-5 w-28" />}
      </div>

      <div className="space-y-1">
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${
              i === 0 ? "bg-sidebar-accent" : ""
            }`}
          >
            <Skeleton className="h-5 w-5 rounded" />
            {!collapsed && <Skeleton className="h-4 flex-1" />}
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="pt-4 border-t space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      )}
    </div>
  );
}