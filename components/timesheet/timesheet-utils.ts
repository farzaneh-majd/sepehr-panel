import type { TimeEntry } from "@/types/timesheet"

export const MAX_DAY_SECONDS = 24 * 3600

export type DurationParse = { ok: true; seconds: number } | { ok: false; error: string }

const FORMAT_HINT = "Use a format like 1:30, 1.5, 1h 30m or 90m"

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[٫,]/g, ".")
    .replace(/؛/g, ":")
}

export function parseDuration(input: string): DurationParse {
  const value = normalizeDigits(input).trim().toLowerCase().replace(/\s+/g, " ")
  if (!value) return { ok: true, seconds: 0 }

  let seconds: number | null = null

  const clock = value.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/)
  const hoursMinutes = value.match(/^(?:(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours))?\s*(?:(\d+)\s*(?:m|min|mins|minute|minutes))?$/)
  const decimal = value.match(/^(\d+(?:\.\d+)?|\.\d+)$/)

  if (clock) {
    const [, h, m, s] = clock
    if (Number(m) >= 60 || (s !== undefined && Number(s) >= 60)) return { ok: false, error: "Minutes and seconds must be below 60" }
    seconds = Number(h) * 3600 + Number(m) * 60 + Number(s ?? 0)
  } else if (decimal) {
    seconds = Math.round(parseFloat(decimal[1]) * 3600)
  } else if (hoursMinutes && (hoursMinutes[1] || hoursMinutes[2])) {
    seconds = Math.round(parseFloat(hoursMinutes[1] ?? "0") * 3600) + Number(hoursMinutes[2] ?? 0) * 60
  }

  if (seconds === null || Number.isNaN(seconds)) return { ok: false, error: FORMAT_HINT }
  if (seconds > MAX_DAY_SECONDS) return { ok: false, error: "A day can't have more than 24 hours" }
  return { ok: true, seconds }
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return ""
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.round(seconds % 60)
  const base = `${hrs}:${mins.toString().padStart(2, "0")}`
  return secs ? `${base}:${secs.toString().padStart(2, "0")}` : base
}

export function rowKey(projectId: number | null | undefined, taskId: number | null | undefined): string {
  return `${projectId ?? "none"}-${taskId ?? "none"}`
}

export function entrySeconds(entry: TimeEntry): number {
  return entry.endTime ? Math.max(0, entry.duration ?? 0) : 0
}

export type CellOperation =
  | { type: "create"; startTime: string; endTime: string; duration: number }
  | { type: "update"; id: number; startTime: string; endTime: string; duration: number }
  | { type: "delete"; id: number }

export function planCellUpdate(
  cellEntries: TimeEntry[],
  day: Date,
  targetSeconds: number,
  parseDate: (value: string) => Date
): CellOperation[] {
  const completed = cellEntries
    .filter((e) => e.endTime)
    .sort((a, b) => parseDate(a.startTime).getTime() - parseDate(b.startTime).getTime())
  const current = completed.reduce((sum, e) => sum + entrySeconds(e), 0)
  if (targetSeconds === current) return []

  const withDuration = (start: Date, duration: number) => ({
    startTime: start.toISOString(),
    endTime: new Date(start.getTime() + duration * 1000).toISOString(),
    duration,
  })

  if (completed.length === 0) {
    const start = new Date(day)
    start.setHours(9, 0, 0, 0)
    return [{ type: "create", ...withDuration(start, targetSeconds) }]
  }

  if (completed.length === 1) {
    const [entry] = completed
    if (targetSeconds === 0) return [{ type: "delete", id: entry.id }]
    return [{ type: "update", id: entry.id, ...withDuration(parseDate(entry.startTime), targetSeconds) }]
  }

  const delta = targetSeconds - current
  if (delta > 0) {
    const last = completed[completed.length - 1]
    const lastEnd = last.endTime ? parseDate(last.endTime) : parseDate(last.startTime)
    return [{ type: "create", ...withDuration(lastEnd, delta) }]
  }

  const operations: CellOperation[] = []
  let remaining = -delta
  for (const entry of [...completed].reverse()) {
    if (remaining <= 0) break
    const seconds = entrySeconds(entry)
    if (seconds <= remaining) {
      operations.push({ type: "delete", id: entry.id })
      remaining -= seconds
    } else {
      operations.push({ type: "update", id: entry.id, ...withDuration(parseDate(entry.startTime), seconds - remaining) })
      remaining = 0
    }
  }
  return operations
}
