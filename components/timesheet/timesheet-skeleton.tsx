import { Skeleton } from "@/components/ui/skeleton"

export const TIMESHEET_GRID = "grid grid-cols-[minmax(220px,1fr)_repeat(7,100px)_90px_40px]"

export function TimesheetRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className={`${TIMESHEET_GRID} border-b`}>
          <div className="flex items-center gap-2 px-4 py-3">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-4" style={{ width: `${45 + ((row * 17) % 35)}%` }} />
          </div>
          {Array.from({ length: 7 }, (_, day) => (
            <div key={day} className="flex items-center justify-center px-2 py-3">
              <Skeleton className="h-8 w-[80px] rounded" />
            </div>
          ))}
          <div className="flex items-center justify-center px-2 py-3">
            <Skeleton className="h-4 w-12" />
          </div>
          <div />
        </div>
      ))}
    </>
  )
}

export function TimesheetSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6 pb-4">
        <Skeleton className="h-8 w-40" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6">
        <div className="min-w-[1080px] overflow-hidden rounded-lg border">
          <div className={`${TIMESHEET_GRID} border-b bg-slate-50`}>
            <div className="px-4 py-3">
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex justify-center px-2 py-3">
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
            <div />
          </div>
          <TimesheetRowsSkeleton />
          <div className={`${TIMESHEET_GRID} bg-slate-50`}>
            <div className="px-4 py-3">
              <Skeleton className="h-4 w-14" />
            </div>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex justify-center px-2 py-3">
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
            <div />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 p-6 pt-4">
        <Skeleton className="h-8 w-32" />
      </div>
    </div>
  )
}
