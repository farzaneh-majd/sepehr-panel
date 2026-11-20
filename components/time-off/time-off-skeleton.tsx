import { Skeleton } from "@/components/ui/skeleton"

export function TimeOffSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-36" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="bg-white border rounded-xl p-4 flex items-start gap-3">
            <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {[20, 20, 28].map((w, i) => (
          <Skeleton key={i} className="h-7 bg-white/70" style={{ width: `${w * 4}px` }} />
        ))}
      </div>

      <div className="bg-white border rounded-xl p-2 sm:p-4">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-9" />
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="bg-gray-50 py-2 flex justify-center">
              <Skeleton className="h-3 w-8" />
            </div>
          ))}
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="bg-white p-1.5 min-h-[80px] space-y-1.5">
              <Skeleton className="h-3 w-4" />
              {i % 5 === 1 && <Skeleton className="h-3.5 w-full" />}
              {i % 9 === 3 && <Skeleton className="h-3.5 w-3/4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
