"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { 
  Play, 
  Tag, 
  DollarSign,
  MoreVertical,
  Calendar,
  LayoutGrid
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimeEntryWithRelations } from "@/lib/types"
import type { TimeEntryRowProps } from "@/types/time-tracker"

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function formatTimeRange(startTime: string, endTime?: string | null): string {
  const start = new Date(startTime)
  const startStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  
  if (!endTime) return startStr
  
  const end = new Date(endTime)
  const endStr = end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  
  return `${startStr} - ${endStr}`
}

export function TimeEntryRow({
  entry,
  onEdit: _onEdit,
  onDelete: _onDelete,
  onDuplicate: _onDuplicate,
  onContinue,
  onLinkToCard,
  onLinkToNewCard,
  onUnlinkCard,
}: TimeEntryRowProps) {
  const hasKanbanLink = entry.task?.cardId !== null && entry.task?.cardId !== undefined

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 group border-b">
      {/* Description */}
      <div className="flex-1 min-w-0">
        <span className="text-muted-foreground">
          {entry.description || "Add description"}
        </span>
      </div>

      {/* Project */}
      <div className="flex items-center gap-2 min-w-[150px]">
        {entry.project ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: entry.project.color || "#3b82f6" }}
            />
            <span className="text-cyan-600 truncate">
              {entry.project.name}
              {entry.task && `: ${entry.task.name}`}
            </span>
          </>
        ) : (
          <span className="text-muted-foreground text-sm">No project</span>
        )}
      </div>

      {/* Kanban Link Button */}
      {entry.task && entry.project && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            hasKanbanLink ? "text-blue-500" : "text-muted-foreground opacity-0 group-hover:opacity-100"
          )}
          title={hasKanbanLink ? "Linked to Kanban" : "Link to Kanban"}
          onClick={() => {
            if (hasKanbanLink && entry.project?.boardId) {
              window.open(`/dashboard/boards/${entry.project.boardId}`, '_blank')
            }
          }}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      )}

      {/* Tags */}
      <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
        <Tag className="h-4 w-4" />
      </Button>

      {/* Billable */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8",
          entry.isBillable ? "text-cyan-500" : "text-muted-foreground"
        )}
      >
        <DollarSign className="h-4 w-4" />
      </Button>

      {/* Time Range */}
      <div className="text-sm text-muted-foreground min-w-[100px] text-right">
        {formatTimeRange(entry.startTime, entry.endTime)}
      </div>

      {/* Calendar Icon */}
      <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
        <Calendar className="h-4 w-4" />
      </Button>

      {/* Duration */}
      <div className="font-mono text-base tabular-nums min-w-[80px] text-right">
        {formatDuration(entry.duration || 0)}
      </div>

      {/* Play Button */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground h-8 w-8 opacity-0 group-hover:opacity-100"
        onClick={() => onContinue?.(entry)}
      >
        <Play className="h-4 w-4" />
      </Button>

      {/* More Options */}
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground h-8 w-8"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
    </div>
  )
}
