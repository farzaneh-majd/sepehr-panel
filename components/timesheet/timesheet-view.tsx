"use client"

import * as React from "react"
import {
  addDays,
  startOfWeek,
  format,
  isSameDay,
  subWeeks,
  addWeeks,
  parseServerDate,
} from "@/lib/date"
import {
  AlertCircle,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios-config"
import type { Project, Task } from "@/lib/types"
import type { TimeEntry } from "@/types/timesheet"
import { TIMESHEET_GRID, TimesheetRowsSkeleton, TimesheetSkeleton } from "./timesheet-skeleton"
import { entrySeconds, formatDuration, parseDuration, planCellUpdate, rowKey } from "./timesheet-utils"

const WEEK_OPTIONS = { weekStartsOn: 6 } as const

interface DraftRow {
  id: string
  projectId: number | null
  taskId: number | null
}

interface ViewRow {
  id: string
  draftId: string | null
  projectId: number | null
  taskId: number | null
  projectName: string
  projectColor: string
  taskName: string
  dailyDurations: number[]
  cellEntries: TimeEntry[][]
}

type EditingCell = { rowId: string; dayIndex: number }

const cellId = (rowId: string, dayIndex: number) => `${rowId}:${dayIndex}`

export function TimesheetView() {
  const [projects, setProjects] = React.useState<Project[]>([])
  const [tasks, setTasks] = React.useState<Task[]>([])
  const [metaLoading, setMetaLoading] = React.useState(true)

  const [entries, setEntries] = React.useState<TimeEntry[]>([])
  const [entriesLoading, setEntriesLoading] = React.useState(true)
  const [entriesLoaded, setEntriesLoaded] = React.useState(false)
  const [entriesError, setEntriesError] = React.useState<string | null>(null)
  const requestId = React.useRef(0)

  const [weekStart, setWeekStart] = React.useState(() => startOfWeek(new Date(), WEEK_OPTIONS))
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  const [drafts, setDrafts] = React.useState<DraftRow[]>([])
  const [editing, setEditing] = React.useState<EditingCell | null>(null)
  const editingRef = React.useRef<EditingCell | null>(null)
  const [editValue, setEditValue] = React.useState("")
  const [editError, setEditError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState<Record<string, number>>({})
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [rowToRemove, setRowToRemove] = React.useState<ViewRow | null>(null)
  const [isRemoving, setIsRemoving] = React.useState(false)

  const weekDays = React.useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])
  const currentWeekStart = startOfWeek(new Date(), WEEK_OPTIONS)
  const isThisWeek = isSameDay(weekStart, currentWeekStart)
  const isLastWeek = isSameDay(weekStart, subWeeks(currentWeekStart, 1))
  const weekRange = `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
  const weekLabel = isThisWeek ? "This week" : isLastWeek ? "Last week" : weekRange

  const fetchEntries = React.useCallback(async () => {
    const id = ++requestId.current
    setEntriesLoading(true)
    try {
      const res = await axiosInstance.get("/time-entry", {
        params: {
          startDate: addDays(weekStart, -1).toISOString(),
          endDate: addDays(weekStart, 8).toISOString(),
          page: 1,
          pageSize: 1000,
        },
      })
      if (id !== requestId.current) return
      const data = res.data?.result ?? res.data
      setEntries(Array.isArray(data) ? data : (data?.items ?? []))
      setEntriesError(null)
    } catch (error) {
      console.error("Failed to fetch entries:", error)
      if (id === requestId.current) setEntriesError("Couldn't load time entries.")
    } finally {
      if (id === requestId.current) {
        setEntriesLoading(false)
        setEntriesLoaded(true)
      }
    }
  }, [weekStart])

  React.useEffect(() => {
    let cancelled = false
    Promise.all([axiosInstance.get("/project"), axiosInstance.get("/task")])
      .then(([projectsRes, tasksRes]) => {
        if (cancelled) return
        setProjects(projectsRes.data?.result ?? projectsRes.data ?? [])
        setTasks(tasksRes.data?.result ?? tasksRes.data ?? [])
      })
      .catch((error) => console.error("Failed to fetch projects/tasks:", error))
      .finally(() => {
        if (!cancelled) setMetaLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const rows = React.useMemo(() => {
    const byKey = new Map<string, ViewRow>()
    for (const entry of entries) {
      const dayIndex = weekDays.findIndex((d) => isSameDay(d, parseServerDate(entry.startTime)))
      if (dayIndex === -1) continue
      const key = rowKey(entry.projectId, entry.taskId)
      let row = byKey.get(key)
      if (!row) {
        const project = projects.find((p) => p.id === entry.projectId)
        const task = tasks.find((t) => t.id === entry.taskId)
        row = {
          id: key,
          draftId: null,
          projectId: entry.projectId ?? null,
          taskId: entry.taskId ?? null,
          projectName: entry.project?.name || project?.name || "No project",
          projectColor: entry.project?.color || project?.color || "#6b7280",
          taskName: entry.task?.name || task?.name || "",
          dailyDurations: [0, 0, 0, 0, 0, 0, 0],
          cellEntries: [[], [], [], [], [], [], []],
        }
        byKey.set(key, row)
      }
      row.cellEntries[dayIndex].push(entry)
      row.dailyDurations[dayIndex] += entrySeconds(entry)
    }

    const saved = Array.from(byKey.values()).sort(
      (a, b) => a.projectName.localeCompare(b.projectName) || a.taskName.localeCompare(b.taskName)
    )

    const draftRows: ViewRow[] = drafts
      .filter((d) => d.projectId === null || !byKey.has(rowKey(d.projectId, d.taskId)))
      .map((d) => {
        const project = projects.find((p) => p.id === d.projectId)
        return {
          id: `draft:${d.id}`,
          draftId: d.id,
          projectId: d.projectId,
          taskId: d.taskId,
          projectName: project?.name ?? "",
          projectColor: project?.color || "#22d3ee",
          taskName: tasks.find((t) => t.id === d.taskId)?.name ?? "",
          dailyDurations: [0, 0, 0, 0, 0, 0, 0],
          cellEntries: [[], [], [], [], [], [], []],
        }
      })

    return [...saved, ...draftRows]
  }, [entries, weekDays, drafts, projects, tasks])

  const activeProjects = React.useMemo(() => projects.filter((p) => !p.isArchived), [projects])

  const cellValue = (row: ViewRow, dayIndex: number) => pending[cellId(row.id, dayIndex)] ?? row.dailyDurations[dayIndex]
  const dailyTotals = weekDays.map((_, dayIndex) => rows.reduce((sum, row) => sum + cellValue(row, dayIndex), 0))
  const weekTotal = dailyTotals.reduce((sum, d) => sum + d, 0)
  const rowTotal = (row: ViewRow) => row.dailyDurations.reduce((sum, _, i) => sum + cellValue(row, i), 0)
  const canEditRow = (row: ViewRow) => !(row.draftId && row.projectId === null)

  const changeWeek = (next: Date) => {
    editingRef.current = null
    setEditing(null)
    setDrafts([])
    setWeekStart(next)
  }

  const selectWeek = (date: Date | undefined) => {
    if (!date) return
    changeWeek(startOfWeek(date, WEEK_OPTIONS))
    setIsCalendarOpen(false)
  }

  const addDraft = () => {
    setDrafts((prev) => [...prev, { id: String(Date.now()), projectId: null, taskId: null }])
  }

  const updateDraft = (draftId: string, changes: Partial<DraftRow>) => {
    setDrafts((prev) => prev.map((d) => (d.id === draftId ? { ...d, ...changes } : d)))
  }

  const startEditing = (row: ViewRow, dayIndex: number) => {
    if (!canEditRow(row) || pending[cellId(row.id, dayIndex)] !== undefined) return
    const cell = { rowId: row.id, dayIndex }
    editingRef.current = cell
    setEditing(cell)
    setEditValue(formatDuration(cellValue(row, dayIndex)))
    setEditError(null)
  }

  const stopEditing = () => {
    editingRef.current = null
    setEditing(null)
    setEditValue("")
    setEditError(null)
  }

  const saveCell = async (row: ViewRow, dayIndex: number, seconds: number) => {
    const operations = planCellUpdate(row.cellEntries[dayIndex], weekDays[dayIndex], seconds, parseServerDate)
    if (operations.length === 0) return

    const id = cellId(row.id, dayIndex)
    setPending((prev) => ({ ...prev, [id]: seconds }))
    setActionError(null)
    try {
      for (const op of operations) {
        if (op.type === "create") {
          await axiosInstance.post("/time-entry", {
            projectId: row.projectId,
            taskId: row.taskId,
            description: row.taskName || "",
            startTime: op.startTime,
            endTime: op.endTime,
            duration: op.duration,
            source: "timesheet",
          })
        } else if (op.type === "update") {
          await axiosInstance.put(`/time-entry/${op.id}`, {
            startTime: op.startTime,
            endTime: op.endTime,
            duration: op.duration,
          })
        } else {
          await axiosInstance.delete(`/time-entry/${op.id}`)
        }
      }
      if (row.draftId) setDrafts((prev) => prev.filter((d) => d.id !== row.draftId))
    } catch (error) {
      console.error("Failed to save time entry:", error)
      setActionError(`Couldn't save the time for ${row.projectName || "this row"} on ${format(weekDays[dayIndex], "EEE, MMM d")}. Please try again.`)
    }
    await fetchEntries()
    setPending((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const commitEdit = (mode: "enter" | "blur" | "tab", backwards = false) => {
    const cell = editingRef.current
    if (!cell) return
    const row = rows.find((r) => r.id === cell.rowId)
    if (!row) {
      stopEditing()
      return
    }

    const parsed = parseDuration(editValue)
    if (!parsed.ok) {
      if (mode === "blur") {
        setActionError(`"${editValue}" isn't a valid time, so it wasn't saved. ${parsed.error}.`)
        stopEditing()
      } else {
        setEditError(parsed.error)
      }
      return
    }

    stopEditing()
    saveCell(row, cell.dayIndex, parsed.seconds)

    if (mode === "tab") {
      const nextDay = cell.dayIndex + (backwards ? -1 : 1)
      if (nextDay >= 0 && nextDay < 7) {
        const next = { rowId: row.id, dayIndex: nextDay }
        editingRef.current = next
        setEditing(next)
        setEditValue(formatDuration(cellValue(row, nextDay)))
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault()
      commitEdit("enter")
    } else if (e.key === "Escape") {
      e.preventDefault()
      stopEditing()
    } else if (e.key === "Tab") {
      e.preventDefault()
      commitEdit("tab", e.shiftKey)
    }
  }

  const removeRow = (row: ViewRow) => {
    if (row.draftId) {
      setDrafts((prev) => prev.filter((d) => d.id !== row.draftId))
      return
    }
    setRowToRemove(row)
  }

  const confirmRemoveRow = async () => {
    if (!rowToRemove) return
    setIsRemoving(true)
    setActionError(null)
    const ids = rowToRemove.cellEntries.flat().filter((e) => e.endTime).map((e) => e.id)
    try {
      await Promise.all(ids.map((id) => axiosInstance.delete(`/time-entry/${id}`)))
    } catch (error) {
      console.error("Failed to delete time entries:", error)
      setActionError("Some time entries couldn't be deleted. Please try again.")
    }
    await fetchEntries()
    setIsRemoving(false)
    setRowToRemove(null)
  }

  const removableCount = rowToRemove ? rowToRemove.cellEntries.flat().filter((e) => e.endTime).length : 0
  const hasRunningEntry = rowToRemove ? rowToRemove.cellEntries.flat().some((e) => !e.endTime) : false

  if (metaLoading || !entriesLoaded) {
    return <TimesheetSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-6 pb-4">
        <h1 className="text-2xl font-semibold text-slate-700">Timesheet</h1>

        <div className="flex items-center gap-2">
          {!isThisWeek && (
            <Button variant="ghost" size="sm" className="h-9 text-cyan-600" onClick={() => changeWeek(currentWeekStart)}>
              Go to this week
            </Button>
          )}

          <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-9 gap-2" title={weekRange}>
                <CalendarIcon className="h-4 w-4" />
                {weekLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={weekStart}
                defaultMonth={weekStart}
                onSelect={selectWeek}
                modifiers={{ selectedWeek: weekDays }}
                modifiersClassNames={{ selectedWeek: "bg-cyan-50 text-cyan-700" }}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => changeWeek(subWeeks(weekStart, 1))} title="Previous week">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => changeWeek(addWeeks(weekStart, 1))} title="Next week">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6 pb-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Click a cell and type the time, e.g. <span className="font-mono">1:30</span>, <span className="font-mono">1.5</span> or{" "}
          <span className="font-mono">90m</span>. Press Enter to save, Tab to move to the next day, Esc to cancel.
        </p>
        {actionError && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="text-red-400 hover:text-red-600" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Timesheet Table */}
      <div className="flex-1 overflow-auto px-6">
        <div className="min-w-[1080px] border rounded-lg overflow-hidden">
          {/* Header Row */}
          <div className={cn(TIMESHEET_GRID, "bg-slate-50 border-b")}>
            <div className="px-4 py-3 text-sm font-medium text-muted-foreground">Projects</div>
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, new Date())
              return (
                <div
                  key={index}
                  className={cn(
                    "px-2 py-3 text-center text-sm font-medium",
                    isToday ? "text-cyan-700 bg-cyan-50" : "text-muted-foreground"
                  )}
                >
                  {format(day, "EEE, MMM d")}
                </div>
              )
            })}
            <div className="px-2 py-3 text-center text-sm font-medium text-muted-foreground">Total</div>
            <div className="px-2 py-3" />
          </div>

          {entriesLoading && rows.every((r) => r.draftId) ? (
            <TimesheetRowsSkeleton rows={3} />
          ) : entriesError ? (
            <div className="flex flex-col items-center gap-2 border-b py-8 text-sm text-red-600">
              {entriesError}
              <Button variant="outline" size="sm" onClick={fetchEntries}>Retry</Button>
            </div>
          ) : (
            <div className={cn(entriesLoading && "opacity-60 transition-opacity")}>
              {rows.length === 0 && (
                <div className="border-b px-4 py-6 text-center text-sm text-muted-foreground">
                  No time tracked this week. Add a row to start logging time.
                </div>
              )}

              {rows.map((row) => {
                const projectTasks = tasks.filter((t) => t.projectId === row.projectId)
                const editable = canEditRow(row)

                return (
                  <div key={row.id} className={cn(TIMESHEET_GRID, "border-b hover:bg-slate-50/50")}>
                    {/* Project & Task Cell */}
                    <div className="px-4 py-2 flex items-center gap-2 min-w-0">
                      {row.draftId ? (
                        <div className="flex min-w-0 flex-1 items-center gap-1">
                          <Select
                            value={row.projectId?.toString() ?? ""}
                            onValueChange={(value) => updateDraft(row.draftId!, { projectId: Number(value), taskId: null })}
                          >
                            <SelectTrigger className={cn("h-8 min-w-0 max-w-[60%] border-dashed shadow-none", !row.projectId && "text-cyan-600")}>
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeProjects.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || "#3b82f6" }} />
                                    <span dir="auto">{p.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {row.projectId !== null && projectTasks.length > 0 && (
                            <Select
                              value={row.taskId?.toString() ?? "none"}
                              onValueChange={(value) => updateDraft(row.draftId!, { taskId: value === "none" ? null : Number(value) })}
                            >
                              <SelectTrigger className="h-8 min-w-0 flex-1 border-dashed shadow-none text-xs">
                                <SelectValue placeholder="No task" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No task</SelectItem>
                                {projectTasks.map((t) => (
                                  <SelectItem key={t.id} value={t.id.toString()}>
                                    <span dir="auto">{t.name}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-2" title={row.taskName ? `${row.projectName}: ${row.taskName}` : row.projectName}>
                          <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: row.projectColor }} />
                          <span dir="auto" className="truncate text-sm">
                            {row.projectName}
                            {row.taskName && <span className="text-muted-foreground">: {row.taskName}</span>}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Duration Cells */}
                    {weekDays.map((_, dayIndex) => {
                      const id = cellId(row.id, dayIndex)
                      const isEditing = editing?.rowId === row.id && editing.dayIndex === dayIndex
                      const isSaving = pending[id] !== undefined
                      const value = cellValue(row, dayIndex)

                      return (
                        <div key={dayIndex} className="relative px-2 py-2 flex items-center justify-center">
                          {isEditing ? (
                            <>
                              <Input
                                autoFocus
                                value={editValue}
                                onChange={(e) => {
                                  setEditValue(e.target.value)
                                  setEditError(null)
                                }}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={() => {
                                  if (editingRef.current?.rowId === row.id && editingRef.current.dayIndex === dayIndex) commitEdit("blur")
                                }}
                                onKeyDown={handleKeyDown}
                                aria-invalid={!!editError}
                                inputMode="decimal"
                                dir="ltr"
                                className="h-8 w-[80px] px-1 text-center text-sm"
                                placeholder="1:30"
                              />
                              {editError && (
                                <p className="absolute left-1/2 top-full z-20 mt-0.5 w-48 -translate-x-1/2 rounded-md border border-red-200 bg-white px-2 py-1 text-center text-[11px] text-red-600 shadow-md">
                                  {editError}
                                </p>
                              )}
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={!editable || isSaving}
                              onClick={() => startEditing(row, dayIndex)}
                              title={editable ? undefined : "Select a project first"}
                              className={cn(
                                "h-8 w-[80px] rounded border text-sm tabular-nums transition-colors",
                                value > 0
                                  ? "bg-white border-slate-200 text-slate-700 hover:border-cyan-400"
                                  : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-white hover:border-cyan-400",
                                !editable && "cursor-not-allowed opacity-50 hover:bg-slate-50 hover:border-slate-200",
                                isSaving && "animate-pulse cursor-wait"
                              )}
                            >
                              {formatDuration(value)}
                            </button>
                          )}
                        </div>
                      )
                    })}

                    {/* Row Total */}
                    <div className="px-2 py-2 flex items-center justify-center">
                      <span className="text-sm font-medium tabular-nums">{formatDuration(rowTotal(row)) || "0:00"}</span>
                    </div>

                    {/* Delete Button */}
                    <div className="px-2 py-2 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                        title={row.draftId ? "Remove row" : "Delete this row's time for the week"}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Add row */}
          <div className={cn(TIMESHEET_GRID, "border-b")}>
            <div className="px-4 py-3">
              <button onClick={addDraft} className="flex items-center gap-1 text-cyan-500 text-sm hover:text-cyan-600">
                <Plus className="h-4 w-4" />
                Select project
              </button>
            </div>
          </div>

          {/* Totals Row */}
          <div className={cn(TIMESHEET_GRID, "bg-slate-50")}>
            <div className="px-4 py-3 text-sm font-medium text-muted-foreground">Total:</div>
            {dailyTotals.map((total, index) => (
              <div key={index} className="px-2 py-3 flex items-center justify-center">
                <span className="text-sm font-medium tabular-nums">{formatDuration(total) || "0:00"}</span>
              </div>
            ))}
            <div className="px-2 py-3 flex items-center justify-center">
              <span className="text-sm font-bold tabular-nums">{formatDuration(weekTotal) || "0:00"}</span>
            </div>
            <div className="px-2 py-3" />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 p-6 pt-4">
        <Button variant="outline" size="sm" className="gap-1" onClick={addDraft}>
          <Plus className="h-4 w-4" />
          Add new row
        </Button>
        <Button variant="outline" size="sm" disabled className="gap-1 opacity-50">
          Copy last week
        </Button>
        <Button variant="outline" size="sm" disabled className="gap-1 opacity-50">
          Save as template
        </Button>
      </div>

      <Dialog open={!!rowToRemove} onOpenChange={(open) => { if (!open && !isRemoving) setRowToRemove(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this row?</DialogTitle>
            <DialogDescription>
              This deletes {removableCount} time {removableCount === 1 ? "entry" : "entries"} for{" "}
              <span className="font-medium text-foreground">
                {rowToRemove?.projectName}
                {rowToRemove?.taskName ? `: ${rowToRemove.taskName}` : ""}
              </span>{" "}
              in {weekRange}.
              {hasRunningEntry && " The running timer is not affected."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRowToRemove(null)} disabled={isRemoving}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemoveRow} disabled={isRemoving}>
              {isRemoving ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
