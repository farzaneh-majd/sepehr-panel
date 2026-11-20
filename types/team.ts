// Types for Team Manager

import type { User } from "@/lib/types"

export type TeamMember = User & {
  roles?: string[]
  groups?: string[]
}

export const ROLE_COLORS: Record<string, string> = {
  admin: "bg-cyan-500 text-white",
  "project manager": "bg-cyan-100 text-cyan-700 border border-cyan-300",
  user: "bg-gray-100 text-gray-700 border border-gray-300",
}

export const GROUP_COLORS = [
  "bg-cyan-100 text-cyan-700 border border-cyan-300",
  "bg-blue-100 text-blue-700 border border-blue-300",
  "bg-green-100 text-green-700 border border-green-300",
  "bg-purple-100 text-purple-700 border border-purple-300",
]
