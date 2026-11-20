// Types for Reports

import {
  subDays,
  subMonths,
  subWeeks,
  subYears,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "@/lib/date"

export interface User {
  id: number
  firstName: string | null
  lastName: string | null
  email: string
  role?: string | null
  isActive?: boolean
}

export type CurrentUser = {
  id?: number
  firstName?: string | null
  lastName?: string | null
  email?: string
  role?: string | null
}

export interface ReportFilters {
  users: number[]
  projects: number[]
  tasks: number[]
  billable: "all" | "billable" | "non-billable"
}

export interface GroupedData {
  groupId: number | null
  groupName: string
  color: string
  duration: number
  descriptions: { description: string; duration: number }[]
  // Keep backward-compat aliases
  projectId?: number | null
  projectName?: string
}

// Preset date ranges
export type DatePreset = {
  label: string
  getValue: () => { from: Date; to: Date }
}

export const datePresets: DatePreset[] = [
  {
    label: "Today",
    getValue: () => {
      const today = new Date()
      return { from: today, to: today }
    },
  },
  {
    label: "Yesterday",
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: yesterday, to: yesterday }
    },
  },
  {
    label: "This week",
    getValue: () => {
      const today = new Date()
      return { from: startOfWeek(today, { weekStartsOn: 6 }), to: today }
    },
  },
  {
    label: "Last week",
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return { 
        from: startOfWeek(lastWeek, { weekStartsOn: 6 }), 
        to: endOfWeek(lastWeek, { weekStartsOn: 6 }) 
      }
    },
  },
  {
    label: "Past two weeks",
    getValue: () => {
      return { from: subWeeks(new Date(), 2), to: new Date() }
    },
  },
  {
    label: "This month",
    getValue: () => {
      const today = new Date()
      return { from: startOfMonth(today), to: today }
    },
  },
  {
    label: "Last month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
  {
    label: "This year",
    getValue: () => {
      const today = new Date()
      return { from: startOfYear(today), to: today }
    },
  },
  {
    label: "Last year",
    getValue: () => {
      const lastYear = subYears(new Date(), 1)
      return { from: startOfYear(lastYear), to: endOfYear(lastYear) }
    },
  },
]
