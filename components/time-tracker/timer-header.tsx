"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Square, 
  Tag, 
  DollarSign,
  Clock,
  Loader2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ProjectSelector } from "./project-selector"
import type { Project, Task, TimeEntryWithRelations } from "@/lib/types"
import type { TimerHeaderProps } from "@/types/time-tracker"

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

interface ExtendedTimerHeaderProps extends TimerHeaderProps {
  entries?: TimeEntryWithRelations[]
  onSelectEntry?: (entry: TimeEntryWithRelations) => void
  pendingAction?: "starting" | "stopping" | null
  error?: string | null
  onDismissError?: () => void
}

export function TimerHeader({
  projects,
  tasks,
  onStart,
  onStop,
  isRunning,
  elapsedTime,
  currentDescription,
  currentProjectId,
  currentTaskId,
  currentIsBillable,
  onDescriptionChange,
  onProjectChange,
  onBillableChange,
  onCreateTask,
  entries = [],
  onSelectEntry,
  pendingAction = null,
  error = null,
  onDismissError,
}: ExtendedTimerHeaderProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const [descriptionError, setDescriptionError] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const searchIndex = React.useMemo(() => {
    const seen = new Map<string, { entry: TimeEntryWithRelations; text: string }>()
    entries.forEach(entry => {
      const key = `${entry.description || ""}__${entry.projectId || 0}__${entry.taskId || 0}`
      if (!seen.has(key) && (entry.description || entry.projectId)) {
        const text = `${entry.description || ""}\n${entry.project?.name || ""}\n${entry.task?.name || ""}`.toLowerCase()
        seen.set(key, { entry, text })
      }
    })
    return Array.from(seen.values())
  }, [entries])

  const deferredQuery = React.useDeferredValue(currentDescription)

  const suggestions = React.useMemo(() => {
    if (!showSuggestions) return []
    const q = deferredQuery?.trim().toLowerCase()
    const result: TimeEntryWithRelations[] = []
    for (const item of searchIndex) {
      if (!q || item.text.includes(q)) {
        result.push(item.entry)
        if (result.length === 10) break
      }
    }
    return result
  }, [searchIndex, deferredQuery, showSuggestions])

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleSelectSuggestion = (entry: TimeEntryWithRelations) => {
    onDescriptionChange(entry.description || "")
    if (entry.projectId) onProjectChange(entry.projectId, entry.taskId || undefined)
    if (entry.isBillable !== undefined && entry.isBillable !== null) onBillableChange(entry.isBillable)
    if (onSelectEntry) onSelectEntry(entry)
    setShowSuggestions(false)
  }

  const handleStartStop = () => {
    if (pendingAction) return
    if (isRunning) {
      if (!currentProjectId) return
      if (!currentDescription?.trim()) {
        setDescriptionError(true)
        inputRef.current?.focus()
        return
      }
      setDescriptionError(false)
      onStop()
    } else {
      if (!currentProjectId && !currentTaskId) {
        onStart({
          description: currentDescription,
          projectId: currentProjectId,
          taskId: currentTaskId,
          isBillable: currentIsBillable,
        })
        return
      }
      if (!currentDescription?.trim()) {
        setDescriptionError(true)
        inputRef.current?.focus()
        return
      }
      setDescriptionError(false)
      onStart({
        description: currentDescription,
        projectId: currentProjectId,
        taskId: currentTaskId,
        isBillable: currentIsBillable,
      })
    }
  }

  return (
    <div className="sticky top-0 z-10 bg-white border-b">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-x-1 gap-y-2 md:gap-3 p-3 md:p-4">
        <div className="basis-full md:basis-auto md:flex-1 min-w-0 relative">
          <Input
            ref={inputRef}
            placeholder="What are you working on?"
            value={currentDescription}
            onChange={(e) => {
              onDescriptionChange(e.target.value)
              if (e.target.value.trim()) setDescriptionError(false)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setShowSuggestions(false)
              if (e.key === "Enter" && !showSuggestions) handleStartStop()
            }}
            className={cn(
              "border-0 shadow-none text-base focus-visible:ring-0 px-0",
              descriptionError && "placeholder:text-red-500 text-red-500 caret-red-500"
            )}
          />

          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-auto"
            >
              {suggestions.map((entry, idx) => (
                <button
                  key={`${entry.id}-${idx}`}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left transition-colors border-b last:border-b-0"
                  onClick={() => handleSelectSuggestion(entry)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 truncate">
                      {entry.description || <span className="text-gray-400 italic">No description</span>}
                    </div>
                    {entry.project && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: entry.project.color || "#3b82f6" }}
                        />
                        <span className="text-xs text-cyan-600 truncate">
                          {entry.project.name}
                          {entry.task && ` : ${entry.task.name}`}
                        </span>
                      </div>
                    )}
                  </div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="flex gap-1 shrink-0">
                      {entry.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag.id}
                          className="px-1.5 py-0.5 rounded text-[10px] text-white"
                          style={{ backgroundColor: tag.color || "#6b7280" }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 md:flex-none">
          <ProjectSelector
            projects={projects}
            tasks={tasks}
            selectedProjectId={currentProjectId}
            selectedTaskId={currentTaskId}
            onSelect={onProjectChange}
            onCreateTask={onCreateTask}
            className="px-2 md:px-4"
          />
        </div>

        <Button variant="ghost" size="icon" className="text-muted-foreground shrink-0 h-9 w-9">
          <Tag className="h-5 w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-muted-foreground shrink-0 h-9 w-9",
            currentIsBillable && "text-cyan-500"
          )}
          onClick={() => onBillableChange(!currentIsBillable)}
        >
          <DollarSign className="h-5 w-5" />
        </Button>

        <div className="font-mono text-base md:text-xl tabular-nums shrink-0 px-1 md:min-w-[100px] text-center">
          {formatTime(elapsedTime)}
        </div>

        <Button
          onClick={handleStartStop}
          disabled={!!pendingAction || (isRunning && !currentProjectId)}
          title={isRunning && !currentProjectId ? "برای توقف ابتدا پروژه انتخاب کنید" : undefined}
          className={cn(
            "shrink-0 min-w-[72px] md:min-w-[80px]",
            isRunning && currentProjectId
              ? "bg-red-500 hover:bg-red-600"
              : isRunning && !currentProjectId
              ? "bg-red-500 opacity-40 cursor-not-allowed"
              : "bg-cyan-500 hover:bg-cyan-600"
          )}
        >
          {pendingAction ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isRunning ? (
            <>
              <Square className="h-4 w-4 mr-1" />
              STOP
            </>
          ) : (
            "START"
          )}
        </Button>
      </div>
      {error && (
        <div className="flex items-center gap-2 px-3 md:px-4 py-2 bg-red-50 border-t border-red-100 text-sm text-red-600">
          <span className="flex-1">{error}</span>
          {onDismissError && (
            <button onClick={onDismissError} className="shrink-0 rounded p-0.5 hover:bg-red-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
