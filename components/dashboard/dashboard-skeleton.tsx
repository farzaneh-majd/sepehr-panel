import { Skeleton } from "@/components/ui/skeleton"

const BAR_HEIGHTS = [45, 70, 30, 85, 60, 20, 50]

export function DashboardContentSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-6 p-6 pb-0">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col items-center gap-3 border-b py-6">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-40" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-lg border p-4">
            <div className="flex h-64 items-end gap-2">
              {BAR_HEIGHTS.map((height, i) => (
                <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <Skeleton className="w-full rounded-b-none" style={{ height: `${height * 2}px` }} />
                  <Skeleton className="h-3 w-10" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-3 rounded-lg border p-4">
            {[70, 45, 25].map((width, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-2 w-2 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-14" />
                <div className="flex-1">
                  <Skeleton className="h-4 rounded-full" style={{ width: `${width}%` }} />
                </div>
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center rounded-lg border p-4">
            <Skeleton className="h-48 w-48 rounded-full" />
          </div>
          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <Skeleton className="h-4" style={{ width: `${60 - i * 7}%` }} />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-6 pb-4">
        <Skeleton className="h-8 w-36" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-52" />
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <DashboardContentSkeleton />
    </div>
  )
}
