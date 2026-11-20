"use client"

import * as React from "react"
import type { DateRange } from "react-day-picker"
import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
  isSameDay,
  eachDayOfInterval,
} from "@/lib/date"
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Printer,
  Share2,
  X,
  Search,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios-config"
import { useUser } from "@/context/UserContext"
import * as XLSX from "xlsx"
import type { TimeEntryWithRelations, Project, Task } from "@/lib/types"
import type { User, ReportFilters, GroupedData, DatePreset, CurrentUser } from "@/types/reports"
import { datePresets } from "@/types/reports"
import { ReportsContentSkeleton, ReportsSkeleton } from "./reports-skeleton"
import { TableSkeleton } from "@/components/loading-skeletons"

// Normalize date string: if no timezone info, treat as UTC
function normalizeDate(dateStr: string): Date {
  if (!dateStr) return new Date()
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 19) ? dateStr : dateStr + 'Z'
  return new Date(normalized)
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function formatDiff(diffSec: number): string {
  const abs = Math.abs(diffSec)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const s = abs % 60
  const sign = diffSec > 0 ? "+" : "-"
  if (h > 0) return `${sign}${h}h${m > 0 ? m + "m" : ""}`
  if (m > 0) return `${sign}${m}m${s > 0 ? s + "s" : ""}`
  return `${sign}${s}s`
}

function SourceBadge({ entry }: { entry: { source?: string | null; originalDuration?: number | null; duration?: number | null; updatedAt?: string | null } }) {
  const source = entry.source ?? "tracker"
  const isTimesheet = source === "timesheet"

  if (isTimesheet) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="12" height="12" rx="1.5"/>
          <path d="M5 8h6M5 5.5h6M5 10.5h4"/>
        </svg>
        Timesheet
      </span>
    )
  }

  const orig = entry.originalDuration
  const curr = entry.duration ?? 0
  const wasEdited = orig != null && orig !== curr

  if (!wasEdited) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100 whitespace-nowrap">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6"/>
          <path d="M8 5v3.5l2 2"/>
        </svg>
        Tracker
      </span>
    )
  }

  const diff = curr - orig
  const isAdded = diff > 0

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
        <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6"/>
          <path d="M8 5v3.5l2 2"/>
        </svg>
        Tracker (edited)
      </span>
      <span className={`text-[10px] font-mono font-semibold ${isAdded ? "text-green-600" : "text-red-500"}`}>
        {formatDiff(diff)}
      </span>
    </div>
  )
}

