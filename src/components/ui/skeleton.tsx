import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted relative overflow-hidden rounded-md", className)}
      {...props}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-card/40 to-transparent will-change-transform motion-reduce:animate-none"
      />
    </div>
  )
}

export { Skeleton }
