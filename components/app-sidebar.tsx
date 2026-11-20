"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import {
  FolderKanban,
  LayoutDashboard,
  SquareKanban,
  PieChart,
  CalendarDays,
  Timer,
  UsersRound,
  Database,
  Coffee,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useUser } from "@/context/UserContext"
import axiosInstance from "@/lib/axios-config"

const navMain = [
  { title: "Time Tracker",  url: "/dashboard/tracker",   icon: Timer,          items: [] },
  { title: "Dashboard",     url: "/dashboard/analytics", icon: LayoutDashboard,items: [] },
  { title: "Kanban Boards", url: "/dashboard/boards",    icon: SquareKanban,   items: [] },
  { title: "Timesheet",     url: "/dashboard/timesheet", icon: CalendarDays,   items: [] },
  { title: "Time Off",      url: "/dashboard/time-off",  icon: Coffee,         items: [] },
  { title: "Projects",      url: "/dashboard/projects",  icon: FolderKanban,   items: [] },
  { title: "ERD Designer",  url: "/dashboard/erd",       icon: Database,       items: [] },
  { title: "Team",          url: "/dashboard/team",      icon: UsersRound,     items: [] },
  { title: "Reports",       url: "/dashboard/reports",   icon: PieChart,       items: [] },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, avatarBlobUrl, loading } = useUser()
  const [pendingTimeOffCount, setPendingTimeOffCount] = React.useState(0)

  React.useEffect(() => {
    if (loading || !user) return

    const fetchPendingCount = async () => {
      try {
        const endpoint = user.role === "admin" ? "/time-off/all" : "/time-off/my"
        const res = await axiosInstance.get(endpoint)
        const data = res.data?.result ?? res.data
        const list: { status?: string }[] = Array.isArray(data) ? data : (data?.items ?? [])
        setPendingTimeOffCount(list.filter(r => r.status?.toLowerCase() === "pending").length)
      } catch {
        
      }
    }

    fetchPendingCount()
    const interval = setInterval(fetchPendingCount, 60_000)
    return () => clearInterval(interval)
  }, [user, loading])

  const filteredNavMain = React.useMemo(() => {
    if (user?.role === "user") {
      return navMain.filter(item =>
        item.title !== "Projects" &&
        item.title !== "Team"
      )
    }
    return navMain
  }, [user?.role])

  const items = React.useMemo(() =>
    filteredNavMain.map(item => ({
      ...item,
      isActive: pathname === item.url,
      badge: item.title === "Time Off" ? pendingTimeOffCount : undefined,
    })),
    [pathname, filteredNavMain, pendingTimeOffCount]
  )

  const displayName = user
    ? `${user.firstName || user.first_name || ""} ${user.lastName || user.last_name || ""}`.trim() || "User"
    : "User"

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="h-16" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-14 shrink-0 items-center justify-center">
                  <Image src="/icons/logo.svg" alt="Awan" width={52} height={52} unoptimized priority className="size-12 object-contain" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Awan</span>
                  <span className="truncate text-xs">Time Tracker</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {loading ? (
          <div className="space-y-2 px-2 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <NavMain items={items} />
        )}
      </SidebarContent>
      <SidebarFooter>
        {!loading && (
          <NavUser
            user={{
              name: displayName,
              email: user?.email || "",
              avatar: avatarBlobUrl,
            }}
          />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
