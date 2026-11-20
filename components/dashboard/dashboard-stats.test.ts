import { addDays, endOfMonth, endOfWeek, isSameDay, startOfMonth, startOfWeek, startOfYear, endOfYear, addMonths } from "@/lib/date"
import { barSegments, computeDashboardStats, donutSegments, navigatePeriod, type StatsEntry } from "./dashboard-stats"

const parse = (value: string) => new Date(value)
const at = (day: Date, hour: number) => {
  const d = new Date(day)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const monday = new Date(2026, 8, 28)
const projects = [
  { id: 1, name: "Awan", color: "#0ea5e9" },
  { id: 2, name: "HSSE", color: "#f97316" },
]

const entries: StatsEntry[] = [
  { projectId: 1, taskId: 10, userId: 1, startTime: at(monday, 9), duration: 3600, task: { name: "UI" } },
  { projectId: 1, taskId: 10, userId: 1, startTime: at(monday, 13), duration: 1800, task: { name: "UI" } },
  { projectId: 2, taskId: null, userId: 2, startTime: at(monday, 10), duration: 7200 },
  { projectId: null, taskId: null, userId: 1, startTime: at(addDays(monday, 1), 9), duration: 900 },
  { projectId: 1, taskId: 11, userId: 1, startTime: at(addDays(monday, 1), 9), duration: null },
  { projectId: 2, taskId: null, userId: 1, startTime: at(addDays(monday, 5), 9), duration: 600 },
]

const range = { start: monday, end: addDays(monday, 2) }
const all = { project: "all", user: "all" }

describe("computeDashboardStats", () => {
  it("totals only entries inside the range", () => {
    const stats = computeDashboardStats(entries, projects, range, all, parse)
    expect(stats.totalDuration).toBe(3600 + 1800 + 7200 + 900)
    expect(stats.byDay.map((d) => d.duration)).toEqual([12600, 900, 0])
  })

  it("groups by project with percentages and top project", () => {
    const stats = computeDashboardStats(entries, projects, range, all, parse)
    expect(stats.byProject.map((p) => [p.projectName, p.duration])).toEqual([["HSSE", 7200], ["Awan", 5400], ["No Project", 900]])
    expect(stats.byProject.reduce((sum, p) => sum + p.percent, 0)).toBeCloseTo(100)
    expect(stats.topProject).toEqual({ name: "HSSE", duration: 7200 })
  })

  it("applies project and user filters", () => {
    expect(computeDashboardStats(entries, projects, range, { project: "1", user: "all" }, parse).totalDuration).toBe(5400)
    expect(computeDashboardStats(entries, projects, range, { project: "all", user: "2" }, parse).totalDuration).toBe(7200)
    expect(computeDashboardStats(entries, projects, range, { project: "all", user: "me" }, parse).totalDuration).toBe(13500)
  })

  it("stacks projects per day largest first", () => {
    const stats = computeDashboardStats(entries, projects, range, all, parse)
    expect(stats.byDay[0].projects.map((p) => [p.name, p.duration])).toEqual([["HSSE", 7200], ["Awan", 5400]])
  })

  it("builds top entries by project and task with a limit", () => {
    const stats = computeDashboardStats(entries, projects, range, all, parse, 2)
    expect(stats.topEntries.map((e) => [e.projectName, e.taskName, e.duration])).toEqual([["HSSE", "", 7200], ["Awan", "UI", 5400]])
  })

  it("returns empty days for a range without entries", () => {
    const stats = computeDashboardStats([], projects, range, all, parse)
    expect(stats.totalDuration).toBe(0)
    expect(stats.byDay).toHaveLength(3)
    expect(stats.topProject).toBeNull()
  })

  it("includes the whole end day regardless of time", () => {
    const end = new Date(addDays(monday, 5))
    end.setHours(0, 0, 0, 0)
    const stats = computeDashboardStats(entries, projects, { start: monday, end }, all, parse)
    expect(stats.byDay).toHaveLength(6)
    expect(stats.byDay[5].duration).toBe(600)
  })
})

describe("barSegments", () => {
  it("scales project segments to the bar height", () => {
    const stats = computeDashboardStats(entries, projects, range, all, parse)
    const { totalHeight, segments } = barSegments(stats.byDay[1], 12600, 200)
    expect(totalHeight).toBeCloseTo((900 / 12600) * 200)
    expect(segments.reduce((sum, s) => sum + s.height, 0)).toBeCloseTo(totalHeight)
    const tallest = barSegments(stats.byDay[0], 12600, 200)
    expect(tallest.totalHeight).toBe(200)
    expect(tallest.segments.reduce((sum, s) => sum + s.height, 0)).toBeCloseTo(200)
  })
})

describe("donutSegments", () => {
  it("places segments one after another around the circle", () => {
    const stats = computeDashboardStats(entries, projects, range, all, parse)
    const circumference = 100
    const segments = donutSegments(stats.byProject, circumference)
    let expectedOffset = 0
    for (const segment of segments) {
      expect(segment.dashOffset).toBeCloseTo(-expectedOffset)
      const [dash, gap] = segment.dashArray.split(" ").map(Number)
      expect(dash + gap).toBeCloseTo(circumference)
      expectedOffset += dash
    }
    expect(expectedOffset).toBeCloseTo(circumference)
  })
})

describe("navigatePeriod", () => {
  it("moves a custom range by its length", () => {
    const next = navigatePeriod({ start: monday, end: addDays(monday, 2) }, "next")
    expect(isSameDay(next.start, addDays(monday, 3))).toBe(true)
    expect(isSameDay(next.end, addDays(monday, 5))).toBe(true)
  })

  it("moves a single day even when it is the first day of a week or month", () => {
    const weekStart = startOfWeek(new Date(2026, 5, 10))
    const monthStart = startOfMonth(new Date(2026, 5, 10))
    for (const day of [weekStart, monthStart]) {
      const prev = navigatePeriod({ start: day, end: day }, "prev")
      expect(isSameDay(prev.start, addDays(day, -1))).toBe(true)
      expect(isSameDay(prev.end, addDays(day, -1))).toBe(true)
    }
  })

  it("moves a single day", () => {
    const prev = navigatePeriod({ start: monday, end: monday }, "prev")
    expect(isSameDay(prev.start, addDays(monday, -1))).toBe(true)
    expect(isSameDay(prev.end, addDays(monday, -1))).toBe(true)
  })

  it("moves this week (to today) to the full previous week", () => {
    const today = new Date()
    const prev = navigatePeriod({ start: startOfWeek(today), end: today }, "prev")
    expect(isSameDay(prev.start, startOfWeek(addDays(startOfWeek(today), -1)))).toBe(true)
    expect(isSameDay(prev.end, addDays(startOfWeek(today), -1))).toBe(true)
  })

  it("moves a full week forward by one week", () => {
    const week = startOfWeek(new Date(2026, 5, 10))
    const next = navigatePeriod({ start: week, end: endOfWeek(week) }, "next")
    expect(isSameDay(next.start, addDays(week, 7))).toBe(true)
    expect(isSameDay(next.end, addDays(week, 13))).toBe(true)
  })

  it("moves a full month by calendar month", () => {
    const month = startOfMonth(addMonths(new Date(), -3))
    const prev = navigatePeriod({ start: month, end: endOfMonth(month) }, "prev")
    const expected = startOfMonth(addMonths(month, -1))
    expect(isSameDay(prev.start, expected)).toBe(true)
    expect(isSameDay(prev.end, endOfMonth(expected))).toBe(true)
  })

  it("moves this month (to today) to the full previous month", () => {
    const prev = navigatePeriod({ start: startOfMonth(new Date()), end: new Date() }, "prev")
    const expected = startOfMonth(addMonths(new Date(), -1))
    expect(isSameDay(prev.start, expected)).toBe(true)
    expect(isSameDay(prev.end, endOfMonth(expected))).toBe(true)
  })

  it("moves a full year by calendar year", () => {
    const year = startOfYear(new Date(2025, 5, 1))
    const next = navigatePeriod({ start: year, end: endOfYear(year) }, "next")
    expect(isSameDay(next.start, startOfYear(addDays(endOfYear(year), 1)))).toBe(true)
  })
})