export function ReportsView() {
  const { user: currentUser, loading: userLoading } = useUser() as { user: CurrentUser | null; loading: boolean }
  const [entries, setEntries] = React.useState<TimeEntryWithRelations[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [users, setUsers] = React.useState<User[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "manager"
  
  const [dateRange, setDateRange] = React.useState<{ from: Date; to: Date }>(() => {
    const today = new Date()
    return { from: startOfWeek(today, { weekStartsOn: 6 }), to: today }
  })
  const [selectedPreset, setSelectedPreset] = React.useState<string>("This week")
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  const [filters, setFilters] = React.useState<ReportFilters>({
    users: [],
    projects: [],
    tasks: [],
    billable: "all",
  })

  const [teamFilterOpen, setTeamFilterOpen] = React.useState(false)
  const [projectFilterOpen, setProjectFilterOpen] = React.useState(false)
  const [taskFilterOpen, setTaskFilterOpen] = React.useState(false)
  const [teamSearch, setTeamSearch] = React.useState("")
  const [showInactiveUsers, setShowInactiveUsers] = React.useState(true)
  const [projectSearch, setProjectSearch] = React.useState("")
  const [taskSearch, setTaskSearch] = React.useState("")

  const [reportType, setReportType] = React.useState<"summary" | "detailed" | "weekly">("summary")

  const [groupBy, setGroupBy] = React.useState<"project" | "user" | "task">("project")

  const [filteredEntries, setFilteredEntries] = React.useState<TimeEntryWithRelations[]>([])
  const [groupedData, setGroupedData] = React.useState<GroupedData[]>([])
  const [dailyData, setDailyData] = React.useState<{ date: Date; duration: number; label: string; projects: { name: string; color: string; duration: number }[] }[]>([])

  const [entriesLoading, setEntriesLoading] = React.useState(false)
  const [loadError, setLoadError] = React.useState("")
  const rangeStartKey = dateRange.from.getTime()
  const rangeEndKey = dateRange.to.getTime()

  React.useEffect(() => {
    if (userLoading) return
    let cancelled = false

    async function fetchMeta() {
      try {
        const projectsRes = await axiosInstance.get("/project", { timeout: 30000 })
        const projectsData = projectsRes.data?.result || projectsRes.data
        if (!cancelled) setProjects(Array.isArray(projectsData) ? projectsData.filter((p: Project) => !p.isArchived) : [])
      } catch { }

      try {
        const tasksRes = await axiosInstance.get("/task", { timeout: 30000 })
        const tasksData = tasksRes.data?.result || tasksRes.data
        if (!cancelled) setTasks(Array.isArray(tasksData) ? tasksData : [])
      } catch { }

      if (isAdmin) {
        try {
          const usersRes = await axiosInstance.get("/user/all", { timeout: 30000 })
          const usersData = usersRes.data?.result || usersRes.data
          if (!cancelled) setUsers(Array.isArray(usersData) ? usersData : [])
        } catch { }
      }
    }

    fetchMeta()
    return () => { cancelled = true }
  }, [userLoading, isAdmin])

  React.useEffect(() => {
    if (userLoading) return
    let cancelled = false

    async function fetchAllPages(url: string, startDate: string, endDate: string, pageSize = 2000) {
      let allItems: TimeEntryWithRelations[] = []
      let page = 1
      let totalPages = 1

      while (page <= totalPages) {
        const res = await axiosInstance.get(url, {
          params: { startDate, endDate, page, pageSize },
          timeout: 60000,
        })
        const data = res.data?.result || res.data
        const items = Array.isArray(data) ? data : (data?.items ?? [])
        allItems = allItems.concat(items)

        if (data?.totalPages) {
          totalPages = data.totalPages
        } else {
          break
        }
        page++
      }

      return allItems
    }

    async function fetchEntries() {
      setEntriesLoading(true)
      setLoadError("")
      const startDate = addDays(new Date(rangeStartKey), -1).toISOString()
      const endDate = addDays(new Date(rangeEndKey), 2).toISOString()

      try {
        const items = await fetchAllPages(isAdmin ? "/time-entry/all" : "/time-entry", startDate, endDate, 2000)
        if (!cancelled) setEntries(items)
      } catch (error: any) {
        console.error("Failed to fetch entries:", error?.response?.data || error?.message || error)
        if (!cancelled) {
          setEntries([])
          setLoadError("Failed to load time entries. Please try again.")
        }
      } finally {
        if (!cancelled) {
          setEntriesLoading(false)
          setIsLoading(false)
        }
      }
    }

    fetchEntries()
    return () => { cancelled = true }
  }, [userLoading, isAdmin, rangeStartKey, rangeEndKey])

  React.useEffect(() => {
    const filtered = entries.filter(e => {
      const entryDate = normalizeDate(e.startTime)
      if (entryDate < dateRange.from || entryDate > addDays(dateRange.to, 1)) {
        return false
      }
      if (filters.users.length > 0 && !filters.users.includes(e.userId)) {
        return false
      }
      if (filters.projects.length > 0) {
        if (!e.projectId || !filters.projects.includes(e.projectId)) {
          return false
        }
      }
      if (filters.tasks.length > 0) {
        if (!e.taskId || !filters.tasks.includes(e.taskId)) {
          return false
        }
      }
      if (filters.billable === "billable" && !e.isBillable) return false
      if (filters.billable === "non-billable" && e.isBillable) return false
      return true
    })

    setFilteredEntries(filtered)

    // Dynamic grouping based on groupBy
    const groupMap = new Map<string, GroupedData>()
    filtered.forEach(e => {
      let key: string
      let groupName: string
      let color: string
      let groupId: number | null

      if (groupBy === "user") {
        groupId = e.userId ?? null
        key = String(e.userId ?? "no-user")
        const user = users.find(u => u.id === e.userId)
        groupName = user
          ? (user.firstName || user.lastName
            ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
            : user.email)
          : "Unknown User"
        color = "#6b7280"
      } else if (groupBy === "task") {
        groupId = e.taskId ?? null
        key = String(e.taskId ?? "no-task")
        const task = tasks.find(t => t.id === e.taskId)
        groupName = task?.name || "No Task"
        color = "#6b7280"
      } else {
        // project (default)
        groupId = e.projectId ?? null
        key = String(e.projectId ?? "no-project")
        const project = projects.find(p => p.id === e.projectId)
        groupName = project?.name || "No Project"
        color = project?.color || "#6b7280"
      }

      const existing = groupMap.get(key)
      const duration = e.duration || 0
      const desc = e.description || "(Without description)"

      if (existing) {
        existing.duration += duration
        const descEntry = existing.descriptions.find(d => d.description === desc)
        if (descEntry) {
          descEntry.duration += duration
        } else {
          existing.descriptions.push({ description: desc, duration })
        }
      } else {
        groupMap.set(key, {
          groupId,
          groupName,
          color,
          duration,
          descriptions: [{ description: desc, duration }],
        })
      }
    })

    setGroupedData(Array.from(groupMap.values()).sort((a, b) => b.duration - a.duration))

    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to })
    const daily = days.map(date => {
      const dayEntries = filtered.filter(e => isSameDay(normalizeDate(e.startTime), date))
      const duration = dayEntries.reduce((acc, e) => acc + (e.duration || 0), 0)
      
      const dayProjectMap = new Map<number | null, { name: string; color: string; duration: number }>()
      dayEntries.forEach(e => {
        const key = e.projectId ?? null
        const existing = dayProjectMap.get(key)
        const projectName = e.project?.name || "No Project"
        const color = e.project?.color || "#6b7280"
        if (existing) {
          existing.duration += e.duration || 0
        } else {
          dayProjectMap.set(key, { name: projectName, color, duration: e.duration || 0 })
        }
      })
      
      return {
        date,
        duration,
        label: format(date, "EEE, MMM d"),
        projects: Array.from(dayProjectMap.values()).sort((a, b) => b.duration - a.duration),
      }
    })
    setDailyData(daily)
  }, [entries, projects, tasks, users, dateRange, filters, groupBy])


  const totalDuration = filteredEntries.reduce((acc, e) => acc + (e.duration || 0), 0)

  const activeFilterCount = 
    (filters.users.length > 0 ? 1 : 0) +
    (filters.projects.length > 0 ? 1 : 0) +
    (filters.tasks.length > 0 ? 1 : 0) +
    (filters.billable !== "all" ? 1 : 0)

  const clearFilters = () => {
    setFilters({ users: [], projects: [], tasks: [], billable: "all" })
  }

  const navigatePeriod = (direction: "prev" | "next") => {
    const days = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
    const offset = direction === "prev" ? -days : days
    setDateRange({
      from: addDays(dateRange.from, offset),
      to: addDays(dateRange.to, offset),
    })
    setSelectedPreset("")
  }

  const applyPreset = (preset: DatePreset) => {
    const { from, to } = preset.getValue()
    setDateRange({ from, to })
    setSelectedPreset(preset.label)
    setIsCalendarOpen(false)
  }

  const exportToExcel = () => {
    if (filteredEntries.length === 0) return

    if (reportType === "summary") {
      const summaryData = groupedData.map((group, index) => ({
        "#": index + 1,
        "Project": group.groupName,
        "Color": group.color,
        "Duration (Hours)": formatDuration(group.duration),
        "Percentage": `${((group.duration / totalDuration) * 100).toFixed(1)}%`,
      }))

      const ws = XLSX.utils.json_to_sheet(summaryData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Summary")

      const dailyRows = dailyData.map(d => ({
        "Date": d.label,
        "Duration (Hours)": formatDuration(d.duration),
      }))
      const wsDaily = XLSX.utils.json_to_sheet(dailyRows)
      XLSX.utils.book_append_sheet(wb, wsDaily, "Daily")

      XLSX.writeFile(wb, `TimeReport_Summary_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    } else if (reportType === "detailed") {
      const detailedData = filteredEntries.map(entry => {
        const project = projects.find(p => p.id === entry.projectId)
        const user = users.find(u => u.id === entry.userId)
        return {
          "Date": format(normalizeDate(entry.startTime), "yyyy-MM-dd"),
          "Start Time": format(normalizeDate(entry.startTime), "HH:mm"),
          "End Time": entry.endTime ? format(normalizeDate(entry.endTime!), "HH:mm") : "-",
          "Project": project?.name || "No Project",
          "Task": entry.task?.name || "-",
          "Description": entry.description || "-",
          "Duration": formatDuration(entry.duration || 0),
          "User": user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : "-",
          "Billable": entry.isBillable ? "Yes" : "No",
          "Source": entry.source === "timesheet" ? "Timesheet" : "Tracker",
          "Edited": (entry.originalDuration != null && entry.originalDuration !== (entry.duration ?? 0))
            ? `Yes (${entry.duration! - entry.originalDuration! > 0 ? "+" : ""}${Math.round((entry.duration! - entry.originalDuration!) / 60)}m)`
            : "No",
        }
      })

      const ws = XLSX.utils.json_to_sheet(detailedData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Detailed")
      XLSX.writeFile(wb, `TimeReport_Detailed_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    } else if (reportType === "weekly") {
      const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).slice(0, 7)

      const weeklyData: Map<string, { name: string; color: string; dailyDurations: number[]; total: number }> = new Map()

      filteredEntries.forEach(entry => {
        const project = projects.find(p => p.id === entry.projectId)
        const key = entry.projectId?.toString() || "no-project"
        const existing = weeklyData.get(key)
        const entryDate = normalizeDate(entry.startTime)
        const dayIndex = days.findIndex(d => isSameDay(d, entryDate))

        if (existing) {
          existing.total += entry.duration || 0
          if (dayIndex >= 0) existing.dailyDurations[dayIndex] += entry.duration || 0
        } else {
          const dailyDurations = new Array(days.length).fill(0)
          if (dayIndex >= 0) dailyDurations[dayIndex] = entry.duration || 0
          weeklyData.set(key, {
            name: project?.name || "No Project",
            color: project?.color || "#6b7280",
            dailyDurations,
            total: entry.duration || 0,
          })
        }
      })

      const weeklyRows = Array.from(weeklyData.entries()).map(([key, item]) => {
        const row: any = { "Project": item.name }
        days.forEach((day, idx) => {
          row[format(day, "EEE")] = formatDuration(item.dailyDurations[idx])
        })
        row["Total"] = formatDuration(item.total)
        return row
      })

      const ws = XLSX.utils.json_to_sheet(weeklyRows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Weekly")
      XLSX.writeFile(wb, `TimeReport_Weekly_${format(new Date(), "yyyy-MM-dd")}.xlsx`)
    }
  }

  const filteredUsers = users.filter(u => {
    if (!showInactiveUsers && u.isActive === false) return false
    const name = `${u.firstName || ""} ${u.lastName || ""} ${u.email}`.toLowerCase()
    return name.includes(teamSearch.toLowerCase())
  })

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  )

  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(taskSearch.toLowerCase())
  )

  if (isLoading) {
    return <ReportsSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Tabs and Date Range */}
      <div className="border-b bg-white">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium text-muted-foreground">TIME REPORT</span>
            <div className="flex border-b">
              <button
                className={cn(
                  "px-6 py-3 text-sm font-medium",
                  reportType === "summary"
                    ? "text-foreground border-b-2 border-foreground bg-white"
                    : "text-muted-foreground hover:text-foreground bg-slate-100"
                )}
                onClick={() => setReportType("summary")}
              >
                Summary
              </button>
              <button
                className={cn(
                  "px-6 py-3 text-sm font-medium",
                  reportType === "detailed"
                    ? "text-foreground border-b-2 border-foreground bg-white"
                    : "text-muted-foreground hover:text-foreground bg-slate-100"
                )}
                onClick={() => setReportType("detailed")}
              >
                Detailed
              </button>
              <button
                className={cn(
                  "px-6 py-3 text-sm font-medium",
                  reportType === "weekly"
                    ? "text-foreground border-b-2 border-foreground bg-white"
                    : "text-muted-foreground hover:text-foreground bg-slate-100"
                )}
                onClick={() => setReportType("weekly")}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Date Range Picker */}
          <div className="flex items-center gap-2">
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex">
                  {/* Presets */}
                  <div className="border-r p-2 w-[140px]">
                    {datePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset)}
                        className={cn(
                          "w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted",
                          selectedPreset === preset.label && "bg-cyan-500 text-white hover:bg-cyan-600"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  {/* Calendar */}
                  <div className="p-2">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: DateRange | undefined) => {
                        if (range?.from && range?.to) {
                          setDateRange({ from: range.from, to: range.to })
                          setSelectedPreset("")
                        } else if (range?.from) {
                          setDateRange({ from: range.from, to: range.from })
                          setSelectedPreset("")
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod("prev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigatePeriod("next")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex items-center gap-2 px-4 py-2 border-t">
          <Button variant="ghost" size="sm" className="gap-1">
            <Filter className="h-4 w-4" />
            FILTER
            {activeFilterCount > 0 && (
              <span className="ml-1 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Team Filter — only for admin/manager */}
          {isAdmin && (
          <Popover open={teamFilterOpen} onOpenChange={setTeamFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Team
                {filters.users.length > 0 && (
                  <span className="ml-1 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {filters.users.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={teamSearch}
                    onChange={(e) => setTeamSearch(e.target.value)}
                    className="pl-8"
                  />
                  {teamSearch && (
                    <button
                      onClick={() => setTeamSearch("")}
                      className="absolute right-2 top-2.5"
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[300px] overflow-auto p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">SHOW</span>
                  <button
                    type="button"
                    className="text-xs text-cyan-500 cursor-pointer"
                    onClick={() => setShowInactiveUsers(prev => !prev)}
                  >
                    {showInactiveUsers ? "All" : "Active"}
                  </button>
                </div>
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <Checkbox
                    checked={filters.users.length === users.length && users.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters(prev => ({ ...prev, users: users.map(u => u.id) }))
                      } else {
                        setFilters(prev => ({ ...prev, users: [] }))
                      }
                    }}
                  />
                  <span className="text-sm">Select all</span>
                </label>
                <div className="mt-2">
                  <span className="text-xs text-muted-foreground">USERS</span>
                  {filteredUsers.map(user => (
                    <label key={user.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <Checkbox
                        checked={filters.users.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({ ...prev, users: [...prev.users, user.id] }))
                          } else {
                            setFilters(prev => ({ ...prev, users: prev.users.filter(id => id !== user.id) }))
                          }
                        }}
                      />
                      <span className="text-sm">
                        {user.firstName || user.lastName
                          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                          : user.email
                        }
                      </span>
                      {user.isActive === false && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                          Inactive
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
          )}

          {/* Project Filter */}
          <Popover open={projectFilterOpen} onOpenChange={setProjectFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Project
                {filters.projects.length > 0 && (
                  <span className="ml-1 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {filters.projects.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-auto p-2">
                <label className="flex items-center gap-2 py-1.5 cursor-pointer">
                  <Checkbox
                    checked={filters.projects.length === projects.length && projects.length > 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFilters(prev => ({ ...prev, projects: projects.map(p => p.id) }))
                      } else {
                        setFilters(prev => ({ ...prev, projects: [] }))
                      }
                    }}
                  />
                  <span className="text-sm">Select all</span>
                </label>
                {filteredProjects.map(project => (
                  <label key={project.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                    <Checkbox
                      checked={filters.projects.includes(project.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFilters(prev => ({ ...prev, projects: [...prev.projects, project.id] }))
                        } else {
                          setFilters(prev => ({ ...prev, projects: prev.projects.filter(id => id !== project.id) }))
                        }
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: project.color || "#3b82f6" }}
                    />
                    <span className="text-sm">{project.name}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Task Filter */}
          <Popover open={taskFilterOpen} onOpenChange={setTaskFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Task
                {filters.tasks.length > 0 && (
                  <span className="ml-1 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {filters.tasks.length}
                  </span>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tasks..."
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-auto p-2">
                {filteredTasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No tasks found</p>
                ) : (
                  filteredTasks.map(task => (
                    <label key={task.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
                      <Checkbox
                        checked={filters.tasks.includes(task.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters(prev => ({ ...prev, tasks: [...prev.tasks, task.id] }))
                          } else {
                            setFilters(prev => ({ ...prev, tasks: prev.tasks.filter(id => id !== task.id) }))
                          }
                        }}
                      />
                      <span className="text-sm">{task.name}</span>
                    </label>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Select
            value={filters.billable}
            onValueChange={(v) => setFilters(prev => ({ ...prev, billable: v as typeof filters.billable }))}
          >
            <SelectTrigger className="w-[100px] h-8 border-0 shadow-none">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="billable">Billable</SelectItem>
              <SelectItem value="non-billable">Non-billable</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-cyan-500 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {/* Total and Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Total:</span>
            <span className="text-xl font-bold">{entriesLoading ? "--:--:--" : formatDuration(totalDuration)}</span>
            {loadError && <span className="text-sm text-red-500">{loadError}</span>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportToExcel}>
              Export
              <ChevronDown className="ml-1 h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "Time Report", text: `Total: ${formatDuration(totalDuration)}` }).catch(() => {})
              } else {
                navigator.clipboard.writeText(`Time Report - Total: ${formatDuration(totalDuration)}`)
              }
            }}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {entriesLoading && (reportType === "summary" ? (
          <ReportsContentSkeleton />
        ) : (
          <div className="bg-white rounded-lg border overflow-hidden">
            <TableSkeleton columns={[{ width: "60%", className: "flex-[3]" }, { width: "6rem" }, { width: "5rem" }, { width: "4rem", align: "right" }]} />
          </div>
        ))}

        {/* Summary View */}
        {!entriesLoading && reportType === "summary" && (
          <>
            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              {/* Bar Chart */}
              <div className="lg:col-span-2 bg-white rounded-lg p-4 border overflow-hidden">
                <div className="overflow-x-auto">
                  <div className="h-[320px] flex items-end gap-2" style={{ minWidth: dailyData.length > 14 ? `${dailyData.length * 60}px` : '100%' }}>
                    {dailyData.map((day, idx) => {
                      const maxDuration = Math.max(...dailyData.map(d => d.duration), 1)
                      const totalHeight = maxDuration > 0 ? (day.duration / maxDuration) * 250 : 0
                      return (
                        <div key={idx} className="flex-1 min-w-[50px] flex flex-col items-center justify-end relative" style={{ height: 320 }}>
                          {day.duration > 0 && (
                            <span className="text-[11px] tabular-nums whitespace-nowrap text-muted-foreground mb-1">
                              {formatDuration(day.duration)}
                            </span>
                          )}
                          <div
                            className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                            style={{ height: Math.max(totalHeight, day.duration > 0 ? 20 : 0) }}
                          >
                            {(day.projects || []).map((project, pIdx) => {
                              const segHeight = day.duration > 0 ? (project.duration / day.duration) * totalHeight : 0
                              return (
                                <Tooltip key={pIdx}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className="w-full cursor-pointer"
                                      style={{
                                        height: Math.max(segHeight, 2),
                                        backgroundColor: project.color,
                                      }}
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="top" align="center">
                                    <p className="font-medium">{project.name}</p>
                                    <p className="text-xs text-muted-foreground">{formatDuration(project.duration)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              )
                            })}
                            {(!day.projects || day.projects.length === 0) && (
                              <div className="w-full" style={{ height: '100%', backgroundColor: '#e2e8f0' }} />
                            )}
                          </div>
                          <span
                            className="mt-2 flex flex-col items-center leading-tight whitespace-nowrap text-muted-foreground"
                            title={format(day.date, "EEEE, MMM d")}
                          >
                            <span className="text-[11px] font-medium text-gray-600">{format(day.date, "EEE")}</span>
                            <span className="text-[11px]">{format(day.date, "MMM d")}</span>
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="bg-white rounded-lg p-4 border">
                <div className="relative w-48 h-48 mx-auto">
                  {groupedData.length > 0 ? (
                    <svg viewBox="0 0 100 100" className="transform -rotate-90">
                      {(() => {
                        let cumulative = 0
                        return groupedData.map((item, idx) => {
                          const percentage = totalDuration > 0 ? (item.duration / totalDuration) * 100 : 0
                          const dashArray = `${percentage} ${100 - percentage}`
                          const dashOffset = -cumulative
                          cumulative += percentage
                          return (
                            <circle
                              key={idx}
                              cx="50"
                              cy="50"
                              r="40"
                              fill="none"
                              stroke={item.color}
                              strokeWidth="20"
                              pathLength={100}
                              strokeDasharray={dashArray}
                              strokeDashoffset={dashOffset}
                              className="transition-all"
                            >
                              <title>{`${item.groupName}: ${formatDuration(item.duration)} (${percentage.toFixed(1)}%)`}</title>
                            </circle>
                          )
                        })
                      })()}
                    </svg>
                  ) : (
                    <div className="w-full h-full rounded-full border-[20px] border-gray-200" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{formatDuration(totalDuration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg border">
              <div className="flex items-center gap-2 p-3 border-b">
                <span className="text-sm text-muted-foreground">Group by:</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                        <ChevronDown className="inline h-4 w-4 mr-1" />
                        TITLE
                      </th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                        DURATION
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center py-8 text-muted-foreground">
                          No time entries in this period
                        </td>
                      </tr>
                    ) : (
                      groupedData.map((group, idx) => (
                        <React.Fragment key={idx}>
                          <tr className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                                  {idx + 1}
                                </span>
                                <div
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: group.color }}
                                />
                                <span className="font-medium text-cyan-600">{group.groupName}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {formatDuration(group.duration)}
                            </td>
                          </tr>
                          {/* Descriptions under project */}
                          {group.descriptions.map((desc, descIdx) => (
                            <tr key={`${idx}-${descIdx}`} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-2 pl-12 text-muted-foreground">
                                {desc.description}
                              </td>
                              <td className="px-4 py-2 text-right text-muted-foreground">
                                {formatDuration(desc.duration)}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Detailed View */}
        {!entriesLoading && reportType === "detailed" && (
          <div className="bg-white rounded-lg border">
            <div className="flex items-center gap-2 p-3 border-b">
              <Button variant="ghost" size="sm" className="gap-1">
                Time audit
                <ChevronDown className="h-4 w-4" />
              </Button>
              <div className="flex-1" />
              <span className="text-sm text-muted-foreground">
                Showing {filteredEntries.length} entries
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="w-10 px-4 py-3">
                      <Checkbox />
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      TIME ENTRY
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      USER
                    </th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                      DATE
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">
                      TIME
                    </th>
                    <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground w-28">
                      DURATION
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-muted-foreground w-36">
                      SOURCE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-muted-foreground">
                        No time entries in this period
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((entry) => {
                      const project = projects.find(p => p.id === entry.projectId)
                      const user = users.find(u => u.id === entry.userId)
                      const userName = user 
                        ? (user.firstName || user.lastName 
                          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                          : user.email)
                        : "Unknown"
                      
                      return (
                        <tr key={entry.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <Checkbox />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">
                                {entry.description || "(no description)"}
                              </span>
                              {project && (
                                <span 
                                  className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
                                  style={{ 
                                    backgroundColor: `${project.color}20` || "#3b82f620",
                                    color: project.color || "#3b82f6"
                                  }}
                                >
                                  <span 
                                    className="w-1.5 h-1.5 rounded-full" 
                                    style={{ backgroundColor: project.color || "#3b82f6" }}
                                  />
                                  {project.name}
                                </span>
                              )}
                              <button className="text-xs text-muted-foreground hover:text-foreground">
                                + Add tags
                              </button>
                              {entry.isBillable && (
                                <span className="text-green-600 font-bold text-sm">$</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {userName}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {format(normalizeDate(entry.startTime), "EEE, MMM d")}
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-muted-foreground">
                            {format(normalizeDate(entry.startTime), "HH:mm")}
                            {" - "}
                            {entry.endTime ? format(normalizeDate(entry.endTime!), "HH:mm") : "..."}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            {formatDuration(entry.duration || 0)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <SourceBadge entry={entry} />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!entriesLoading && reportType === "weekly" && (() => {
          const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).slice(0, 7)
          
          const weeklyData: Map<string, { name: string; color: string; count: number; dailyDurations: number[]; total: number }> = new Map()
          
          filteredEntries.forEach(entry => {
            let key: string
            let name: string
            let color: string
            
            if (groupBy === "project") {
              const project = projects.find(p => p.id === entry.projectId)
              key = entry.projectId?.toString() || "no-project"
              name = project?.name || "No Project"
              color = project?.color || "#6b7280"
            } else if (groupBy === "user") {
              const user = users.find(u => u.id === entry.userId)
              key = entry.userId.toString()
              name = user 
                ? (user.firstName || user.lastName 
                  ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                  : user.email)
                : "Unknown"
              color = "#6b7280"
            } else {
              const task = tasks.find(t => t.id === entry.taskId)
              key = entry.taskId?.toString() || "no-task"
              name = task?.name || "No Task"
              color = "#6b7280"
            }
            
            const existing = weeklyData.get(key)
            const entryDate = normalizeDate(entry.startTime)
            const dayIndex = days.findIndex(d => isSameDay(d, entryDate))
            
            if (existing) {
              existing.count++
              existing.total += entry.duration || 0
              if (dayIndex >= 0) {
                existing.dailyDurations[dayIndex] += entry.duration || 0
              }
            } else {
              const dailyDurations = new Array(days.length).fill(0)
              if (dayIndex >= 0) {
                dailyDurations[dayIndex] = entry.duration || 0
              }
              weeklyData.set(key, {
                name,
                color,
                count: 1,
                dailyDurations,
                total: entry.duration || 0
              })
            }
          })
          
          const dailyTotals = days.map((_, idx) => 
            Array.from(weeklyData.values()).reduce((acc, item) => acc + item.dailyDurations[idx], 0)
          )
          const grandTotal = dailyTotals.reduce((acc, d) => acc + d, 0)
          
          return (
            <div className="bg-white rounded-lg border">
              <div className="flex items-center gap-2 p-3 border-b">
                <span className="text-sm text-muted-foreground">Group by:</span>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
                  <SelectTrigger className="w-[100px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="task">Task</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground min-w-[200px]">
                        {groupBy === "project" ? "PROJECT" : groupBy === "user" ? "USER" : "TASK"}
                      </th>
                      {days.map((day, idx) => (
                        <th key={idx} className="text-center px-3 py-3 text-sm font-medium text-muted-foreground min-w-[80px]">
                          <div>{format(day, "EEE")}</div>
                          <div className="text-xs">{format(day, "MMM d")}</div>
                        </th>
                      ))}
                      <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground min-w-[100px]">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyData.size === 0 ? (
                      <tr>
                        <td colSpan={days.length + 2} className="text-center py-8 text-muted-foreground">
                          No time entries in this period
                        </td>
                      </tr>
                    ) : (
                      Array.from(weeklyData.entries()).map(([key, item]) => (
                        <tr key={key} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {groupBy === "project" && (
                                <span 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ backgroundColor: item.color }}
                                />
                              )}
                              <span className="font-medium text-cyan-600">{item.name}</span>
                              <span className="bg-gray-200 text-gray-600 text-xs px-1.5 py-0.5 rounded">
                                {item.count}
                              </span>
                            </div>
                          </td>
                          {item.dailyDurations.map((duration, idx) => (
                            <td key={idx} className="text-center px-3 py-3 text-sm">
                              {duration > 0 ? formatDuration(duration) : "-"}
                            </td>
                          ))}
                          <td className="px-4 py-3 text-right font-medium">
                            {formatDuration(item.total)}
                          </td>
                        </tr>
                      ))
                    )}
                    {/* Totals row */}
                    {weeklyData.size > 0 && (
                      <tr className="bg-gray-50 font-medium">
                        <td className="px-4 py-3">Total</td>
                        {dailyTotals.map((total, idx) => (
                          <td key={idx} className="text-center px-3 py-3 text-sm">
                            {total > 0 ? formatDuration(total) : "-"}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right font-bold">
                          {formatDuration(grandTotal)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
