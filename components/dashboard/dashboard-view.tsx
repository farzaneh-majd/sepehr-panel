"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import { format, startOfWeek, parseServerDate } from "@/lib/date"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { AlertCircle, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios-config"
import { useUser } from "@/context/UserContext"
import type { TimeEntryWithRelations, Project } from "@/lib/types"
import { DATE_PRESETS } from "@/types/dashboard"
import { DashboardContentSkeleton, DashboardSkeleton } from "./dashboard-skeleton"
import { barSegments, computeDashboardStats, donutSegments, navigatePeriod } from "./dashboard-stats"

const BAR_MAX_HEIGHT = 200
const DONUT_CIRCUMFERENCE = 2 * Math.PI * 40

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function DashboardView() {
  const { user: currentUser, loading: userLoading } = useUser()
  const [entries, setEntries] = React.useState<TimeEntryWithRelations[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [users, setUsers] = React.useState<{ id: number; firstName?: string; lastName?: string; email?: string }[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isFetching, setIsFetching] = React.useState(true)
  const [fetchError, setFetchError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager"

  // Filters
  const [projectFilter, setProjectFilter] = React.useState("all")
  const [userFilter, setUserFilter] = React.useState("me")
  const [dateRange, setDateRange] = React.useState(() => {
    const now = new Date()
    return { start: startOfWeek(now), end: now }
  })
  const [selectedPreset, setSelectedPreset] = React.useState("This week")
  const [topLimit, setTopLimit] = React.useState(10)

  const rangeStartKey = dateRange.start.getTime()
  const rangeEndKey = dateRange.end.getTime()

  React.useEffect(() => {
    if (userLoading) return
    let cancelled = false

    async function fetchMeta() {
      try {
        const projectsRes = await axiosInstance.get("/project")
        const projectsData = projectsRes.data.result || projectsRes.data
        if (!cancelled) setProjects(Array.isArray(projectsData) ? projectsData.filter((p: Project) => !p.isArchived) : [])
      } catch (error) {
        console.error("Failed to fetch projects:", error)
      }

      if (isAdmin) {
        try {
          const usersRes = await axiosInstance.get("/user/all")
          if (!cancelled) setUsers(Array.isArray(usersRes.data?.result ?? usersRes.data) ? (usersRes.data?.result ?? usersRes.data) : [])
        } catch {}
      }
    }

    fetchMeta()
    return () => { cancelled = true }
  }, [userLoading, isAdmin])

  React.useEffect(() => {
    if (userLoading) return
    let cancelled = false

    async function fetchEntries() {
      const entriesEndpoint = isAdmin && userFilter !== "me" ? "/time-entry/all" : "/time-entry"
      const start = new Date(rangeStartKey)
      start.setDate(start.getDate() - 1)
      const end = new Date(rangeEndKey)
      end.setDate(end.getDate() + 2)

      setIsFetching(true)
      setFetchError(null)
      try {
        let items: TimeEntryWithRelations[] = []
        let page = 1
        let totalPages = 1
        while (page <= totalPages) {
          const res = await axiosInstance.get(entriesEndpoint, {
            params: { startDate: start.toISOString(), endDate: end.toISOString(), page, pageSize: 2000 },
            timeout: 60000,
          })
          const data = res.data.result || res.data
          items = items.concat(Array.isArray(data) ? data : (data.items ?? []))
          if (!data?.totalPages) break
          totalPages = data.totalPages
          page++
        }
        if (!cancelled) setEntries(items)
      } catch (error) {
        console.error("Failed to fetch data:", error)
        if (!cancelled) setFetchError("Couldn't load time entries for this period.")
      } finally {
        if (!cancelled) {
          setIsFetching(false)
          setIsLoading(false)
        }
      }
    }

    fetchEntries()
    return () => { cancelled = true }
  }, [userLoading, isAdmin, userFilter, rangeStartKey, rangeEndKey, reloadKey])

  const stats = React.useMemo(
    () => computeDashboardStats(entries, projects, dateRange, { project: projectFilter, user: userFilter }, parseServerDate),
    [entries, projects, dateRange, projectFilter, userFilter]
  )

  const hasData = stats.totalDuration > 0
  const maxDayDuration = Math.max(...stats.byDay.map(d => d.duration), 1)
  const donut = donutSegments(stats.byProject, DONUT_CIRCUMFERENCE)
  const topEntries = stats.topEntries.slice(0, topLimit)

  function handlePresetSelect(preset: typeof DATE_PRESETS[0]) {
    setDateRange(preset.getValue())
    setSelectedPreset(preset.label)
  }

  function handleNavigate(direction: "prev" | "next") {
    setDateRange(navigatePeriod(dateRange, direction))
    setSelectedPreset("")
  }

  if (isLoading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4 border-b">
        <h1 className="text-2xl font-semibold text-slate-700">Dashboard</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Project Filter */}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  <span dir="auto">{p.name}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* User Filter — only for admin/manager */}
          {isAdmin && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Only me</SelectItem>
                <SelectItem value="all">Everyone</SelectItem>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    <span dir="auto">{u.firstName || u.lastName ? `${u.firstName || ""} ${u.lastName || ""}`.trim() : u.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 gap-2">
                <CalendarIcon className="h-4 w-4" />
                {selectedPreset ? `${selectedPreset} · ` : ""}
                {format(dateRange.start, "dd/MM/yyyy")} - {format(dateRange.end, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex">
                {/* Presets */}
                <div className="border-r p-2 w-[140px]">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      className={cn(
                        "w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted",
                        selectedPreset === preset.label && "bg-cyan-500 text-white hover:bg-cyan-600"
                      )}
                      onClick={() => handlePresetSelect(preset)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {/* Calendar */}
                <div className="p-2">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.start, to: dateRange.end }}
                    defaultMonth={dateRange.start}
                    onSelect={(range: DateRange | undefined) => {
                      if (range?.from && range?.to) {
                        setDateRange({ start: range.from, end: range.to })
                        setSelectedPreset("")
                      } else if (range?.from) {
                        setDateRange({ start: range.from, end: range.from })
                        setSelectedPreset("")
                      }
                    }}
                    numberOfMonths={2}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleNavigate("prev")} title="Previous period">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleNavigate("next")} title="Next period">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {fetchError ? (
        <div className="flex flex-col items-center gap-3 p-12 text-center">
          <AlertCircle className="h-8 w-8 text-red-400" />
          <p className="text-sm text-red-600">{fetchError}</p>
          <Button variant="outline" size="sm" onClick={() => setReloadKey(k => k + 1)}>Retry</Button>
        </div>
      ) : isFetching ? (
        <DashboardContentSkeleton />
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-6 p-6 pb-0">
            <div className="text-center py-6 border-b">
              <div className="text-sm text-muted-foreground mb-2">Total time</div>
              <div className="text-3xl font-semibold tabular-nums">{formatDuration(stats.totalDuration)}</div>
            </div>
            <div className="text-center py-6 border-b min-w-0">
              <div className="text-sm text-muted-foreground mb-2">Top Project</div>
              <div dir="auto" className="text-3xl font-semibold truncate" title={stats.topProject?.name}>
                {stats.topProject?.name || "-"}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Charts */}
              <div className="lg:col-span-2 space-y-6 min-w-0">
                {/* Bar Chart */}
                <div className="border rounded-lg p-4">
                  <div className="overflow-x-auto">
                    <div className="flex items-end gap-2 h-64" style={{ minWidth: stats.byDay.length > 14 ? `${stats.byDay.length * 56}px` : '100%' }}>
                      {stats.byDay.map((day) => {
                        const { totalHeight, segments } = barSegments(day, maxDayDuration, BAR_MAX_HEIGHT)
                        return (
                          <div key={day.label} className="flex-1 min-w-[44px] flex flex-col items-center justify-end relative">
                            {day.duration > 0 && (
                              <div className="text-xs text-muted-foreground mb-1 tabular-nums">
                                {formatDuration(day.duration)}
                              </div>
                            )}
                            <div className="w-full flex flex-col justify-end rounded-t overflow-hidden" style={{ height: Math.max(totalHeight, 4) }}>
                              {segments.map((project, segmentIndex) => (
                                <Tooltip key={segmentIndex}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="w-full shrink-0 cursor-pointer"
                                      style={{ height: Math.max(project.height, 2), backgroundColor: project.color }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="center">
                                    <p dir="auto" className="font-medium">{project.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatDuration(project.duration)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              ))}
                              {segments.length === 0 && (
                                <div className="w-full" style={{ height: 4, backgroundColor: '#e2e8f0' }} />
                              )}
                            </div>
                            <div className="h-8 mt-2 flex flex-col items-center justify-start text-xs leading-4 text-muted-foreground text-center whitespace-nowrap" title={format(day.date, "EEEE, MMM d, yyyy")}>
                              <span>{format(day.date, "EEE")}</span>
                              <span>{format(day.date, "MMM d")}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Project Breakdown */}
                <div className="border rounded-lg p-4">
                  {!hasData && (
                    <p className="py-6 text-center text-sm text-muted-foreground">No time tracked in this period</p>
                  )}
                  {stats.byProject.map((project) => (
                    <div key={project.projectId ?? "none"} className="flex items-center gap-4 py-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                      <span dir="auto" className="w-40 truncate" title={project.projectName}>{project.projectName}</span>
                      <span className="text-muted-foreground tabular-nums">{formatDuration(project.duration)}</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${project.percent}%`, backgroundColor: project.color }}
                        />
                      </div>
                      <span className="text-muted-foreground w-12 text-right tabular-nums">
                        {project.percent.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column - Donut + Top Entries */}
              <div className="space-y-6 min-w-0">
                {/* Donut Chart */}
                <div className="border rounded-lg p-4 flex flex-col items-center">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                      {donut.map((segment) => (
                        <circle
                          key={segment.projectId ?? "none"}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="20"
                          strokeDasharray={segment.dashArray}
                          strokeDashoffset={segment.dashOffset}
                        >
                          <title>{`${segment.projectName}: ${formatDuration(segment.duration)} (${segment.percent.toFixed(0)}%)`}</title>
                        </circle>
                      ))}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xl font-semibold tabular-nums">
                        {formatDuration(stats.totalDuration)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top Entries */}
                <div className="border rounded-lg">
                  <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Top {topLimit}</span>
                    <Select value={String(topLimit)} onValueChange={(value) => setTopLimit(Number(value))}>
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">Top 10</SelectItem>
                        <SelectItem value="20">Top 20</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="divide-y max-h-80 overflow-auto">
                    {topEntries.map((entry, index) => (
                      <div key={index} className="px-4 py-2 flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || "#3b82f6" }} />
                          <span dir="auto" className="truncate" title={entry.taskName ? `${entry.projectName}: ${entry.taskName}` : entry.projectName}>
                            {entry.projectName}
                            {entry.taskName && `: ${entry.taskName}`}
                          </span>
                        </div>
                        <span className="text-muted-foreground tabular-nums shrink-0">{formatDuration(entry.duration)}</span>
                      </div>
                    ))}
                    {topEntries.length === 0 && (
                      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No entries in this period
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
