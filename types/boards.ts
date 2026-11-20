// Types for Boards

import type { Board, BoardList, Card, BoardMember, BoardLabel, CardCounts, CardBug, BugAction, BugFormValues, BugPriority, BugResolution, BugSeverity, BugStatus, BugTeam } from "@/types/kanban"

// Constants
export const BACKGROUND_COLORS = [
  "#0079bf",
  "#d29034",
  "#519839",
  "#b04632",
  "#89609e",
  "#cd5a91",
  "#4bbf6b",
  "#00aecc",
  "#838c91",
]

export const BUG_STATUSES: BugStatus[] = ["Open", "In Progress", "Ready for Retest", "Closed"]
export const BUG_SEVERITIES: BugSeverity[] = ["Critical", "Major", "Medium", "Low"]
export const BUG_PRIORITIES: BugPriority[] = ["High", "Medium", "Low"]
export const BUG_TEAMS: BugTeam[] = ["Frontend", "Backend"]
export const BUG_CLOSE_RESOLUTIONS: BugResolution[] = ["Duplicate", "Won't Fix", "Cannot Reproduce", "Not a Bug", "Deferred"]
export const BUG_EVIDENCE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "mp4", "mov", "avi", "wmv", "webm", "mkv", "pdf", "doc", "docx", "xls", "xlsx", "csv", "txt", "log", "json", "xml", "zip", "rar", "7z", "gz", "tar"]
export const BUG_RESOLUTION_INFO: Record<BugResolution, { meaning: string; example: string }> = {
  "Fixed": { meaning: "The issue has been resolved", example: "The bug was fixed and the retest passed" },
  "Duplicate": { meaning: "This issue was reported before", example: "BUG-85 is the same as BUG-102" },
  "Won't Fix": { meaning: "A decision was made not to fix the issue", example: "A known issue that is not worth fixing" },
  "Not a Bug": { meaning: "The system behaves correctly", example: "The button was expected to be active, but per the requirements it must be inactive" },
  "Cannot Reproduce": { meaning: "The issue is not reproducible", example: "With the given information the error is not observed again" },
  "Deferred": { meaning: "The resolution is postponed to the future", example: "The bug fix has been moved to a later version" },
}

// Boards View
export interface BoardsViewProps {
  // No specific props needed
}

// Board Edit Modal
export interface BoardEditModalProps {
  board: Board
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: Partial<Board>) => Promise<string | null>
  onDelete: () => void
  canDelete?: boolean
  canEdit?: boolean
}

// Board Members Modal
export interface User {
  id: number
  firstName: string | null
  lastName: string | null
  email: string
  avatarUrl: string | null
}

export interface BoardMembersModalProps {
  boardId: number
  members: BoardMember[]
  ownerId: number
  isOpen: boolean
  onClose: () => void
  onMembersChange: (members: BoardMember[]) => void
}

// Board Planner
export interface BoardPlannerProps {
  lists: BoardList[]
  onCardClick: (card: Card) => void
  onUpdateCardDueDate: (cardId: number, dueDate: string | null) => void
  onCreateCard: (listId: number, title: string, dueDate: string) => void
}

export type ViewMode = "week" | "month"

// Card Detail Modal
export interface CardDetailModalProps {
  card: Card
  boardLabels: BoardLabel[]
  boardId?: number
  boardMembers?: BoardMember[]
  lists?: BoardList[]
  listName?: string
  isOpen: boolean
  onClose: () => void
  onUpdate: (updates: Partial<Card>) => Promise<boolean>
  onDelete?: () => void
  onMoveCard?: (cardId: number, targetListId: number, position: number) => void
  onStartTimer?: (card: Card) => void
  onBoardLabelsChange?: (change: { type: "created" | "updated"; label: BoardLabel } | { type: "deleted"; labelId: number }) => void
  onCountsChange?: (cardId: number, counts: CardCounts) => void
  onOpenCard?: (cardId: number, boardId: number | null) => void
  mentionName?: string
}

// Board Bottom Menu
export type BoardView = "planner" | "board" | "switch"

export interface BoardBottomMenuProps {
  activeView: BoardView
  onViewChange: (view: BoardView) => void
}

// Card Search
export interface SearchResult {
  card: Card
  listName: string
}

export interface CardSearchProps {
  lists: BoardList[]
  onCardSelect: (card: Card) => void
  autoFocus?: boolean
  inputClassName?: string
}

// Kanban Board
export interface KanbanBoardProps {
  boardId: number
}

export interface UnlinkedTask {
  id: number
  name: string
  description: string | null
  projectId: number
  createdAt: string
}

// Kanban Card
export interface KanbanCardProps {
  card: Card
  isDragging?: boolean
  dragDisabled?: boolean
  onClick?: () => void
  onArchive?: (card: Card) => void
  onUnarchive?: (card: Card) => void
}

// Kanban List
export interface KanbanListProps {
  list: BoardList
  onUpdateList: (listId: number, updates: Partial<BoardList>) => void
  onDeleteList: (listId: number) => void
  onAddCard: (listId: number, title: string, existingTaskId?: number) => Promise<{ error?: string; duplicate?: boolean } | void>
  onCardClick: (card: Card) => void
  onArchiveCard?: (card: Card) => void
  onUnarchiveCard?: (card: Card) => void
  unlinkedTasks?: UnlinkedTask[]
}

export interface CardBugsProps {
  cardId: number
  boardMembers: BoardMember[]
  onBugsChange?: (bugs: CardBug[]) => void
  onActivityChange?: () => void
}

export interface BugDialogProps {
  bug: CardBug | null
  isOpen: boolean
  boardMembers: BoardMember[]
  onClose: () => void
  onSubmit: (values: BugFormValues, files: File[]) => Promise<string | null>
  onDeleteAttachment: (bug: CardBug, attachmentId: number) => Promise<string | null>
  onAction: (bug: CardBug, action: BugAction) => Promise<string | null>
}

export interface PreviewFile {
  id: number
  name: string
  fileId: number | null
  createdAt: string
  size?: number | null
}

export interface FilePreviewProps {
  file: PreviewFile | null
  onClose: () => void
  onDelete?: () => void
}

export interface BugResolutionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (resolution: BugResolution) => Promise<string | null>
}

export interface BugReasonDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<string | null>
}
