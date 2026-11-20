// Types for Projects

import type { Project, Task } from "@/lib/types"

export const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
]

// Projects Manager Types
export interface ProjectWithStats extends Project {
  trackedTime?: number
}

export interface UserData {
  id: number
  role: string
  [key: string]: any
}

// Project Detail Types
export interface ProjectDetailProps {
  projectId: number
}

export interface ProjectStats {
  trackedTime: number
  billableTime: number
  nonBillableTime: number
}

export interface TaskWithStats extends Task {
  trackedTime?: number
}

export interface UserInfo {
  id: number
  firstName?: string | null
  lastName?: string | null
  email: string
  avatarUrl?: string | null
  isActive?: boolean
}

export interface ProjectMember {
  id: number
  projectId: number
  userId: number
  role: string
  user: UserInfo
}

// Project Header Types
export interface ProjectHeaderProps {
  projectId: number
}
