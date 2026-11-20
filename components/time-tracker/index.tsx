"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axiosInstance from "@/lib/axios-config"
import { TimerHeader } from "./timer-header"
import { TimeEntriesList } from "./time-entries-list"
import { TimeTrackerSkeleton } from "./skeleton"
import type { Project, Task, TimeEntryWithRelations, Tag } from "@/lib/types"
import { addMonths, endOfMonth, format, startOfMonth } from "@/lib/date"

export const trackerKeys = {
  projects:    () => ["tracker", "projects"]    as const,
  tasks:       () => ["tracker", "tasks"]       as const,
  tags:        () => ["tracker", "tags"]        as const,
  entries:     (month: string) => ["tracker", "entries", month] as const,
}

async function fetchProjects(): Promise<Project[]> {
  const res = await axiosInstance.get("/project")
  const data = res.data?.result ?? res.data
  const arr: Project[] = Array.isArray(data) ? data : []
  return arr.filter(p => !p.isArchived)
}

async function fetchTasks(): Promise<Task[]> {
  const res = await axiosInstance.get("/task")
  const data = res.data?.result ?? res.data
  return Array.isArray(data) ? data : []
}

async function fetchTags(): Promise<Tag[]> {
  const res = await axiosInstance.get("/tag")
  const data = res.data?.result ?? res.data
  return Array.isArray(data) ? data : []
}

async function fetchEntries(month: Date): Promise<TimeEntryWithRelations[]> {
  const res = await axiosInstance.get("/time-entry", {
    params: {
      startDate: month.toISOString(),
      endDate: endOfMonth(month).toISOString(),
      page: 1,
      pageSize: 500,
    },
  })
  const data = res.data?.result ?? res.data
  return Array.isArray(data) ? data : (data?.items ?? [])
}

const EMPTY_PROJECTS: Project[] = []
const EMPTY_TASKS: Task[] = []
const EMPTY_TAGS: Tag[] = []

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (attempt >= attempts || (status !== undefined && status < 500)) throw error
      await new Promise(resolve => setTimeout(resolve, attempt * 1000))
    }
  }
}

