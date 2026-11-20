// Types for Time Tracker

import type { Project, Task, TimeEntryWithRelations, Tag } from "@/lib/types"

// Timer Header Types
export interface TimerHeaderProps {
  projects: Project[]
  tasks: Task[]
  onStart: (data: {
    description: string
    projectId?: number
    taskId?: number
    isBillable: boolean
  }) => void
  onStop: () => void
  isRunning: boolean
  elapsedTime: number
  currentDescription: string
  currentProjectId?: number
  currentTaskId?: number
  currentIsBillable: boolean
  onDescriptionChange: (value: string) => void
  onProjectChange: (projectId?: number, taskId?: number) => void
  onBillableChange: (value: boolean) => void
  onCreateTask?: (projectId: number, taskName: string) => Promise<Task | void>
}

// Time Entry Row Types
export interface TimeEntryRowProps {
  entry: TimeEntryWithRelations
  onEdit?: (entry: TimeEntryWithRelations) => void
  onDelete?: (id: number) => void
  onDuplicate?: (entry: TimeEntryWithRelations) => void
  onContinue?: (entry: TimeEntryWithRelations) => void
  onLinkToCard?: (taskId: number, cardId: number) => Promise<void>
  onLinkToNewCard?: (taskId: number, listId: number) => Promise<void>
  onUnlinkCard?: (taskId: number) => Promise<void>
}

// Time Entries List Types
export interface TimeEntriesListProps {
  entries: TimeEntryWithRelations[]
  projects?: Project[]
  tasks?: Task[]
  availableTags?: Tag[]
  onEdit?: (entry: TimeEntryWithRelations) => void
  onDelete?: (id: number) => void
  onDuplicate?: (entry: TimeEntryWithRelations) => void
  onContinue?: (entry: TimeEntryWithRelations) => void
  onUpdateEntry?: (id: number, data: { startTime?: string; endTime?: string; description?: string; projectId?: number; taskId?: number | null; isBillable?: boolean; tagIds?: number[] }) => void
  onCreateTask?: (projectId: number, taskName: string) => Promise<Task | void>
  onCreateTag?: (name: string, color: string) => Promise<Tag | void>
}

export interface GroupedEntries {
  label: string
  date: string
  entries: TimeEntryWithRelations[]
  totalDuration: number
}

export interface SimilarEntriesGroup {
  key: string
  entries: TimeEntryWithRelations[]
}

// Grouped Time Entry Row Types
export interface GroupedTimeEntryRowProps {
  entries: TimeEntryWithRelations[]
  projects?: Project[]
  tasks?: Task[]
  availableTags?: Tag[]
  onEdit?: (entry: TimeEntryWithRelations) => void
  onDelete?: (id: number) => void
  onContinue?: (entry: TimeEntryWithRelations) => void
  onUpdateEntry?: (id: number, data: { startTime?: string; endTime?: string; description?: string; projectId?: number; taskId?: number | null; isBillable?: boolean; tagIds?: number[] }) => void
  onCreateTask?: (projectId: number, taskName: string) => Promise<Task | void>
  onCreateTag?: (name: string, color: string) => Promise<Tag | void>
}

export interface TimeEditPopoverProps {
  time: string
  label: string
  onSave: (newTime: string) => void
}

// Project Selector Types
export interface ProjectSelectorProps {
  projects: Project[]
  tasks: Task[]
  selectedProjectId?: number
  selectedTaskId?: number
  onSelect: (projectId?: number, taskId?: number) => void
  onCreateProject?: () => void
  onCreateTask?: (projectId: number, taskName: string) => Promise<Task | void>
  className?: string
}

// Card Link Selector Types
export interface BoardList {
  id: number
  name: string
  cards: Array<{
    id: number
    title: string
    taskId: number | null
  }>
}

export interface CardLinkSelectorProps {
  task: Task
  projectId: number
  onLinkToCard: (taskId: number, cardId: number) => Promise<void>
  onLinkToNewCard: (taskId: number, listId: number) => Promise<void>
  onUnlink: (taskId: number) => Promise<void>
}

// Tag Selector Types
export interface TagSelectorProps {
  availableTags: Tag[]
  selectedTagIds: number[]
  onTagsChange: (tagIds: number[]) => void
  onCreateTag?: (name: string, color: string) => Promise<Tag | void>
}
