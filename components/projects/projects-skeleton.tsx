import { Skeleton } from "@/components/ui/skeleton"
import { FilterBarSkeleton, TableSkeleton, TabsSkeleton } from "@/components/loading-skeletons"

export function ProjectsListSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6 pb-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-9 w-48" />
      </div>
      <FilterBarSkeleton selects={4} />
      <div className="flex-1 overflow-hidden">
        <div className="bg-slate-100 px-6 py-2">
          <Skeleton className="h-4 w-16" />
        </div>
        <TableSkeleton
          columns={[
            { width: "55%", avatar: false, className: "flex-[3]" },
            { width: "4rem" },
            { width: "2.5rem" },
            { width: "3.5rem" },
            { width: "1.5rem", className: "w-[50px] shrink-0" },
          ]}
        />
      </div>
    </div>
  )
}

export function ProjectDetailSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="p-6 pb-0">
        <Skeleton className="h-4 w-16" />
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-3 rounded-full" />
            <Skeleton className="h-8 w-56" />
          </div>
          <Skeleton className="h-9 w-9" />
        </div>
      </div>
      <div className="mt-4">
        <TabsSkeleton />
      </div>
      <div className="flex items-center gap-4 px-6 py-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-56" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex-1 overflow-hidden px-6">
        <div className="overflow-hidden rounded-lg border">
          <TableSkeleton
            rows={7}
            columns={[
              { width: "50%", className: "flex-[2]" },
              { width: "6rem", avatar: true },
              { width: "1.5rem", className: "w-[50px] shrink-0" },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
