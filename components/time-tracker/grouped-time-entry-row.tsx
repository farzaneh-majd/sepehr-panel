"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { ProjectSelector } from "./project-selector"
import { 
  Play, 
  DollarSign,
  MoreVertical,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeEntryWithRelations, Project, Task, Tag as TagType } from "@/lib/types"
import type { GroupedTimeEntryRowProps, TimeEditPopoverProps } from "@/types/time-tracker"
import { TagSelector } from "./tag-selector"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTime(dateStr: string): string {
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
  const date = new Date(normalized)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function parseTimeToDate(timeStr: string, referenceDate: Date): Date {
  const parts = timeStr.trim().split(' ')
  const timePart = parts[0]
  const modifier = parts[1]
  let [hours, minutes] = timePart.split(':').map(Number)
  if (modifier) {
    if (modifier.toUpperCase() === 'PM' && hours !== 12) hours += 12
    if (modifier.toUpperCase() === 'AM' && hours === 12) hours = 0
  }
  const newDate = new Date(referenceDate)  
  newDate.setHours(hours, minutes, 0, 0)
  return newDate
}

function getDateFromEntry(dateStr: string): Date {
  const normalized = dateStr.endsWith('Z') || dateStr.includes('+') ? dateStr : dateStr + 'Z'
  return new Date(normalized)
}

function TimeEditPopover({ time, label, onSave }: TimeEditPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState(formatTime(time))

  React.useEffect(() => {
    setValue(formatTime(time))
  }, [time])

const handleSave = () => {
  const normalized = time.endsWith('Z') || time.includes('+') ? time : time + 'Z'
  const referenceDate = new Date(normalized)
  const newDate = parseTimeToDate(value, referenceDate)
  onSave(newDate.toISOString())
  setOpen(false)
}

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="hover:text-cyan-600 hover:underline">
          {formatTime(time)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="center">
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">{label}</span>
          <Input
            type="time"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-32"
          />
          <Button size="sm" onClick={handleSave}>Save</Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface DateEditPopoverProps {
  entryDate: string
  onSave: (newDate: Date) => void
}

function DateEditPopover({ entryDate, onSave }: DateEditPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const currentDate = getDateFromEntry(entryDate)

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) return
    const original = getDateFromEntry(entryDate)
    const newDate = new Date(selectedDate)
    newDate.setHours(original.getHours(), original.getMinutes(), original.getSeconds(), original.getMilliseconds())
    onSave(newDate)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 shrink-0 hover:text-cyan-600">
          <Calendar className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <div className="p-2">
          <p className="text-xs text-muted-foreground mb-2 px-1">Change date</p>
          <CalendarComponent
            mode="single"
            selected={currentDate}
            onSelect={handleDateSelect}
            defaultMonth={currentDate}
          />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function DescriptionCell({
  value,
  onSave,
}: {
  value: string
  onSave: (description: string) => void
}) {
  const [draft, setDraft] = React.useState(value)
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    if (!isEditing) setDraft(value)
  }, [value, isEditing])

  const save = () => {
    if (draft !== value) onSave(draft)
    setIsEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setIsEditing(false)
  }

  return (
    <div className="flex-1 min-w-0 md:flex-none md:w-[clamp(110px,22%,260px)] md:shrink-0 text-sm">
      {isEditing ? (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
            if (e.key === "Escape") cancel()
          }}
          dir="auto"
          className="h-8 px-2 text-sm rounded-md"
          autoFocus
        />
      ) : (
        <button
          className="block w-full truncate text-left text-muted-foreground hover:text-foreground px-2 py-1 -mx-2 rounded-md hover:bg-muted/60"
          onClick={() => setIsEditing(true)}
        >
          {value || "Add description"}
        </button>
      )}
    </div>
  )
}

