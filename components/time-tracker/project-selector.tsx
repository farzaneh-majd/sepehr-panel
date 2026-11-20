"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Project, Task } from "@/lib/types"
import type { ProjectSelectorProps } from "@/types/time-tracker"

export function ProjectSelector({
  projects,
  tasks,
  selectedProjectId,
  selectedTaskId,
  onSelect,
  onCreateProject,
  onCreateTask,
  className,
}: ProjectSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [expandedProjectId, setExpandedProjectId] = React.useState<number | null>(null)
  
  const [taskDialogOpen, setTaskDialogOpen] = React.useState(false)
  const [newTaskName, setNewTaskName] = React.useState("")
  const [createTaskForProjectId, setCreateTaskForProjectId] = React.useState<number | null>(null)
  const [isCreatingTask, setIsCreatingTask] = React.useState(false)

  const projectsArray = Array.isArray(projects) ? projects : []
  const tasksArray = Array.isArray(tasks) ? tasks : []

  const selectedProject = projectsArray.find(p => p.id === selectedProjectId)
  const selectedTask = tasksArray.find(t => t.id === selectedTaskId)

  const searchLower = search.toLowerCase()

  const filteredProjects = projectsArray.filter(p => {
    if (p.name.toLowerCase().includes(searchLower)) return true
    return tasksArray.some(t => t.projectId === p.id && t.name.toLowerCase().includes(searchLower))
  })

  const getFilteredTasksForProject = (projectId: number) => {
    if (!searchLower) return tasksArray.filter(t => t.projectId === projectId)
    return tasksArray.filter(t => t.projectId === projectId && t.name.toLowerCase().includes(searchLower))
  }

  const shouldAutoExpand = (projectId: number) => {
    if (!searchLower) return false
    const projectMatches = projectsArray.find(p => p.id === projectId)?.name.toLowerCase().includes(searchLower)
    return !projectMatches && tasksArray.some(t => t.projectId === projectId && t.name.toLowerCase().includes(searchLower))
  }



  const handleProjectClick = (project: Project) => {
    setExpandedProjectId(expandedProjectId === project.id ? null : project.id)
  }

  const handleTaskClick = (projectId: number, taskId: number) => {
    onSelect(projectId, taskId)
    setOpen(false)
  }

  const handleSelectProjectOnly = (projectId: number) => {
    onSelect(projectId, undefined)
    setOpen(false)
  }

  const handleOpenTaskDialog = (projectId: number) => {
    setCreateTaskForProjectId(projectId)
    setNewTaskName("")
    setTaskDialogOpen(true)
  }

  const handleCreateTask = async () => {
    if (!createTaskForProjectId || !newTaskName.trim() || !onCreateTask) return
    
    setIsCreatingTask(true)
    try {
      const newTask = await onCreateTask(createTaskForProjectId, newTaskName.trim())
      if (newTask) {
        onSelect(createTaskForProjectId, newTask.id)
        setOpen(false)
      }
      setTaskDialogOpen(false)
      setNewTaskName("")
      setCreateTaskForProjectId(null)
    } catch (error) {
      console.error("Failed to create task:", error)
    } finally {
      setIsCreatingTask(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "gap-2 text-muted-foreground max-w-full min-w-0 justify-start",
            selectedProject && "text-cyan-600",
            className
          )}
        >
          {selectedProject ? (
            <>
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: selectedProject.color || "#3b82f6" }}
              />
              <span className="truncate min-w-0">
                {selectedProject.name}
                {selectedTask && (
                  <span className="text-muted-foreground">: {selectedTask.name}</span>
                )}
              </span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Project
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* Projects List */}
        <div className="max-h-64 overflow-auto py-1">
          {filteredProjects.map((project) => {
            const projectTasks = getFilteredTasksForProject(project.id)
            const isExpanded = expandedProjectId === project.id || shouldAutoExpand(project.id)
            const isSelected = selectedProjectId === project.id && !selectedTaskId

            return (
              <div key={project.id}>
                <button
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left",
                    isSelected && "bg-muted"
                  )}
                  onClick={() => handleProjectClick(project)}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: project.color || "#3b82f6" }}
                  />
                  <span className="flex-1 truncate">{project.name}</span>
                  {projectTasks.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {projectTasks.length} Tasks
                    </span>
                  )}
                  {isSelected && <Check className="h-4 w-4 text-cyan-500" />}
                </button>

                {/* Tasks under project - always show when expanded */}
                {isExpanded && (
                  <div className="bg-muted/50">
                    {/* Select project only option */}
                    <button
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 pl-7 hover:bg-muted text-left text-sm text-muted-foreground",
                        isSelected && "bg-muted"
                      )}
                      onClick={() => handleSelectProjectOnly(project.id)}
                    >
                      <span className="flex-1 truncate">No Task</span>
                      {isSelected && <Check className="h-4 w-4 text-cyan-500" />}
                    </button>
                    
                    {projectTasks.map((task) => {
                      const isTaskSelected = selectedTaskId === task.id
                      return (
                        <button
                          key={task.id}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 pl-7 hover:bg-muted text-left text-sm",
                            isTaskSelected && "bg-muted"
                          )}
                          onClick={() => handleTaskClick(project.id, task.id)}
                        >
                          <span className="flex-1 truncate">{task.name}</span>
                          {isTaskSelected && <Check className="h-4 w-4 text-cyan-500" />}
                        </button>
                      )
                    })}
                    {onCreateTask && (
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 pl-7 hover:bg-muted text-left text-sm text-cyan-600"
                        onClick={() => handleOpenTaskDialog(project.id)}
                      >
                        <Plus className="h-4 w-4" />
                        Create new Task
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Create Project */}
        {onCreateProject && (
          <div className="border-t p-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-cyan-600"
              onClick={onCreateProject}
            >
              <Plus className="h-4 w-4" />
              Create new Project
            </button>
          </div>
        )}
      </PopoverContent>

      {/* Create Task Dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Task Name</label>
              <Input
                placeholder="Enter task name..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTask}
              disabled={!newTaskName.trim() || isCreatingTask}
            >
              {isCreatingTask ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  )
}