export function TimeTracker() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [currentMonth, setCurrentMonth] = React.useState(() => startOfMonth(new Date()))
  const monthKey = currentMonth.toISOString()

  const [isRunning, setIsRunning]             = React.useState(false)
  const [elapsedTime, setElapsedTime]         = React.useState(0)
  const [currentEntryId, setCurrentEntryId]   = React.useState<number | null>(null)
  const [startTime, setStartTime]             = React.useState<Date | null>(null)
  const [description, setDescription]         = React.useState("")
  const [selectedProjectId, setSelectedProjectId] = React.useState<number | undefined>()
  const [selectedTaskId, setSelectedTaskId]   = React.useState<number | undefined>()
  const [isBillable, setIsBillable]           = React.useState(false)
  const [urlParamsProcessed, setUrlParamsProcessed] = React.useState(false)
  const [pendingAction, setPendingAction]     = React.useState<"starting" | "stopping" | null>(null)
  const [timerError, setTimerError]           = React.useState<string | null>(null)
  const failedStopRef = React.useRef<{ id: number; endTime: string } | null>(null)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)


  const { data: projects = EMPTY_PROJECTS } = useQuery({
    queryKey: trackerKeys.projects(),
    queryFn:  fetchProjects,
    staleTime: 5 * 60 * 1000, 
  })

  const { data: tasks = EMPTY_TASKS } = useQuery({
    queryKey: trackerKeys.tasks(),
    queryFn:  fetchTasks,
    staleTime: 5 * 60 * 1000,
  })

  const { data: tags = EMPTY_TAGS } = useQuery({
    queryKey: trackerKeys.tags(),
    queryFn:  fetchTags,
    staleTime: 5 * 60 * 1000,
  })

  const {
    data: entries = [],
    isLoading: entriesLoading,
  } = useQuery({
    queryKey: trackerKeys.entries(monthKey),
    queryFn:  () => fetchEntries(currentMonth),
    staleTime: 30 * 1000,  
  })

  const suggestionEntries = React.useMemo(() => {
    const cache = queryClient.getQueriesData<TimeEntryWithRelations[]>({ 
      queryKey: ["tracker", "entries"] 
    })
    const all: TimeEntryWithRelations[] = []
    const seen = new Set<number>()
    cache.forEach(([, data]) => {
      if (!data) return
      data.forEach(e => { if (!seen.has(e.id)) { seen.add(e.id); all.push(e) } })
    })
    return all
  }, [entries, queryClient]) 

  React.useEffect(() => {
    if (entriesLoading || isRunning) return
    const runningEntry = entries
      .filter(e => !e.endTime)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0]
    if (runningEntry) {
      let s = runningEntry.startTime
      if (s && !s.endsWith("Z") && !s.includes("+")) s = s + "Z"
      const entryStart = new Date(s)
      const initialElapsed = Math.floor((Date.now() - entryStart.getTime()) / 1000)
      setIsRunning(true)
      setCurrentEntryId(runningEntry.id)
      setStartTime(entryStart)
      setElapsedTime(initialElapsed)
      setDescription(runningEntry.description || "")
      setSelectedProjectId(runningEntry.projectId || undefined)
      setSelectedTaskId(runningEntry.taskId || undefined)
      setIsBillable(runningEntry.isBillable || false)
    }
  }, [entries, entriesLoading]) // eslint-disable-line

  React.useEffect(() => {
    if (entriesLoading || urlParamsProcessed || isRunning) return
    const cardTitle   = searchParams.get("cardTitle")
    const projectIdParam = searchParams.get("projectId")
    const taskIdParam = searchParams.get("taskId")
    if (cardTitle && projectIdParam) {
      const projectId = parseInt(projectIdParam)
      const taskId = taskIdParam ? parseInt(taskIdParam) : undefined
      setDescription(cardTitle)
      setSelectedProjectId(projectId)
      setSelectedTaskId(taskId)
      setUrlParamsProcessed(true)
      router.replace("/dashboard/tracker")
      setTimeout(() => {
        handleStart({ description: cardTitle, projectId, taskId, isBillable: false })
      }, 100)
    }
  }, [entriesLoading, searchParams, urlParamsProcessed, isRunning]) // eslint-disable-line

  React.useEffect(() => {
    if (isRunning && startTime) {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isRunning, startTime])

  const patchEntriesCache = React.useCallback((updater: (prev: TimeEntryWithRelations[]) => TimeEntryWithRelations[]) => {
    queryClient.setQueryData<TimeEntryWithRelations[]>(trackerKeys.entries(monthKey), prev => updater(prev ?? []))
  }, [queryClient, monthKey])

  const startMutation = useMutation({
    mutationFn: (payload: { description: string; projectId?: number; taskId?: number; isBillable: boolean; startTime: string }) =>
      axiosInstance.post("/time-entry", payload).then(r => r.data?.result ?? r.data),
    onSuccess: (entry) => {
      if (!entry) return
      const project = projects.find(p => p.id === entry.projectId) || null
      const task    = tasks.find(t => t.id === entry.taskId) || null
      setCurrentEntryId(entry.id)
      patchEntriesCache(prev => [{ ...entry, project, task }, ...prev])
    },
  })

  const stopMutation = useMutation({
    mutationFn: (payload: { id: number; endTime: string; duration: number; description: string; projectId?: number; taskId?: number; isBillable: boolean }) =>
      axiosInstance.put(`/time-entry/${payload.id}`, payload).then(r => r.data?.result ?? r.data),
    onSuccess: (updated) => {
      if (!updated) return
      patchEntriesCache(prev => prev.map(e => e.id === updated.id ? {
        ...e, ...updated,
        project: projects.find(p => p.id === updated.projectId) || e.project,
        task:    tasks.find(t => t.id === updated.taskId) || e.task,
      } : e))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      axiosInstance.put(`/time-entry/${id}`, data).then(r => r.data?.result ?? r.data),
    onSuccess: (updated) => {
      if (!updated) return
      patchEntriesCache(prev => prev.map(e => e.id === updated.id ? {
        ...e, ...updated,
        project: projects.find(p => p.id === updated.projectId) || e.project,
        task:    tasks.find(t => t.id === updated.taskId) || e.task,
      } : e))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axiosInstance.delete(`/time-entry/${id}`),
    onMutate: (id) => {
      patchEntriesCache(prev => prev.filter(e => e.id !== id))
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: ({ projectId, taskName }: { projectId: number; taskName: string }) =>
      axiosInstance.post("/task", { name: taskName, projectId }).then(r => r.data?.result ?? r.data),
    onSuccess: (newTask) => {
      if (!newTask) return
      queryClient.setQueryData<Task[]>(trackerKeys.tasks(), prev => [...(prev ?? []), newTask])
      setSelectedProjectId(newTask.projectId)
      setSelectedTaskId(newTask.id)
    },
  })

  const createTagMutation = useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      axiosInstance.post("/tag/create", { name, color }).then(r => r.data?.result ?? r.data),
    onSuccess: (newTag) => {
      if (!newTag) return
      queryClient.setQueryData<Tag[]>(trackerKeys.tags(), prev => [...(prev ?? []), newTag])
    },
  })

  const handleStart = async (data: { description: string; projectId?: number; taskId?: number; isBillable: boolean }) => {
    if (pendingAction) return
    const now = new Date()
    setTimerError(null)
    setPendingAction("starting")
    setStartTime(now)
    setIsRunning(true)
    setElapsedTime(0)
    try {
      await startMutation.mutateAsync({ ...data, startTime: now.toISOString() })
      queryClient.invalidateQueries({ queryKey: ["tracker", "entries"] })
    } catch (error) {
      console.error("Error starting timer:", error)
      setIsRunning(false); setElapsedTime(0); setStartTime(null); setCurrentEntryId(null)
      setTimerError("Starting the timer failed. Check your connection and try again.")
      queryClient.invalidateQueries({ queryKey: ["tracker", "entries"] })
    } finally {
      setPendingAction(null)
    }
  }

  const stopCurrentEntry = async (): Promise<boolean> => {
    if (!currentEntryId) return true
    const failedStop = failedStopRef.current?.id === currentEntryId ? failedStopRef.current : null
    const end = failedStop ? new Date(failedStop.endTime) : new Date()
    const duration = startTime ? Math.max(0, Math.floor((end.getTime() - startTime.getTime()) / 1000)) : elapsedTime
    const payload = { id: currentEntryId, endTime: end.toISOString(), duration, description, projectId: selectedProjectId, taskId: selectedTaskId, isBillable }
    setTimerError(null)
    setPendingAction("stopping")
    try {
      await withRetry(() => stopMutation.mutateAsync(payload))
      failedStopRef.current = null
      setIsRunning(false); setElapsedTime(0); setStartTime(null); setCurrentEntryId(null)
      return true
    } catch (error) {
      console.error("Error stopping timer:", error)
      failedStopRef.current = { id: payload.id, endTime: payload.endTime }
      setTimerError("Stopping the timer failed. Check your connection and press STOP again.")
      return false
    } finally {
      setPendingAction(null)
    }
  }

  const handleStop = async () => {
    if (pendingAction) return
    if (await stopCurrentEntry()) {
      setDescription(""); setSelectedProjectId(undefined); setSelectedTaskId(undefined); setIsBillable(false)
    }
  }

  const handleContinue = async (entry: TimeEntryWithRelations) => {
    if (pendingAction) return
    if (isRunning && !(await stopCurrentEntry())) return
    const d = entry.description || ""; const pid = entry.projectId || undefined; const tid = entry.taskId || undefined; const bill = entry.isBillable || false
    setDescription(d); setSelectedProjectId(pid); setSelectedTaskId(tid); setIsBillable(bill)
    await handleStart({ description: d, projectId: pid, taskId: tid, isBillable: bill })
  }

  const handleUpdateEntry = async (
    id: number,
    data: { startTime?: string; endTime?: string; description?: string; projectId?: number; taskId?: number | null; isBillable?: boolean; tagIds?: number[] }
  ) => {
    let updateData: Record<string, unknown> = { ...data }
    const entry = entries.find(e => e.id === id)
    const isRunningEntry = id === currentEntryId && isRunning
    if (entry) {
      const normalize = (s: string) => s.endsWith("Z") || s.includes("+") ? s : s + "Z"
      const newStart = data.startTime ? new Date(data.startTime) : new Date(normalize(entry.startTime))
      if (isRunningEntry) {
        if (data.startTime) { setStartTime(newStart); setElapsedTime(Math.floor((Date.now() - newStart.getTime()) / 1000)) }
        delete updateData.duration
      } else {
        const endTime = data.endTime ? new Date(data.endTime) : entry.endTime ? new Date(normalize(entry.endTime)) : new Date()
        updateData = { ...updateData, duration: Math.floor((endTime.getTime() - newStart.getTime()) / 1000) }
      }
    }
    await updateMutation.mutateAsync({ id, data: updateData })
  }

  const handleCreateTask = async (projectId: number, taskName: string): Promise<Task | void> => {
    return createTaskMutation.mutateAsync({ projectId, taskName })
  }

  const handleCreateTag = async (name: string, color: string): Promise<Tag | void> => {
    return createTagMutation.mutateAsync({ name, color })
  }

  const listHandlersRef = React.useRef({ handleContinue, handleUpdateEntry, handleCreateTask, handleCreateTag, deleteEntry: deleteMutation.mutate })
  listHandlersRef.current = { handleContinue, handleUpdateEntry, handleCreateTask, handleCreateTag, deleteEntry: deleteMutation.mutate }

  const onListContinue = React.useCallback((entry: TimeEntryWithRelations) => listHandlersRef.current.handleContinue(entry), [])
  const onListUpdateEntry = React.useCallback((...args: Parameters<typeof handleUpdateEntry>) => listHandlersRef.current.handleUpdateEntry(...args), [])
  const onListDelete = React.useCallback((id: number) => listHandlersRef.current.deleteEntry(id), [])
  const onListCreateTask = React.useCallback((projectId: number, taskName: string) => listHandlersRef.current.handleCreateTask(projectId, taskName), [])
  const onListCreateTag = React.useCallback((name: string, color: string) => listHandlersRef.current.handleCreateTag(name, color), [])

  return (
    <div className="flex flex-col h-full bg-white">
      <TimerHeader
        projects={projects}
        tasks={tasks}
        onStart={handleStart}
        onStop={handleStop}
        isRunning={isRunning}
        elapsedTime={elapsedTime}
        currentDescription={description}
        currentProjectId={selectedProjectId}
        currentTaskId={selectedTaskId}
        currentIsBillable={isBillable}
        onDescriptionChange={setDescription}
        onProjectChange={(pid, tid) => { setSelectedProjectId(pid); setSelectedTaskId(tid) }}
        onBillableChange={setIsBillable}
        onCreateTask={handleCreateTask}
        entries={suggestionEntries}
        pendingAction={pendingAction}
        error={timerError}
        onDismissError={() => setTimerError(null)}
        onSelectEntry={(entry) => {
          setDescription(entry.description || "")
          setSelectedProjectId(entry.projectId || undefined)
          setSelectedTaskId(entry.taskId || undefined)
          setIsBillable(entry.isBillable || false)
        }}
      />

      <div className="flex-1 overflow-auto">
        {entriesLoading ? (
          <TimeTrackerSkeleton />
        ) : (
          <TimeEntriesList
            entries={entries}
            projects={projects}
            tasks={tasks}
            availableTags={tags}
            onContinue={onListContinue}
            onUpdateEntry={onListUpdateEntry}
            onDelete={onListDelete}
            onCreateTask={onListCreateTask}
            onCreateTag={onListCreateTag}
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-2 px-3 md:px-4 py-2 border-t">
        <button
          onClick={() => setCurrentMonth(prev => startOfMonth(addMonths(prev, -1)))}
          className="shrink-0 px-3 py-1 text-sm border rounded hover:bg-gray-100"
        >
          ←<span className="hidden sm:inline"> Previous Month</span>
        </button>
        <div className="text-sm font-medium truncate">
          {format(currentMonth, "MMMM yyyy")}
        </div>
        <button
          onClick={() => setCurrentMonth(prev => startOfMonth(addMonths(prev, 1)))}
          className="shrink-0 px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={currentMonth >= startOfMonth(new Date())}
        >
          <span className="hidden sm:inline">Next Month </span>→
        </button>
      </div>
    </div>
  )
}
