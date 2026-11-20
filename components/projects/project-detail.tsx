"use client"

import * as React from "react"
import Link from "next/link"
import axiosInstance from "@/lib/axios-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Search, Pencil, Archive, Trash2, Copy, RotateCcw, UserPlus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Project, Task } from "@/lib/types"
import type { ProjectDetailProps, ProjectStats, TaskWithStats, UserInfo, ProjectMember } from "@/types/projects"
import { COLORS } from "@/types/projects"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ProjectDetailSkeleton } from "./projects-skeleton"

function formatHours(seconds: number): string {
  const hours = seconds / 3600
  return hours.toFixed(2).replace(".", ",") + " h"
}

function formatTaskTime(seconds: number): string {
  const hours = seconds / 3600
  return hours.toFixed(2).replace(".", ",") + "h"
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const [project, setProject] = React.useState<Project | null>(null)
  const [tasks, setTasks] = React.useState<TaskWithStats[]>([])
  const [stats, setStats] = React.useState<ProjectStats>({
    trackedTime: 0,
    billableTime: 0,
    nonBillableTime: 0,
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"tasks" | "access" | "status">("tasks")
  
  // Task form state
  const [newTaskName, setNewTaskName] = React.useState("")
  const [taskFilter, setTaskFilter] = React.useState("active")
  const [taskSearch, setTaskSearch] = React.useState("")
  const [taskError, setTaskError] = React.useState("")
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = React.useState(false)
  const [deletingTask, setDeletingTask] = React.useState<TaskWithStats | null>(null)

  // Edit/Delete project dialog state
  const [isEditProjectDialogOpen, setIsEditProjectDialogOpen] = React.useState(false)
  const [isDeleteProjectDialogOpen, setIsDeleteProjectDialogOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [formErrorMessage, setFormErrorMessage] = React.useState<string | null>(null)
  const [deleteErrorMessage, setDeleteErrorMessage] = React.useState<string | null>(null)

  // Edit project form state
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")
  const [editColor, setEditColor] = React.useState(project?.color || "#3b82f6")
  const [editIsPublic, setEditIsPublic] = React.useState(true)
  const [editIsBillable, setEditIsBillable] = React.useState(true)
  const [editIsArchived, setEditIsArchived] = React.useState(false)

  // Pagination states
  const [statusTasksPage, setStatusTasksPage] = React.useState(1)
  const [tasksPage, setTasksPage] = React.useState(1)
  const itemsPerPage = 10

  // Members state
  const [members, setMembers] = React.useState<ProjectMember[]>([])
  const [owner, setOwner] = React.useState<UserInfo | null>(null)
  const [allUsers, setAllUsers] = React.useState<UserInfo[]>([])
  const [showAddMember, setShowAddMember] = React.useState(false)
  const [memberSearch, setMemberSearch] = React.useState("")
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)

  const fetchMembers = React.useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/project/${projectId}/members`)
      const data = res.data?.result ?? res.data
      setMembers(data.members || data || [])
      setOwner(data.owner || null)
    } catch (error: any) {
      console.error("Failed to fetch members:", error?.response?.status, error?.response?.statusText, error?.config?.url)
    }
  }, [projectId])

  const fetchAllUsers = React.useCallback(async () => {
    setIsLoadingUsers(true)
    try {
      const res = await axiosInstance.get("/user/all")
      const data = res.data?.result ?? res.data
      setAllUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setIsLoadingUsers(false)
    }
  }, [])

  const fetchData = React.useCallback(async () => {
    try {
      // Fetch project
      const projectRes = await axiosInstance.get(`/project/${projectId}`)
      const projectData = projectRes.data?.result ?? projectRes.data
      if (projectData) setProject(projectData)

      // Fetch tasks
      const tasksRes = await axiosInstance.get(`/task?projectId=${projectId}&includeStats=true`)
      const tasksData = tasksRes.data?.result ?? tasksRes.data
      if (Array.isArray(tasksData)) setTasks(tasksData)

      // Calculate stats from project data
      if (projectData) {
        setStats({
          trackedTime: projectData.trackedTime ?? 0,
          billableTime: projectData.billableTime ?? 0,
          nonBillableTime: projectData.nonBillableTime ?? 0,
        })
      }
    } catch (error: any) {
      console.error("Failed to fetch data:", error?.response?.status, error?.response?.statusText, error?.config?.url)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  React.useEffect(() => {
    fetchData()
    fetchMembers()
  }, [fetchData, fetchMembers])

  React.useEffect(() => {
    if (showAddMember) {
      fetchAllUsers()
    }
  }, [showAddMember, fetchAllUsers])

  const getUserName = (user: UserInfo) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.firstName) {
      return user.firstName
    }
    return user.email.split("@")[0]
  }

  const getInitials = (user: UserInfo) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user.firstName) {
      return user.firstName.substring(0, 2).toUpperCase()
    }
    return user.email.substring(0, 2).toUpperCase()
  }

  async function handleAddMember(userId: number) {
    try {
      const res = await axiosInstance.post(`/project/${projectId}/members`, { 
        userId, 
        role: "member" 
      })
      if (res.data) {
        await fetchMembers()
        setShowAddMember(false)
        setMemberSearch("")
      }
    } catch (error: any) {
      const message = error?.response?.data?.error || "Failed to add member"
      alert(message)
    }
  }

  async function handleRemoveMember(userId: number) {
    try {
      await axiosInstance.delete(`/project/${projectId}/members/${userId}`)
      await fetchMembers()
    } catch (error) {
      console.error("Failed to remove member:", error)
    }
  }

  // Filter available users (not already members)
  const availableUsers = allUsers.filter(user => {
    const isMember = members.some(m => m.userId === user.id)
    const isOwner = owner?.id === user.id
    const matchesSearch = memberSearch === "" || 
      getUserName(user).toLowerCase().includes(memberSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(memberSearch.toLowerCase())
    return !isMember && !isOwner && user.isActive !== false && matchesSearch
  })

  async function handleAddTask() {
    if (!newTaskName.trim()) return
    setTaskError("")

    // Check for duplicate name
    const duplicate = tasks.find(
      t => t.name.toLowerCase() === newTaskName.trim().toLowerCase()
    )
    if (duplicate) {
      setTaskError("A task with this name already exists")
      return
    }

    try {
      const res = await axiosInstance.post("/task", { 
        name: newTaskName, 
        projectId 
      })
      const task = res.data?.result ?? res.data
      setTasks(prev => [...prev, task])
      setNewTaskName("")
      setTasksPage(1)
    } catch (error) {
      console.error("Failed to create task:", error)
    }
  }

  async function handleMarkDone(taskId: number) {
    try {
      await axiosInstance.put(`/task/${taskId}`, { status: "done" })
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: "done" } : t
      ))
    } catch (error) {
      console.error("Failed to update task:", error)
    }
  }

  async function handleDeleteTask(taskId: number) {
    try {
      await axiosInstance.delete(`/task/${taskId}`)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      setIsDeleteTaskDialogOpen(false)
      setDeletingTask(null)
    } catch (error) {
      console.error("Failed to delete task:", error)
    }
  }

  async function handleRevertTask(taskId: number) {
    try {
      await axiosInstance.put(`/task/${taskId}`, { status: "active" })
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: "active" } : t
      ))
    } catch (error) {
      console.error("Failed to revert task:", error)
    }
  }

  async function handleArchiveProject() {
    if (!project) return
    try {
      const res = await axiosInstance.put(`/project/${project.id}`, { 
        isArchived: !project.isArchived 
      })
      const projectResult = res.data?.result ?? res.data
      setProject(prev => prev ? { ...prev, ...projectResult } : null)
    } catch (error) {
      console.error("Failed to archive project:", error)
    }
  }

  async function handleDeleteProject() {
    if (!project) return
    setIsDeleting(true)
    setDeleteErrorMessage(null)
    try {
      await axiosInstance.delete(`/project/${project.id}`)
      window.location.href = "/dashboard/projects"
    } catch (error: any) {
      console.error("Failed to delete project:", error)
      if (error.response?.status === 403) {
        setDeleteErrorMessage(error.response.data?.message || "Access denied. Only project owner, admin, or manager can delete this project")
      } else if (error.response?.status === 404) {
        setDeleteErrorMessage(error.response.data?.message || "Project not found")
      } else {
        setDeleteErrorMessage("Failed to delete project. Please try again.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  function openEditProjectDialog() {
    if (!project) return
    setEditName(project.name)
    setEditDescription(project.description || "")
    setEditColor(project.color || COLORS[0])
    setEditIsPublic(project.isPublic ?? true)
    setEditIsBillable(project.isBillable ?? true)
    setEditIsArchived(project.isArchived ?? false)
    setIsEditProjectDialogOpen(true)
  }

  function openDeleteProjectDialog() {
    setIsDeleteProjectDialogOpen(true)
  }

  async function handleEditProjectSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !editName.trim()) return

    setIsSubmitting(true)
    setFormErrorMessage(null)

    try {
      const res = await axiosInstance.put(`/project/${project.id}`, {
        name: editName,
        description: editDescription,
        color: editColor,
        isPublic: editIsPublic,
        isBillable: editIsBillable,
        isArchived: editIsArchived,
      })
      const projectResult = res.data?.result ?? res.data
      setProject(prev => prev ? { ...prev, ...projectResult } : null)
      setIsEditProjectDialogOpen(false)
    } catch (error: any) {
      console.error("Failed to update project:", error)
      if (error.response?.status === 400) {
        setFormErrorMessage(error.response.data?.message || "Project name already exists")
      } else {
        setFormErrorMessage("Failed to update project. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTasks = tasks.filter(t => {
    if (taskSearch && !t.name.toLowerCase().includes(taskSearch.toLowerCase())) {
      return false
    }
    if (taskFilter === "active" && t.status === "done") return false
    if (taskFilter === "done" && t.status !== "done") return false
    return true
  })

  // Pagination calculations
  const statusTasksTotal = tasks.length
  const statusTasksTotalPages = Math.ceil(statusTasksTotal / itemsPerPage)
  const paginatedStatusTasks = tasks.slice(
    (statusTasksPage - 1) * itemsPerPage,
    statusTasksPage * itemsPerPage
  )

  const tasksTotal = filteredTasks.length
  const tasksTotalPages = Math.ceil(tasksTotal / itemsPerPage)
  const paginatedTasks = filteredTasks.slice(
    (tasksPage - 1) * itemsPerPage,
    tasksPage * itemsPerPage
  )

  // Reset page when filter changes
  React.useEffect(() => {
    setTasksPage(1)
  }, [taskFilter, taskSearch])

  if (isLoading) {
    return <ProjectDetailSkeleton />
  }

  if (!project) {
    return <div className="flex items-center justify-center h-64">Project not found</div>
  }

  // Calculate billable percentage for donut chart
  const totalTime = stats.billableTime + stats.nonBillableTime
  const billablePercent = totalTime > 0 ? (stats.billableTime / totalTime) * 100 : 100

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 pb-0">
        <Link href="/dashboard/projects" className="text-cyan-600 text-sm hover:underline">
          Projects
        </Link>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: project.color || "#3b82f6" }}
            />
            <h1 className="text-2xl font-semibold text-slate-700">{project.name}</h1>
            {project.isArchived && (
              <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded">Archived</span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={openEditProjectDialog}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>              
              <DropdownMenuItem onClick={handleArchiveProject}>
                <Archive className="h-4 w-4 mr-2" />
                {project.isArchived ? "Unarchive" : "Archive"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={openDeleteProjectDialog}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mt-4">
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium",
            activeTab === "tasks" 
              ? "text-cyan-600 border-b-2 border-cyan-600 bg-slate-100" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("tasks")}
        >
          TASKS
        </button>
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium",
            activeTab === "access" 
              ? "text-cyan-600 border-b-2 border-cyan-600 bg-slate-100" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("access")}
        >
          ACCESS
        </button>
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium",
            activeTab === "status" 
              ? "text-cyan-600 border-b-2 border-cyan-600 bg-slate-100" 
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setActiveTab("status")}
        >
          STATUS
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "status" && (
          <div className="p-6">            
            <div className="grid md:grid-cols-2 gap-6">
              {/* Stats */}
              <div className="border rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <span className="text-sm text-muted-foreground">TRACKED</span>
                      <p className="text-xs text-slate-400">Total time on project</p>
                    </div>
                    <span className="font-medium">{formatHours(stats.trackedTime)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <span className="text-sm text-muted-foreground">BILLABLE</span>
                      <p className="text-xs text-slate-400">Chargeable to client</p>
                    </div>
                    <span className="font-medium text-lime-600">{formatHours(stats.billableTime)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div>
                      <span className="text-sm text-muted-foreground">NON-BILLABLE</span>
                      <p className="text-xs text-slate-400">Internal / not charged</p>
                    </div>
                    <span className="font-medium text-slate-500">{formatHours(stats.nonBillableTime)}</span>
                  </div>
                </div>
              </div>

              {/* Donut Chart */}
              <div className="border rounded-lg p-6 flex flex-col items-center justify-center">
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="20"
                    />
                    {/* Billable portion */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#84cc16"
                      strokeWidth="20"
                      strokeDasharray={`${billablePercent * 2.51} 251`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-medium">{formatHours(stats.trackedTime)}</span>
                  </div>
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-lime-500 rounded-sm" />
                    <span className="text-sm">Billable</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-lime-300 rounded-sm" />
                    <span className="text-sm">Non-billable</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tasks Summary Table */}
            <div className="mt-6">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-100 rounded-t-lg">
                <span className="text-sm text-muted-foreground">Tasks</span>
                <Select defaultValue="all">
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue placeholder="Show all" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Show all</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-medium">NAME ↑</TableHead>
                    <TableHead className="font-medium">ASSIGNEES</TableHead>
                    <TableHead className="font-medium text-right">TRACKED ↕</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedStatusTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No tasks yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStatusTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell>{task.name}</TableCell>
                        <TableCell className="text-muted-foreground">Anyone</TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatTaskTime(task.trackedTime || 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {/* Pagination */}
              {statusTasksTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {(statusTasksPage - 1) * itemsPerPage + 1} to {Math.min(statusTasksPage * itemsPerPage, statusTasksTotal)} of {statusTasksTotal}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusTasksPage(p => Math.max(1, p - 1))}
                      disabled={statusTasksPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setStatusTasksPage(p => Math.min(statusTasksTotalPages, p + 1))}
                      disabled={statusTasksPage === statusTasksTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="p-6">
            {/* Filter & Add Task */}
            <div className="flex items-center gap-4 mb-4">
              <Select value={taskFilter} onValueChange={setTaskFilter}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Show active" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Show all</SelectItem>
                  <SelectItem value="active">Show active</SelectItem>
                  <SelectItem value="done">Show done</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name"
                  value={taskSearch}
                  onChange={(e) => setTaskSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <div className="flex-1" />

              <div className="flex flex-col">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new Task"
                    value={newTaskName}
                    onChange={(e) => {
                      setNewTaskName(e.target.value)
                      setTaskError("")
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
                    className={cn("w-64 h-9", taskError && "border-red-500")}
                  />
                  <Button 
                    onClick={handleAddTask}
                    className="bg-cyan-500 hover:bg-cyan-600 h-9"
                  >
                    ADD
                  </Button>
                </div>
                {taskError && (
                  <span className="text-xs text-red-500 mt-1">{taskError}</span>
                )}
              </div>
            </div>

            {/* Tasks Table */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-100 rounded-t-lg">
                <span className="text-sm text-muted-foreground">Tasks</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-medium">NAME ↑</TableHead>
                    <TableHead className="font-medium">ASSIGNEES</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No tasks found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-slate-50">
                        <TableCell className={cn(task.status === "done" && "line-through text-muted-foreground")}>
                          {task.name}
                        </TableCell>
                        <TableCell>
                          <span className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded text-sm">
                            Anyone
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {task.status !== "done" ? (
                                <DropdownMenuItem onClick={() => handleMarkDone(task.id)}>
                                  Mark as done
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleRevertTask(task.id)}>
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Revert to active
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setDeletingTask(task)
                                  setIsDeleteTaskDialogOpen(true)
                                }}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {/* Pagination */}
              {tasksTotalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    Showing {(tasksPage - 1) * itemsPerPage + 1} to {Math.min(tasksPage * itemsPerPage, tasksTotal)} of {tasksTotal}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTasksPage(p => Math.max(1, p - 1))}
                      disabled={tasksPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTasksPage(p => Math.min(tasksTotalPages, p + 1))}
                      disabled={tasksPage === tasksTotalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "access" && (
          <div className="p-6">
            {/* Visibility Settings */}
            <div className="border rounded-lg mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Visibility</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Project visibility</p>
                    <p className="text-sm text-muted-foreground">
                      {project.isPublic ? "Public - All team members can see this project" : "Private - Only invited members can see this project"}
                    </p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded text-sm",
                    project.isPublic ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {project.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>
            </div>

            {/* Owner */}
            <div className="border rounded-lg mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Project Owner</span>
              </div>
              <div className="p-4">
                {owner ? (
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={owner.avatarUrl || ""} />
                      <AvatarFallback className="bg-cyan-500 text-white">
                        {getInitials(owner)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{getUserName(owner)}</p>
                      <p className="text-sm text-muted-foreground">Owner · {owner.email}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500 flex items-center justify-center text-white font-medium">
                      ?
                    </div>
                    <div>
                      <p className="font-medium">Project Creator</p>
                      <p className="text-sm text-muted-foreground">Owner · Can manage all project settings</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Team Members */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b flex items-center justify-between">
                <span className="text-sm font-medium">Team Members ({members.length})</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-cyan-500 border-cyan-500"
                  onClick={() => setShowAddMember(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Members
                </Button>
              </div>
              <div className="p-4">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {project.isPublic 
                      ? "This is a public project. All team members have access."
                      : "No additional members have been added to this private project."
                    }
                  </p>
                ) : (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={member.user.avatarUrl || ""} />
                            <AvatarFallback className="bg-slate-200">
                              {getInitials(member.user)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{getUserName(member.user)}</p>
                            <p className="text-xs text-muted-foreground">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 bg-slate-100 rounded capitalize">
                            {member.role}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleRemoveMember(member.userId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isLoadingUsers ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Loading users...
                </p>
              ) : availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found
                </p>
              ) : (
                availableUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleAddMember(user.id)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl || ""} />
                        <AvatarFallback className="bg-slate-200 text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{getUserName(user)}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{deletingTask?.name}</strong>? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteTaskDialogOpen(false)
                setDeletingTask(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingTask && handleDeleteTask(deletingTask.id)}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditProjectDialogOpen} onOpenChange={setIsEditProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleEditProjectSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Project</DialogTitle>
              <DialogDescription>Update project details</DialogDescription>
            </DialogHeader>
            {formErrorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {formErrorMessage}
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Project name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        editColor === c ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setEditColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editIsPublic}
                    onChange={(e) => setEditIsPublic(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Public</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editIsBillable}
                    onChange={(e) => setEditIsBillable(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Billable</span>
                </label>                
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditProjectDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={isDeleteProjectDialogOpen} onOpenChange={setIsDeleteProjectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{project?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteErrorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {deleteErrorMessage}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteProjectDialogOpen(false)
                setDeleteErrorMessage(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteProject}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
