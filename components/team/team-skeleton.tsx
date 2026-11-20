import { Skeleton } from "@/components/ui/skeleton"
import { FilterBarSkeleton, TableSkeleton, TabsSkeleton } from "@/components/loading-skeletons"

export function TeamSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between p-6 pb-4">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-9 w-36" />
      </div>
      <TabsSkeleton />
      <FilterBarSkeleton selects={3} />
      <div className="flex justify-end px-6 py-2">
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="bg-slate-100 px-6 py-2">
          <Skeleton className="h-4 w-20" />
        </div>
        <TableSkeleton
          columns={[
            { width: "10rem", className: "flex-[2]" },
            { width: "12rem", className: "flex-[2]" },
            { width: "4rem" },
            { width: "5rem" },
            { width: "1.5rem", className: "w-[50px] shrink-0" },
          ]}
        />
      </div>
    </div>
  )
}
