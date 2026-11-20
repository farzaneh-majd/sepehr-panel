import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfWeek,
  isSameDay,
  isSameMonth,
  isSameYear,
  startOfDay,
  startOfMonth,
  startOfYear,
} from "@/lib/date"
import type { DashboardStats } from "@/types/dashboard"

export type DateRange = { start: Date; end: Date }

export interface StatsEntry {
  projectId?: number | null
  taskId?: number | null
  userId?: number | null
  startTime: string
  duration?: number | null
  project?: { name?: string | null; color?: string | null } | null
  task?: { name?: string | null } | null
}

export interface StatsProject {
  id: number
  name: string
  color?: string | null
}

export const NO_PROJECT_COLOR = "#6b7280"

export function computeDashboardStats(
  entries: StatsEntry[],
  projects: StatsProject[],
  range: DateRange,
  filters: { project: string; user: string },
  parseDate: (value: string) => Date,
  topLimit = 20
): DashboardStats {
  const start = startOfDay(range.start)
  const lastDay = startOfDay(range.end)
  const projectId = filters.project === "all" ? null : Number(filters.project)
  const userId = filters.user === "me" || filters.user === "all" ? null : Number(filters.user)

  const projectInfo = (entry: StatsEntry) => {
    const known = projects.find((p) => p.id === entry.projectId)
    return {
      name: entry.project?.name || known?.name || "No Project",
      color: entry.project?.color || known?.color || NO_PROJECT_COLOR,
    }
  }

  const byDate = new Map<string, StatsEntry[]>()
  let totalDuration = 0
  const projectTotals = new Map<string, { projectId: number | null; projectName: string; color: string; duration: number }>()
  const taskTotals = new Map<string, { projectName: string; taskName: string; duration: number; color: string }>()

  for (const entry of entries) {
    const day = startOfDay(parseDate(entry.startTime))
    if (day < start || day > lastDay) continue
    if (projectId !== null && entry.projectId !== projectId) continue
    if (userId !== null && entry.userId !== userId) continue

    const seconds = Math.max(0, entry.duration ?? 0)
    const info = projectInfo(entry)
    totalDuration += seconds

    const dayKey = day.toDateString()
    byDate.set(dayKey, [...(byDate.get(dayKey) ?? []), entry])

    const projectKey = String(entry.projectId ?? "none")
    const project = projectTotals.get(projectKey) ?? { projectId: entry.projectId ?? null, projectName: info.name, color: info.color, duration: 0 }
    project.duration += seconds
    projectTotals.set(projectKey, project)

    const taskKey = `${entry.projectId ?? "none"}-${entry.taskId ?? "none"}`
    const task = taskTotals.get(taskKey) ?? { projectName: info.name, taskName: entry.task?.name || "", duration: 0, color: info.color }
    task.duration += seconds
    taskTotals.set(taskKey, task)
  }

  const byProject = Array.from(projectTotals.values())
    .filter((p) => p.duration > 0)
    .map((p) => ({ ...p, percent: totalDuration > 0 ? (p.duration / totalDuration) * 100 : 0 }))
    .sort((a, b) => b.duration - a.duration)

  const byDay: DashboardStats["byDay"] = []
  for (let day = start; day <= lastDay; day = addDays(day, 1)) {
    const dayEntries = byDate.get(day.toDateString()) ?? []
    const perProject = new Map<string, { name: string; color: string; duration: number }>()
    let duration = 0
    for (const entry of dayEntries) {
      const seconds = Math.max(0, entry.duration ?? 0)
      const key = String(entry.projectId ?? "none")
      const info = projectInfo(entry)
      const item = perProject.get(key) ?? { name: info.name, color: info.color, duration: 0 }
      item.duration += seconds
      perProject.set(key, item)
      duration += seconds
    }
    byDay.push({
      date: day,
      label: day.toDateString(),
      duration,
      projects: Array.from(perProject.values()).filter((p) => p.duration > 0).sort((a, b) => b.duration - a.duration),
    })
  }

  const topEntries = Array.from(taskTotals.values())
    .filter((t) => t.duration > 0)
    .sort((a, b) => b.duration - a.duration)
    .slice(0, topLimit)

  return {
    totalDuration,
    topProject: byProject.length > 0 ? { name: byProject[0].projectName, duration: byProject[0].duration } : null,
    byProject,
    byDay,
    topEntries,
  }
}

export function barSegments(day: DashboardStats["byDay"][number], maxDayDuration: number, maxHeight: number) {
  const totalHeight = maxDayDuration > 0 ? (day.duration / maxDayDuration) * maxHeight : 0
  return {
    totalHeight,
    segments: day.projects.map((p) => ({ ...p, height: day.duration > 0 ? (p.duration / day.duration) * totalHeight : 0 })),
  }
}

export function donutSegments(byProject: DashboardStats["byProject"], circumference: number) {
  let previous = 0
  return byProject.map((p) => {
    const length = (p.percent / 100) * circumference
    const segment = { ...p, dashArray: `${length} ${circumference - length}`, dashOffset: -previous }
    previous += length
    return segment
  })
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

export function navigatePeriod(range: DateRange, direction: "prev" | "next"): DateRange {
  const step = direction === "prev" ? -1 : 1
  const { start, end } = range

  const singleDay = isSameDay(start, end)
  const weekPeriod = !singleDay && isSameDay(start, startOfWeek(start)) && isSameDay(startOfWeek(end), start) && (isSameDay(end, endOfWeek(start)) || isToday(end))
  if (weekPeriod) {
    const week = addWeeks(start, step)
    return { start: week, end: startOfDay(endOfWeek(week)) }
  }

  const monthPeriod = !singleDay && isSameDay(start, startOfMonth(start)) && isSameMonth(start, end) && (isSameDay(end, endOfMonth(start)) || isToday(end))
  if (monthPeriod) {
    const month = addMonths(startOfMonth(start), step)
    return { start: month, end: startOfDay(endOfMonth(month)) }
  }

  const yearPeriod = !singleDay && isSameDay(start, startOfYear(start)) && isSameYear(start, end) && (isSameDay(end, endOfYear(start)) || isToday(end))
  if (yearPeriod) {
    const year = addYears(startOfYear(start), step)
    return { start: year, end: startOfDay(endOfYear(year)) }
  }

  const days = differenceInCalendarDays(end, start) + 1
  return { start: startOfDay(addDays(start, step * days)), end: startOfDay(addDays(end, step * days)) }
}
