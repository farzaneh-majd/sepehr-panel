// Types for Dashboard

import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "@/lib/date"

export interface DashboardStats {
  totalDuration: number
  topProject: { name: string; duration: number } | null
  byProject: { projectId: number | null; projectName: string; color: string; duration: number; percent: number }[]
  byDay: { date: Date; label: string; duration: number; projects: { name: string; color: string; duration: number }[] }[]
  topEntries: { projectName: string; taskName: string; duration: number; color: string }[]
}

export type DatePreset = {
  label: string
  getValue: () => { start: Date; end: Date }
}

export const DATE_PRESETS: DatePreset[] = [
  { label: "Today", getValue: () => { const d = new Date(); return { start: d, end: d } } },
  { label: "Yesterday", getValue: () => { const d = addDays(new Date(), -1); return { start: d, end: d } } },
  { label: "This week", getValue: () => {
    const now = new Date()
    return { start: startOfWeek(now), end: now }
  }},
  { label: "Last week", getValue: () => {
    const lastWeek = addWeeks(new Date(), -1)
    return { start: startOfWeek(lastWeek), end: endOfWeek(lastWeek) }
  }},
  { label: "Past two weeks", getValue: () => {
    const now = new Date()
    return { start: addDays(now, -14), end: now }
  }},
  { label: "This month", getValue: () => {
    const now = new Date()
    return { start: startOfMonth(now), end: now }
  }},
  { label: "Last month", getValue: () => {
    const lastMonth = addMonths(new Date(), -1)
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) }
  }},
  { label: "This year", getValue: () => {
    const now = new Date()
    return { start: startOfYear(now), end: now }
  }},
  { label: "Last year", getValue: () => {
    const lastYear = addYears(new Date(), -1)
    return { start: startOfYear(lastYear), end: endOfYear(lastYear) }
  }},
]
