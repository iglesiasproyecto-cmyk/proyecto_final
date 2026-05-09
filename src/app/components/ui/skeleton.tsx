import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-muted relative overflow-hidden rounded-md",
        "after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-foreground/5 after:to-transparent after:translate-x-[-100%]",
        "after:animate-[shimmer_1.5s_infinite]",
        "dark:after:via-foreground/10",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
