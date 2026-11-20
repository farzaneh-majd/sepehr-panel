// Types for Timesheet

export interface TimesheetRow {
  id: string
  projectId: number | null
  projectName: string
  projectColor: string
  taskId: number | null
  taskName: string
  // Duration in seconds for each day of the week (7 days)
  dailyDurations: number[]
}

export interface TimeEntry {
  id: number
  projectId: number | null
  taskId: number | null
  description: string | null
  startTime: string
  endTime: string | null
  duration: number | null
  project?: { name: string; color: string } | null
  task?: { name: string } | null
}
