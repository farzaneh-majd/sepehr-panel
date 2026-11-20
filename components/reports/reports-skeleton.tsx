import { Skeleton } from "@/components/ui/skeleton"

const BAR_HEIGHTS = [55, 80, 35, 90, 65, 25, 45]

export function ReportsContentSkeleton() {
  return (
    <>
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border bg-white p-4 lg:col-span-2">
          <div className="flex h-[300px] items-end gap-2">
            {BAR_HEIGHTS.map((height, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
                <Skeleton className="w-full rounded-b-none" style={{ height: `${height * 2.6}px` }} />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center rounded-lg border bg-white p-4">
          <Skeleton className="h-48 w-48 rounded-full" />
        </div>
      </div>

      <div className="rounded-lg border bg-white">
        <div className="flex items-center gap-2 border-b p-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
        <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-3">
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-6" />
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4" style={{ width: `${160 - (i % 3) * 30}px` }} />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  )
}

export function ReportsSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-6">
            <Skeleton className="h-4 w-24" />
            <div className="flex">
              {[0, 1, 2].map((i) => (
                <div key={i} className={i > 0 ? "bg-slate-50 px-6 py-3.5" : "px-6 py-3.5"}>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-[280px]" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="flex items-center gap-3 border-t px-4 py-2.5">
          {[16, 14, 16, 12, 20].map((w, i) => (
            <Skeleton key={i} className="h-7" style={{ width: `${w * 4}px` }} />
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-gray-50 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <ReportsContentSkeleton />
      </div>
    </div>
  )
}
