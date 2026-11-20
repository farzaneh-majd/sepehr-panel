import { formatDuration, parseDuration, planCellUpdate, rowKey } from "./timesheet-utils"
import type { TimeEntry } from "@/types/timesheet"

const parse = (value: string) => new Date(value)
const day = new Date(2026, 9, 1)

function entry(id: number, start: string, seconds: number, running = false): TimeEntry {
  const startDate = new Date(start)
  return {
    id,
    projectId: 1,
    taskId: null,
    description: "timer work",
    startTime: startDate.toISOString(),
    endTime: running ? null : new Date(startDate.getTime() + seconds * 1000).toISOString(),
    duration: running ? null : seconds,
  }
}

describe("parseDuration", () => {
  it.each([
    ["", 0],
    ["1:30", 5400],
    ["01:05:30", 3930],
    ["8", 28800],
    ["1.5", 5400],
    ["1,5", 5400],
    ["۱٫۵", 5400],
    ["۱:۳۰", 5400],
    [".5", 1800],
    ["2h", 7200],
    ["1h30m", 5400],
    ["1h 30m", 5400],
    ["90m", 5400],
    ["45 min", 2700],
    ["1 hour 15 minutes", 4500],
    ["24", 86400],
    ["  2:00  ", 7200],
  ])("parses %p as %p seconds", (input, seconds) => {
    expect(parseDuration(input)).toEqual({ ok: true, seconds })
  })

  it.each(["abc", "1:75", "1:30:99", "25", "30:00", "1h30", "-1", "1..5", "h"])("rejects %p", (input) => {
    expect(parseDuration(input).ok).toBe(false)
  })
})

describe("formatDuration", () => {
  it("formats hours and minutes", () => {
    expect(formatDuration(0)).toBe("")
    expect(formatDuration(5400)).toBe("1:30")
    expect(formatDuration(3930)).toBe("1:05:30")
    expect(formatDuration(36000)).toBe("10:00")
  })

  it("round-trips through parseDuration", () => {
    for (const seconds of [60, 5400, 3930, 86400]) {
      expect(parseDuration(formatDuration(seconds))).toEqual({ ok: true, seconds })
    }
  })
})

describe("rowKey", () => {
  it("treats null and undefined the same", () => {
    expect(rowKey(1, null)).toBe(rowKey(1, undefined))
    expect(rowKey(null, null)).toBe("none-none")
  })
})

describe("planCellUpdate", () => {
  it("does nothing when the total is unchanged", () => {
    expect(planCellUpdate([entry(1, "2026-10-01T06:00:00Z", 3600)], day, 3600, parse)).toEqual([])
    expect(planCellUpdate([], day, 0, parse)).toEqual([])
  })

  it("creates an entry at 09:00 local time for an empty cell", () => {
    const [op] = planCellUpdate([], day, 5400, parse)
    expect(op.type).toBe("create")
    if (op.type !== "create") return
    const start = new Date(op.startTime)
    expect([start.getFullYear(), start.getMonth(), start.getDate(), start.getHours(), start.getMinutes()]).toEqual([2026, 9, 1, 9, 0])
    expect(op.startTime.endsWith("Z")).toBe(true)
    expect(new Date(op.endTime).getTime() - start.getTime()).toBe(5400 * 1000)
    expect(op.duration).toBe(5400)
  })

  it("updates a single entry keeping its start time", () => {
    const e = entry(7, "2026-10-01T07:15:00Z", 3600)
    expect(planCellUpdate([e], day, 7200, parse)).toEqual([
      { type: "update", id: 7, startTime: "2026-10-01T07:15:00.000Z", endTime: "2026-10-01T09:15:00.000Z", duration: 7200 },
    ])
  })

  it("deletes a single entry when cleared", () => {
    expect(planCellUpdate([entry(7, "2026-10-01T07:15:00Z", 3600)], day, 0, parse)).toEqual([{ type: "delete", id: 7 }])
  })

  it("adds the difference as a new entry after the last one when several entries exist", () => {
    const entries = [entry(1, "2026-10-01T06:00:00Z", 3600), entry(2, "2026-10-01T10:00:00Z", 1800)]
    expect(planCellUpdate(entries, day, 7200, parse)).toEqual([
      { type: "create", startTime: "2026-10-01T10:30:00.000Z", endTime: "2026-10-01T11:00:00.000Z", duration: 1800 },
    ])
  })

  it("reduces several entries from the latest one", () => {
    const entries = [entry(1, "2026-10-01T06:00:00Z", 3600), entry(2, "2026-10-01T10:00:00Z", 1800)]
    expect(planCellUpdate(entries, day, 2700, parse)).toEqual([
      { type: "delete", id: 2 },
      { type: "update", id: 1, startTime: "2026-10-01T06:00:00.000Z", endTime: "2026-10-01T06:45:00.000Z", duration: 2700 },
    ])
  })

  it("deletes all entries when a multi-entry cell is cleared", () => {
    const entries = [entry(1, "2026-10-01T06:00:00Z", 3600), entry(2, "2026-10-01T10:00:00Z", 1800)]
    expect(planCellUpdate(entries, day, 0, parse)).toEqual([{ type: "delete", id: 2 }, { type: "delete", id: 1 }])
  })

  it("never touches a running timer entry", () => {
    const running = entry(9, "2026-10-01T12:00:00Z", 0, true)
    const ops = planCellUpdate([entry(1, "2026-10-01T06:00:00Z", 3600), running], day, 0, parse)
    expect(ops).toEqual([{ type: "delete", id: 1 }])
  })
})
