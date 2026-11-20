"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import axiosInstance from "@/lib/axios-config"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, MoreVertical, Pencil, Trash2, Archive } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Project } from "@/lib/types"
import type { ProjectWithStats, UserData } from "@/types/projects"
import { COLORS } from "@/types/projects"
import { ProjectsListSkeleton } from "./projects-skeleton"

function formatTrackedTime(seconds: number): string {
  const hours = seconds / 3600
  return hours.toFixed(2).replace(".", ",") + "h"
}

export function ProjectsManager() {
  const router = useRouter()
  const [projects, setProjects] = React.useState<ProjectWithStats[]>([])
  const [user, setUser] = React.useState<UserData | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [deletingProject, setDeletingProject] = React.useState<Project | null>(null)
  const [editingProject, setEditingProject] = React.useState<Project | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [formErrorMessage, setFormErrorMessage] = React.useState<string | null>(null)
  
  // Get current user info
  const currentUserId = user?.id ? user.id : null
  const isAdmin = user?.role === "admin"
  
  // Filter state
  const [statusFilter, setStatusFilter] = React.useState("active")
  const [accessFilter, setAccessFilter] = React.useState("all")
  const [billingFilter, setBillingFilter] = React.useState("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Pagination state
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10
  
  // Form state
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [color, setColor] = React.useState(COLORS[0])
  const [isPublic, setIsPublic] = React.useState(true)
  const [isBillable, setIsBillable] = React.useState(true)
  const [isArchived, setIsArchived] = React.useState(false)

  React.useEffect(() => {
    fetchUser()
    fetchProjects()
  }, [])

  async function fetchUser() {
    try {
      const response = await axiosInstance.get("/user")
      if (response.data.result) {
        setUser(response.data.result)
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
    }
  }

  async function fetchProjects() {
    try {
      const response = await axiosInstance.get("/project")
      const projectsData = response.data?.result      
      setProjects(
        Array.isArray(projectsData)
          ? projectsData.map((project) => ({
              ...project,
              isActive: project.isActive !== false,
              trackedTime: project.trackedTime ?? 0,
            }))
          : []
      )
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setName("")
    setDescription("")
    setColor(COLORS[0])
    setIsPublic(true)
    setIsBillable(true)
    setIsArchived(false)
    setEditingProject(null)
    setFormErrorMessage(null)
  }

  function openCreateDialog() {
    resetForm()
    setIsDialogOpen(true)
  }

  function openEditDialog(project: Project) {
    setEditingProject(project)
    setName(project.name)
    setDescription(project.description || "")
    setColor(project.color || COLORS[0])
    setIsPublic(project.isPublic ?? true)
    setIsBillable(project.isBillable ?? true)
    setIsArchived(project.isArchived ?? false)
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (!name.trim()) return

    setIsSubmitting(true)
    setFormErrorMessage(null)

    try {
      if (editingProject) {
        const response = await axiosInstance.put(`/project/${editingProject.id}`, {
          name,
          description,
          color,
          isPublic,
          isBillable,
          isArchived,
        })
        const projectResult = response.data?.result ?? response.data
        setProjects(prev => prev.map(p => p.id === projectResult.id ? { ...p, ...projectResult } : p))
      } else {
        const response = await axiosInstance.post("/project", { 
          name, 
          description, 
          color, 
          isPublic, 
          isBillable,
          isArchived
        })
        const projectResult = response.data?.result ?? response.data
        setProjects(prev => [...prev, projectResult])
      }
      
      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      console.error("Failed to save project:", error)
      console.log("Error response:", error.response?.data)
      if (error.response?.status === 400) {
        setFormErrorMessage(error.response.data?.message || "Project name already exists")
      } else {
        setFormErrorMessage("Failed to save project. Please try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: number) {
    setIsDeleting(true)
    setErrorMessage(null)
    try {
      await axiosInstance.delete(`/project/${id}`)
      setProjects(prev => prev.filter(p => p.id !== id))
      setIsDeleteDialogOpen(false)
      setDeletingProject(null)
    } catch (error: any) {
      console.error("Failed to delete project:", error)
      if (error.response?.status === 403) {
        setErrorMessage(error.response.data?.message || "Access denied. Only project owner, admin, or manager can delete this project")
      } else if (error.response?.status === 404) {
        setErrorMessage(error.response.data?.message || "Project not found")
      } else {
        setErrorMessage("Failed to delete project. Please try again.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  function openDeleteDialog(project: Project) {
    setDeletingProject(project)
    setIsDeleteDialogOpen(true)
  }

  async function handleArchive(id: number, archive: boolean) {
    try {
      const response = await axiosInstance.put(`/project/${id}`, { 
        isArchived: archive 
      })
      const projectResult = response.data?.result ?? response.data
      setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, ...projectResult } : p
      ))
    } catch (error) {
      console.error("Failed to archive project:", error)
    }
  }

  const filteredProjects = projects.filter(p => {
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false
    }
    if (statusFilter === "active" && p.isArchived) return false
    if (statusFilter === "archived" && !p.isArchived) return false
    if (accessFilter === "public" && !p.isPublic) return false
    if (accessFilter === "private" && p.isPublic) return false
    if (billingFilter === "billable" && !p.isBillable) return false
    if (billingFilter === "non-billable" && p.isBillable) return false
    return true
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage)
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, accessFilter, searchQuery])

  if (isLoading) {
    return <ProjectsListSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <h1 className="text-2xl font-semibold text-slate-700">Projects</h1>
        <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={openCreateDialog}>
          CREATE NEW PROJECT
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-white">
        <span className="text-sm text-muted-foreground font-medium">FILTER</span>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Client</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accessFilter} onValueChange={setAccessFilter}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Access" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Access</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>

        <Select value={billingFilter} onValueChange={setBillingFilter}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Billing" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Billing</SelectItem>
            <SelectItem value="billable">Billable</SelectItem>
            <SelectItem value="non-billable">Non-billable</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Find by name"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        <Button variant="outline" className="text-cyan-500 border-cyan-500">
          APPLY FILTER
        </Button>
      </div>

      {/* Projects Table */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-2 bg-slate-100 text-sm text-muted-foreground">
          Projects
        </div>
        
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-medium">NAME</TableHead>
              <TableHead className="font-medium">ACCESS</TableHead>
              <TableHead className="font-medium">BILLABLE</TableHead>
              <TableHead className="font-medium">STATUS</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProjects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                  No projects found
                </TableCell>
              </TableRow>
            ) : (
              paginatedProjects.map((project) => (
                <TableRow 
                  key={project.id} 
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.color || "#3b82f6" }}
                      />
                      <span className="text-cyan-600 font-medium">{project.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{project.isPublic ? "Public" : "Private"}</TableCell>
                  <TableCell>
                    <span className={`text-sm ${project.isBillable ? "text-green-600" : "text-muted-foreground"}`}>
                      {project.isBillable ? "Yes" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${project.isArchived ? "text-orange-600" : "text-green-600"}`}>
                      {project.isArchived ? "Archived" : "Active"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(isAdmin || project.userId === currentUserId) && (
                          <>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              openEditDialog(project)
                            }}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation()
                              handleArchive(project.id, !project.isArchived)
                            }}>
                              <Archive className="h-4 w-4 mr-2" />
                              {project.isArchived ? "Unarchive" : "Archive"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                openDeleteDialog(project)
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingProject ? "Edit Project" : "Create New Project"}
              </DialogTitle>
              <DialogDescription>
                {editingProject ? "Update project details" : "Add a new project to track time"}
              </DialogDescription>
            </DialogHeader>
            {formErrorMessage && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {formErrorMessage}
              </div>
            )}
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Project name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
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
                        color === c ? "border-foreground" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Public</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isBillable}
                    onChange={(e) => setIsBillable(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Billable</span>
                </label>                
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-cyan-500 hover:bg-cyan-600" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : (editingProject ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deletingProject?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {errorMessage}
            </div>
          )}
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingProject(null)
                setErrorMessage(null)
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingProject && handleDelete(deletingProject.id)}
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