function SingleEntryRow({
  entry,
  projects = [],
  tasks = [],
  availableTags = [],
  onEdit,
  onDelete,
  onContinue,
  onUpdateEntry,
  onCreateTask,
  onCreateTag,
  showProject = true,
}: {
  entry: TimeEntryWithRelations
  projects?: Project[]
  tasks?: Task[]
  availableTags?: TagType[]
  onEdit?: (entry: TimeEntryWithRelations) => void
  onDelete?: (id: number) => void
  onContinue?: (entry: TimeEntryWithRelations) => void
  onUpdateEntry?: (id: number, data: { startTime?: string; endTime?: string; description?: string; projectId?: number; taskId?: number | null; isBillable?: boolean; tagIds?: number[] }) => void
  onCreateTask?: (projectId: number, taskName: string) => Promise<Task | void>
  onCreateTag?: (name: string, color: string) => Promise<TagType | void>
  showProject?: boolean
}) {
  const handleStartTimeChange = (newTime: string) => {
    onUpdateEntry?.(entry.id, { startTime: newTime })
  }

  const handleEndTimeChange = (newTime: string) => {
    onUpdateEntry?.(entry.id, { endTime: newTime })
  }

  const handleDateChange = (newDate: Date) => {
    const originalStart = getDateFromEntry(entry.startTime)
    const newStartTime = new Date(newDate)
    newStartTime.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds())

    const updateData: { startTime: string; endTime?: string } = {
      startTime: newStartTime.toISOString(),
    }

    if (entry.endTime) {
      const originalEnd = getDateFromEntry(entry.endTime)
      const newEndTime = new Date(newDate)
      newEndTime.setHours(originalEnd.getHours(), originalEnd.getMinutes(), originalEnd.getSeconds())
      updateData.endTime = newEndTime.toISOString()
    }

    onUpdateEntry?.(entry.id, updateData)
  }

  const handleProjectTaskChange = (projectId?: number, taskId?: number) => {
    onUpdateEntry?.(entry.id, { 
      projectId: projectId, 
      taskId: taskId !== undefined ? taskId : null 
    })
  }

  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-x-1 gap-y-1 md:gap-3 px-3 md:px-4 py-2 md:py-3 hover:bg-muted/50 group border-b">
      <div className="hidden md:block w-6 h-6 shrink-0" />

      <DescriptionCell
        value={entry.description || ""}
        onSave={(description) => onUpdateEntry?.(entry.id, { description })}
      />

      <div className="order-last basis-full md:order-none md:basis-auto md:flex-1 min-w-0 flex items-center gap-1 md:gap-3">
        <div className={cn("flex-1 min-w-0 flex items-center gap-2 justify-start", !showProject && "invisible")}>
          {projects.length > 0 ? (
            <ProjectSelector
              projects={projects}
              tasks={tasks}
              selectedProjectId={entry.projectId || undefined}
              selectedTaskId={entry.taskId || undefined}
              onSelect={handleProjectTaskChange}
              onCreateTask={onCreateTask}
            />
          ) : entry.project ? (
            <>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: entry.project.color || "#3b82f6" }}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-cyan-600 truncate cursor-help">
                    {entry.project.name}
                    {entry.task && `: ${entry.task.name}`}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Project: {entry.project.name}</p>
                  {entry.task && <p>Task: {entry.task.name}</p>}
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <span className="text-muted-foreground text-sm">No project</span>
          )}
        </div>

        <TagSelector
          availableTags={availableTags}
          selectedTagIds={entry.tags?.map(t => t.id) || []}
          onTagsChange={(tagIds) => onUpdateEntry?.(entry.id, { tagIds })}
          onCreateTag={onCreateTag}
        />

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 shrink-0",
            entry.isBillable ? "text-cyan-500" : "text-muted-foreground"
          )}
          onClick={() => onUpdateEntry?.(entry.id, { isBillable: !entry.isBillable })}
          title={entry.isBillable ? "Billable" : "Non-billable"}
        >
          <DollarSign className="h-4 w-4" />
        </Button>

        <div className="hidden md:block h-8 w-8 shrink-0" />

        <div className="text-xs md:text-sm text-muted-foreground md:w-[120px] shrink-0 text-right tabular-nums flex items-center gap-1 justify-end">
          <TimeEditPopover
            time={entry.startTime}
            label="Start Time"
            onSave={handleStartTimeChange}
          />
          <span>-</span>
          {entry.endTime ? (
            <TimeEditPopover
              time={entry.endTime}
              label="End Time"
              onSave={handleEndTimeChange}
            />
          ) : (
            <span>now</span>
          )}
        </div>

        <DateEditPopover
          entryDate={entry.startTime}
          onSave={handleDateChange}
        />
      </div>

      <div className="font-mono text-sm md:text-base tabular-nums md:w-[90px] shrink-0 text-right">
        {formatDuration(entry.duration || 0)}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-cyan-600 h-8 w-8 shrink-0"
        onClick={() => onContinue?.(entry)}
      >
        <Play className="h-4 w-4" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 shrink-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            className="text-destructive"
            onClick={() => onDelete?.(entry.id)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function getGroupTimeRange(entries: TimeEntryWithRelations[]): { earliest: string | null; latest: string | null } {
  let earliest: Date | null = null
  let latest: Date | null = null
  for (const e of entries) {
    const s = getDateFromEntry(e.startTime)
    if (!earliest || s < earliest) earliest = s
    if (e.endTime) {
      const end = getDateFromEntry(e.endTime)
      if (!latest || end > latest) latest = end
    }
  }
  return {
    earliest: earliest ? earliest.toISOString() : null,
    latest: latest ? latest.toISOString() : null,
  }
}

export function GroupedTimeEntryRow({
  entries,
  projects = [],
  tasks = [],
  availableTags = [],
  onEdit,
  onDelete,
  onContinue,
  onUpdateEntry,
  onCreateTask,
  onCreateTag,
}: GroupedTimeEntryRowProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  if (entries.length === 1) {
    return (
      <SingleEntryRow
        entry={entries[0]}
        projects={projects}
        tasks={tasks}
        availableTags={availableTags}
        onEdit={onEdit}
        onDelete={onDelete}
        onContinue={onContinue}
        onUpdateEntry={onUpdateEntry}
        onCreateTask={onCreateTask}
        onCreateTag={onCreateTag}
      />
    )
  }

  const firstEntry = entries[0]
  const totalDuration = entries.reduce((acc, e) => acc + (e.duration || 0), 0)

  const handleGroupProjectTaskChange = (projectId?: number, taskId?: number) => {
    // Update all entries in the group
    entries.forEach(entry => {
      onUpdateEntry?.(entry.id, { 
        projectId: projectId, 
        taskId: taskId !== undefined ? taskId : null 
      })
    })
  }

  const handleGroupDateChange = (newDate: Date) => {
    entries.forEach(entry => {
      const originalStart = getDateFromEntry(entry.startTime)
      const newStartTime = new Date(newDate)
      newStartTime.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds())
      
      const updateData: { startTime: string; endTime?: string } = {
        startTime: newStartTime.toISOString(),
      }
      
      if (entry.endTime) {
        const originalEnd = getDateFromEntry(entry.endTime)
        const newEndTime = new Date(newDate)
        newEndTime.setHours(originalEnd.getHours(), originalEnd.getMinutes(), originalEnd.getSeconds())
        updateData.endTime = newEndTime.toISOString()
      }
      
      onUpdateEntry?.(entry.id, updateData)
    })
  }

  return (
    <div>
      <div className="flex flex-wrap md:flex-nowrap items-center gap-x-1 gap-y-1 md:gap-3 px-3 md:px-4 py-2 md:py-3 hover:bg-muted/50 group border-b bg-slate-50/50">
        <button
          className="flex items-center justify-center w-6 h-6 shrink-0 rounded border text-xs font-medium text-cyan-600 bg-white hover:bg-cyan-50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {entries.length}
        </button>

        <DescriptionCell
          value={firstEntry.description || ""}
          onSave={(description) => entries.forEach(entry => onUpdateEntry?.(entry.id, { description }))}
        />

        <div className="order-last basis-full md:order-none md:basis-auto md:flex-1 min-w-0 flex items-center gap-1 md:gap-3">
          <div className="flex-1 min-w-0 flex items-center gap-2 justify-start">
            {projects.length > 0 ? (
              <ProjectSelector
                projects={projects}
                tasks={tasks}
                selectedProjectId={firstEntry.projectId || undefined}
                selectedTaskId={firstEntry.taskId || undefined}
                onSelect={handleGroupProjectTaskChange}
                onCreateTask={onCreateTask}
              />
            ) : firstEntry.project ? (
              <>
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: firstEntry.project.color || "#3b82f6" }}
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-cyan-600 truncate cursor-help">
                      {firstEntry.project.name}
                      {firstEntry.task && `: ${firstEntry.task.name}`}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Project: {firstEntry.project.name}</p>
                    {firstEntry.task && <p>Task: {firstEntry.task.name}</p>}
                  </TooltipContent>
                </Tooltip>
              </>
            ) : (
              <span className="text-muted-foreground text-sm">No project</span>
            )}
          </div>

          <TagSelector
            availableTags={availableTags}
            selectedTagIds={firstEntry.tags?.map(t => t.id) || []}
            onTagsChange={(tagIds) => {
              entries.forEach(entry => {
                onUpdateEntry?.(entry.id, { tagIds })
              })
            }}
            onCreateTag={onCreateTag}
          />

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 shrink-0",
              firstEntry.isBillable ? "text-cyan-500" : "text-muted-foreground"
            )}
            onClick={() => {
              const newBillable = !firstEntry.isBillable
              entries.forEach(entry => {
                onUpdateEntry?.(entry.id, { isBillable: newBillable })
              })
            }}
            title={firstEntry.isBillable ? "Billable" : "Non-billable"}
          >
            <DollarSign className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground h-8 w-8 shrink-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>        

          {(() => {
            const range = getGroupTimeRange(entries)
            return (
              <div className="text-xs md:text-sm text-muted-foreground md:w-[120px] shrink-0 text-right tabular-nums">
                {range.earliest ? formatTime(range.earliest) : "--:--"}
                <span className="mx-0.5"> - </span>
                {range.latest ? formatTime(range.latest) : <span className="italic">running</span>}
              </div>
            )
          })()}

          <DateEditPopover
            entryDate={firstEntry.startTime}
            onSave={handleGroupDateChange}
          />
        </div>

        <div className="font-mono text-sm md:text-base tabular-nums md:w-[90px] shrink-0 text-right">
          {formatDuration(totalDuration)}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-cyan-600 h-8 w-8 shrink-0"
          onClick={() => onContinue?.(firstEntry)}
        >
          <Play className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => entries.forEach(e => onDelete?.(e.id))}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete all ({entries.length})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {isExpanded && (
        <div className="bg-muted/30 border-l-2 md:border-l-4 border-cyan-200">
          {entries.map((entry) => (
            <SingleEntryRow
              key={entry.id}
              entry={entry}
              projects={projects}
              tasks={tasks}
              availableTags={availableTags}
              onEdit={onEdit}
              onDelete={onDelete}
              onContinue={onContinue}
              onUpdateEntry={onUpdateEntry}
              onCreateTask={onCreateTask}
              onCreateTag={onCreateTag}
              showProject={false}
            />
          ))}
        </div>
      )}
    </div>
  )
}