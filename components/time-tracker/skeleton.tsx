import { Skeleton } from "@/components/ui/skeleton"

function EntryRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-7 w-7 rounded-full" />
    </div>
  )
}

function DayGroupSkeleton() {
  return (
    <div>
      {/* Day header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 border-l-4 border-slate-200">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <EntryRowSkeleton />
      <EntryRowSkeleton />
      <EntryRowSkeleton />
    </div>
  )
}

export function TimeTrackerSkeleton() {
  return (
    <div className="divide-y animate-pulse">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <DayGroupSkeleton />
      <DayGroupSkeleton />

      <div className="flex items-center justify-between px-4 py-2 bg-muted/30">
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <DayGroupSkeleton />
    </div>
  )
}
