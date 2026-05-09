import { Skeleton } from "@/app/components/ui/skeleton";
import { FormSkeleton } from "./FormSkeleton";
import { CardSkeleton } from "./CardSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ListSkeleton } from "./ListSkeleton";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { AulaSkeleton } from "./AulaSkeleton";

export type SkeletonType =
  | "dashboard"
  | "table"
  | "cards"
  | "form"
  | "profile"
  | "list"
  | "aula"
  | "modules";

interface PageSkeletonProps {
  type: SkeletonType;
  rows?: number;
  items?: number;
  columns?: number;
  showImage?: boolean;
  showActions?: boolean;
  showPagination?: boolean;
  showTabs?: boolean;
  showSections?: boolean;
  courses?: number;
  modules?: number;
  className?: string;
}

export function PageSkeleton({
  type,
  rows,
  items,
  columns,
  showImage,
  showActions,
  showPagination,
  showTabs,
  showSections,
  courses,
  modules,
  className = "",
}: PageSkeletonProps) {
  switch (type) {
    case "dashboard":
      return <DashboardSkeleton />;
    case "table":
      return (
        <TableSkeleton
          rows={rows}
          columns={columns}
          showPagination={showPagination}
        />
      );
    case "cards":
      return (
        <CardSkeleton
          items={items}
          columns={columns}
          showImage={showImage}
          showActions={showActions}
        />
      );
    case "form":
      return <FormSkeleton />;
    case "profile":
      return (
        <ProfileSkeleton
          showTabs={showTabs}
          showSections={showSections}
        />
      );
    case "list":
      return (
        <ListSkeleton
          items={items}
          showBadge={true}
          showActions={showActions}
        />
      );
    case "aula":
      return <AulaSkeleton courses={courses} columns={columns} />;
    case "modules":
      return <ModuleSkeleton modules={modules} />;
    default:
      return <DashboardSkeleton />;
  }
}

export {
  DashboardSkeleton,
  TableSkeleton,
  CardSkeleton,
  FormSkeleton,
  ProfileSkeleton,
  ListSkeleton,
  NotificationSkeleton,
  AulaSkeleton,
  ModuleSkeleton,
};