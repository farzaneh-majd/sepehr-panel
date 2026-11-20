import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export function PageLoadingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh overflow-hidden">
      <div className="w-64 border-r bg-sidebar flex flex-col gap-2 p-3 shrink-0">
        <div className="flex items-center gap-2 px-2 py-1 mb-2">
          <Skeleton className="size-8 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-16 ml-2 mb-1" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full rounded-md" />
        ))}
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Skeleton className="h-6 w-6" />
          <Separator orientation="vertical" className="h-4" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  )
}

export type SkeletonColumn = { width: string; avatar?: boolean; align?: "left" | "right"; className?: string }

export function TableSkeleton({
  columns,
  rows = 8,
  className,
}: {
  columns: SkeletonColumn[]
  rows?: number
  className?: string
}) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-4 border-b bg-slate-50 px-4 py-3">
        {columns.map((col, i) => (
          <div key={i} className={cn("flex", col.className ?? "flex-1", col.align === "right" && "justify-end")}>
            <Skeleton className="h-3.5 w-16" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-center gap-4 border-b px-4 py-3.5">
          {columns.map((col, i) => (
            <div key={i} className={cn("flex items-center gap-2", col.className ?? "flex-1", col.align === "right" && "justify-end")}>
              {col.avatar && <Skeleton className="size-7 shrink-0 rounded-full" />}
              <Skeleton className="h-4" style={{ width: row % 3 === 1 ? `calc(${col.width} * 0.7)` : col.width }} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function FilterBarSkeleton({ selects = 3, search = true }: { selects?: number; search?: boolean }) {
  return (
    <div className="flex items-center gap-4 border-b bg-white px-6 py-4">
      <Skeleton className="h-4 w-12" />
      {Array.from({ length: selects }, (_, i) => (
        <Skeleton key={i} className="h-8 w-24" />
      ))}
      {search && <Skeleton className="h-8 flex-1 max-w-md" />}
      <div className="flex-1" />
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

export function TabsSkeleton({ tabs = 3 }: { tabs?: number }) {
  return (
    <div className="flex border-b">
      {Array.from({ length: tabs }, (_, i) => (
        <div key={i} className={cn("px-6 py-3.5", i > 0 && "bg-slate-50")}>
          <Skeleton className="h-4 w-14" />
        </div>
      ))}
    </div>
  )
}
