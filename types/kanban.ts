// Types for Kanban board

export interface Board {
  id: number;
  name: string;
  description: string | null;
  background: string;
  isStarred: boolean;
  isClosed: boolean;
  visibility: string;
  autoNumberCards?: boolean;
  userId: number;
  projectId: number | null;
  createdAt: string;
  updatedAt: string;
  lists?: BoardList[];
  labels?: BoardLabel[];
  members?: BoardMember[];
}

export interface BoardList {
  id: number;
  name: string;
  boardId: number;
  position: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  cards: Card[];
}

export interface Assignee {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarId: number | null;
  avatarUrl?: string | null;
}

export interface Card {
  id: number;
  title: string;
  description: string | null;
  listId: number;
  position: number;
  coverColor: string | null;
  coverImage: string | null;
  sequenceNumber?: number | null;
  createdById?: number | null;
  updatedById?: number | null;
  createdByName?: string | null;
  updatedByName?: string | null;
  dueDate: string | null;
  dueComplete: boolean;
  isArchived: boolean;
  taskId: number | null;
  createdAt: string;
  updatedAt: string;
  labels?: BoardLabel[];
  members?: CardMember[];
  assignees?: Assignee[];
  checklists?: Checklist[];
  comments?: CardComment[];
  attachments?: CardAttachment[];
  activities?: CardActivity[];
  commentCount?: number;
  attachmentCount?: number;
  checklistItemCount?: number;
  checklistItemCheckedCount?: number;
  mentionCount?: number;
  linkedCardCount?: number;
  bugCount?: number;
  openBugCount?: number;
}

export type CardCounts = Pick<Card, "commentCount" | "attachmentCount" | "checklistItemCount" | "checklistItemCheckedCount" | "mentionCount" | "linkedCardCount" | "bugCount" | "openBugCount">;

export interface CardLink {
  id: number;
  linkedCardId: number;
  title: string | null;
  boardId: number | null;
  boardName: string | null;
  listName: string | null;
  isArchived: boolean | null;
  dueComplete: boolean | null;
  dueDate?: string | null;
  boardBackground?: string | null;
  hasDescription?: boolean;
  commentCount?: number;
  attachmentCount?: number;
  checklistItemCount?: number;
  checklistItemCheckedCount?: number;
  linkedCardCount?: number;
  labels: BoardLabel[];
  members?: { id: number; firstName: string | null; lastName: string | null; avatarId: number | null }[];
}

export interface CardSearchResult {
  id: number;
  title: string | null;
  boardId: number | null;
  boardName: string | null;
  listName: string | null;
}

export interface BoardLabel {
  id: number;
  name: string | null;
  color: string;
  boardId?: number;
}

export interface BoardMember {
  id: number;
  userId: number;
  role: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  username?: string | null;
  avatarUrl: string | null;
  avatarId: number | null;
}

export interface CardMember {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  avatarId?: number | null;
}

export interface Checklist {
  id: number;
  name: string;
  cardId: number;
  position: number;
  createdAt: string;
  items: ChecklistItem[];
}

export interface ChecklistItem {
  id: number;
  name: string;
  checklistId: number;
  isChecked: boolean;
  position: number;
  dueDate: string | null;
  assignedUserId: number | null;
  createdAt: string;
}

export interface CardComment {
  id: number;
  content: string;
  cardId: number;
  userId: number;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CardAttachment {
  id: number;
  name: string;
  url: string;
  fileId?: number;
  size?: number | null;
  cardId: number;
  userId: number;
  createdAt: string;
}

export interface CardActivity {
  id: number;
  cardId: number;
  userId: number;
  action: string;
  data: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export type BugStatus = "Open" | "In Progress" | "Ready for Retest" | "Closed";
export type BugSeverity = "Critical" | "Major" | "Medium" | "Low";
export type BugPriority = "High" | "Medium" | "Low";
export type BugTeam = "Frontend" | "Backend";
export type BugResolution = "Fixed" | "Duplicate" | "Won't Fix" | "Not a Bug" | "Cannot Reproduce" | "Deferred";
export type BugAction = "start" | "submit" | "verify" | "close" | "reopen";

export interface BugHistoryEntry {
  id: number;
  message: string;
  userId: number | null;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
}

export interface BugAttachment {
  id: number;
  name: string;
  url: string | null;
  fileId: number | null;
  size: number | null;
  status: BugStatus | null;
  createdAt: string;
}

export interface CardBug {
  id: number;
  cardId: number;
  title: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  description: string | null;
  severity: BugSeverity;
  priority: BugPriority | null;
  environment: string | null;
  team: BugTeam | null;
  reporterId: number | null;
  reporterFirstName: string | null;
  reporterLastName: string | null;
  reporterName: string | null;
  assigneeId: number | null;
  assigneeFirstName: string | null;
  assigneeLastName: string | null;
  assigneeAvatarId: number | null;
  assigneeTeam: BugTeam | null;
  status: BugStatus;
  resolution: BugResolution | null;
  createdAt: string;
  updatedAt: string | null;
  history: BugHistoryEntry[];
  attachments: BugAttachment[];
}

export interface BugFormValues {
  title: string;
  stepsToReproduce: string;
  expectedResult: string;
  actualResult: string;
  description: string;
  severity: BugSeverity;
  priority: BugPriority | "";
  environment: string;
  team: BugTeam | "";
  reporterId: number | null;
  reporterName: string | null;
  assigneeId: number | null;
  assigneeTeam: BugTeam | "";
}
