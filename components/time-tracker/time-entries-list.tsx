"use client"

import * as React from "react"
import { GroupedTimeEntryRow } from "./grouped-time-entry-row"
import type { TimeEntryWithRelations, Project, Task, Tag } from "@/lib/types"
import type { TimeEntriesListProps, GroupedEntries, SimilarEntriesGroup } from "@/types/time-tracker"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addWeeks, format, parseServerDate, startOfWeek } from "@/lib/date"

function groupSimilarEntries(entries: TimeEntryWithRelations[]): SimilarEntriesGroup[] {
  const groups = new Map<string, TimeEntryWithRelations[]>()
  
  entries.forEach(entry => {
    // Group by project + task + description
    const key = `${entry.projectId || 'no-project'}-${entry.taskId || 'no-task'}-${entry.description || ''}`
    
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(entry)
  })
  
  // Sort each group by startTime descending
  return Array.from(groups.entries()).map(([key, groupEntries]) => ({
    key,
    entries: groupEntries.sort((a, b) => 
      parseServerDate(b.startTime).getTime() - parseServerDate(a.startTime).getTime()
    )
  }))
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function getDateLabel(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return "Today"
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday"
  }

  return format(date, "EEE, MMM d")
}

function getWeekLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  
  const startOfThisWeek = startOfWeek(today)
  const startOfLastWeek = addWeeks(startOfThisWeek, -1)
  
  if (date >= startOfThisWeek) {
    return "This week"
  }
  if (date >= startOfLastWeek) {
    return "Last week"
  }
  
  return "Earlier"
}

function groupEntriesByDate(entries: TimeEntryWithRelations[]): GroupedEntries[] {
  const groups = new Map<string, GroupedEntries>()
  
  entries.forEach(entry => {
    const start = parseServerDate(entry.startTime)
    const date = start.toDateString()
    
    if (!groups.has(date)) {
      groups.set(date, {
        label: getDateLabel(start),
        date,
        entries: [],
        totalDuration: 0,
      })
    }
    
    const group = groups.get(date)!
    group.entries.push(entry)
    group.totalDuration += entry.duration || 0
  })
  
  return Array.from(groups.values()).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
}

function groupByWeek(groups: GroupedEntries[]): { week: string; groups: GroupedEntries[]; totalDuration: number }[] {
  const weeks = new Map<string, { groups: GroupedEntries[]; totalDuration: number }>()
  
  groups.forEach(group => {
    const weekLabel = getWeekLabel(group.date)
    
    if (!weeks.has(weekLabel)) {
      weeks.set(weekLabel, { groups: [], totalDuration: 0 })
    }
    
    const week = weeks.get(weekLabel)!
    week.groups.push(group)
    week.totalDuration += group.totalDuration
  })
  
  const weekOrder = ["This week", "Last week", "Earlier"]
  return Array.from(weeks.entries())
    .sort((a, b) => weekOrder.indexOf(a[0]) - weekOrder.indexOf(b[0]))
    .map(([week, data]) => ({ week, ...data }))
}

export const TimeEntriesList = React.memo(function TimeEntriesList({
  entries,
  projects,
  tasks,
  availableTags,
  onEdit,
  onDelete,
  onDuplicate,
  onContinue,
  onUpdateEntry,
  onCreateTask,
  onCreateTag,
}: TimeEntriesListProps) {
  const groupedByWeek = React.useMemo(() => groupByWeek(groupEntriesByDate(entries)), [entries])

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p>No time entries yet</p>
        <p className="text-sm">Start tracking your time by clicking the START button above</p>
      </div>
    )
  }

  return (
    <div className="divide-y">
      {groupedByWeek.map(({ week, groups, totalDuration }) => (
        <div key={week}>
          {/* Week Header */}
          <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 bg-muted/30 text-sm">
            <span className="font-medium text-muted-foreground">{week}</span>
            <span className="text-muted-foreground">
              Week total: <span className="font-mono">{formatDuration(totalDuration)}</span>
            </span>
          </div>
          
          <div className="space-y-2.5 bg-muted/30 pb-2.5">
          {groups.map(group => {
              // Group similar entries within each day
              const similarGroups = groupSimilarEntries(group.entries)
              
              return (
                <div key={group.date} className="bg-white border-y border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  {/* Day Header */}
                  <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 bg-slate-100 text-sm border-l-4 border-slate-400 border-b border-b-slate-200">
                    <span className="font-semibold text-slate-800">{group.label}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>Total:</span>
                      <span className="font-mono">{formatDuration(group.totalDuration)}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Entries grouped by similarity */}
                  {similarGroups.map(similarGroup => (
                    <GroupedTimeEntryRow
                      key={similarGroup.key}
                      entries={similarGroup.entries}
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
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
})
