"use client"

import * as React from "react"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Search, MoreVertical, Plus, Pencil, Trash2, UserX, UserCheck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"
import type { TeamMember } from "@/types/team"
import { ROLE_COLORS, GROUP_COLORS } from "@/types/team"
import { TeamSkeleton } from "./team-skeleton"

export function TeamManager() {
  const [members, setMembers] = React.useState<TeamMember[]>([])
  const [groups, setGroups] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<"full" | "limited" | "groups">("full")
  
  // Current user state
  const [user, setUser] = React.useState<{ id: number; role: string } | null>(null)
  const currentUserId = user?.id ?? null
  const isAdmin = user?.role === "admin"
  
  // Filter state
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [groupFilter, setGroupFilter] = React.useState("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [deletingMember, setDeletingMember] = React.useState<TeamMember | null>(null)
  const [statusMember, setStatusMember] = React.useState<TeamMember | null>(null)
  const [isStatusSubmitting, setIsStatusSubmitting] = React.useState(false)
  const [editingMember, setEditingMember] = React.useState<TeamMember | null>(null)
  
  // Form state
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [username, setUsername] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [role, setRole] = React.useState("user")
  const [memberGroups, setMemberGroups] = React.useState<string[]>([])
  const [newGroupName, setNewGroupName] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // Pagination state
  const [membersPage, setMembersPage] = React.useState(1)
  const [groupsPage, setGroupsPage] = React.useState(1)
  const itemsPerPage = 10

  React.useEffect(() => {
    fetchUser()
    fetchMembers()
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

  async function fetchMembers() {
    try {
      const membersRes = await axiosInstance.get("/user/all")
      const data = membersRes.data?.result ?? membersRes.data
      const membersWithRoles = (Array.isArray(data) ? data : []).map((m: User) => ({
        ...m,
        roles: m.role === "admin" ? ["Admin", "Project Manager"] : 
               m.role === "manager" ? ["Project Manager"] : [],
        groups: [],
      }))
      setMembers(membersWithRoles)
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  function resetForm() {
    setFirstName("")
    setLastName("")
    setUsername("")
    setEmail("")
    setPassword("")
    setRole("user")
    setMemberGroups([])
    setEditingMember(null)
  }

  function openCreateDialog() {
    resetForm()
    setIsDialogOpen(true)
  }

  function openEditDialog(member: TeamMember) {
    setEditingMember(member)
    setFirstName(member.firstName || "")
    setLastName(member.lastName || "")
    setUsername((member as any).username || "")
    setEmail(member.email || "")
    setRole(member.role || "user")
    setMemberGroups(member.groups || [])
    setIsDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    setIsSubmitting(true)

    try {
      if (editingMember) {
        // Update existing member
        const res = await axiosInstance.put(`/user/${editingMember.id}`, {
          firstName,
          lastName,
          role,
        })
        const updated = res.data?.result ?? res.data
        setMembers(prev => prev.map(m => 
          m.id === updated.id 
            ? { ...m, ...updated, groups: memberGroups }
            : m
        ))
      } else {
        // Create new member
        if (!username.trim() || !email.trim() || !password.trim()) {
          alert("Username, email, and password are required")
          setIsSubmitting(false)
          return
        }

        const payload: any = {
          username: username.trim(),
          email: email.trim(),
          password: password.trim(),
          role,
        }
        if (firstName.trim()) payload.firstName = firstName.trim()
        if (lastName.trim()) payload.lastName = lastName.trim()

        const res = await axiosInstance.post("/user", payload)
        const created = res.data?.result ?? res.data
        setMembers(prev => [...prev, {
          ...created,
          roles: created.role === "admin" ? ["Admin", "Project Manager"] :
                 created.role === "manager" ? ["Project Manager"] : [],
          groups: memberGroups,
        }])
      }
      
      setIsDialogOpen(false)
      resetForm()
    } catch (error: any) {
      const errorData = error?.response?.data
      let message = "Failed to save member"
      if (errorData?.errors && typeof errorData.errors === 'object') {
        const validationErrors = Object.entries(errorData.errors)
          .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
          .join('\n')
        message = validationErrors
      } else if (errorData?.title) {
        message = errorData.title
      } else if (errorData?.error || errorData?.message) {
        message = errorData.error || errorData.message
      } else if (error?.message) {
        message = error.message
      }
      alert(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  function openDeleteDialog(member: TeamMember) {
    setDeletingMember(member)
    setIsDeleteDialogOpen(true)
  }

  async function handleDelete(id: number) {
    try {
      await axiosInstance.delete(`/user/${id}`)
      setMembers(prev => prev.filter(m => m.id !== id))
      setIsDeleteDialogOpen(false)
      setDeletingMember(null)
    } catch (error) {
      console.error("Failed to delete member:", error)
    }
  }

  async function handleStatusChange(member: TeamMember) {
    const action = member.isActive === false ? "activate" : "deactivate"
    setIsStatusSubmitting(true)
    try {
      const res = await axiosInstance.put(`/user/${member.id}/${action}`)
      const updated = res.data?.result ?? res.data
      setMembers(prev => prev.map(m =>
        m.id === member.id
          ? { ...m, isActive: updated.isActive, deactivatedAt: updated.deactivatedAt }
          : m
      ))
      setStatusMember(null)
    } catch (error) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
      alert(message || `Failed to ${action} member`)
    } finally {
      setIsStatusSubmitting(false)
    }
  }

  function handleAddGroup() {
    if (newGroupName.trim() && !groups.includes(newGroupName.trim())) {
      setGroups(prev => [...prev, newGroupName.trim()])
      setNewGroupName("")
    }
  }

  function clearFilters() {
    setStatusFilter("all")
    setRoleFilter("all")
    setGroupFilter("all")
    setSearchQuery("")
  }

  const filteredMembers = members.filter(m => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const fullName = `${m.firstName || ""} ${m.lastName || ""}`.toLowerCase()
      if (!fullName.includes(query) && !m.email.toLowerCase().includes(query)) {
        return false
      }
    }
    if (statusFilter === "active" && m.isActive === false) return false
    if (statusFilter === "inactive" && m.isActive !== false) return false
    if (roleFilter !== "all" && m.role !== roleFilter) return false
    if (groupFilter !== "all" && !m.groups?.includes(groupFilter)) return false
    return true
  })

  // Filter for FULL (admin/manager) and LIMITED (regular users) tabs
  const fullMembers = filteredMembers.filter(m => m.role === "admin" || m.role === "manager")
  const limitedMembers = filteredMembers.filter(m => m.role === "user" || !m.role)

  // Current tab members
  const currentMembers = activeTab === "full" ? fullMembers : activeTab === "limited" ? limitedMembers : filteredMembers

  // Pagination calculations
  const membersTotalPages = Math.ceil(currentMembers.length / itemsPerPage)
  const paginatedMembers = currentMembers.slice(
    (membersPage - 1) * itemsPerPage,
    membersPage * itemsPerPage
  )

  const groupsTotalPages = Math.ceil(groups.length / itemsPerPage)
  const paginatedGroups = groups.slice(
    (groupsPage - 1) * itemsPerPage,
    groupsPage * itemsPerPage
  )

  // Reset page when filters or tab change
  React.useEffect(() => {
    setMembersPage(1)
  }, [statusFilter, roleFilter, groupFilter, searchQuery, activeTab])

  if (isLoading) {
    return <TeamSkeleton />
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <h1 className="text-2xl font-semibold text-slate-700">Team</h1>
        {isAdmin && (
          <Button className="bg-cyan-500 hover:bg-cyan-600" onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            ADD MEMBER
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium",
            activeTab === "full" 
              ? "text-foreground border-b-2 border-foreground bg-white" 
              : "text-muted-foreground hover:text-foreground bg-slate-100"
          )}
          onClick={() => setActiveTab("full")}
        >
          FULL
        </button>
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium",
            activeTab === "limited" 
              ? "text-foreground border-b-2 border-foreground bg-white" 
              : "text-muted-foreground hover:text-foreground bg-slate-100"
          )}
          onClick={() => setActiveTab("limited")}
        >
          LIMITED
        </button>
        <button
          className={cn(
            "px-6 py-3 text-sm font-medium",
            activeTab === "groups" 
              ? "text-foreground border-b-2 border-foreground bg-white" 
              : "text-muted-foreground hover:text-foreground bg-slate-100"
          )}
          onClick={() => setActiveTab("groups")}
        >
          GROUPS
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b bg-white">
        <span className="text-sm text-muted-foreground font-medium">FILTER</span>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Role</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>

        <Select value={groupFilter} onValueChange={setGroupFilter}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Group</SelectItem>
            {groups.map(g => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>

        <Button variant="outline" className="text-cyan-500 border-cyan-500">
          APPLY FILTER
        </Button>
      </div>

      {/* Clear Filters */}
      <div className="flex justify-end px-6 py-2">
        <button 
          className="text-sm text-cyan-600 hover:underline"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </div>

      {/* Content */}
      {activeTab === "groups" ? (
        <div className="flex-1 p-6">
          {isAdmin && (
            <div className="flex items-center gap-4 mb-4">
              <Input
                placeholder="New group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                className="max-w-xs"
              />
              <Button onClick={handleAddGroup} className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </div>
          )}
          
          <div className="border rounded-lg">
            <div className="px-4 py-2 bg-slate-100 text-sm text-muted-foreground">
              Groups ({groups.length})
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="font-medium">NAME ↑</TableHead>
                  <TableHead className="font-medium">MEMBERS</TableHead>
                  <TableHead className="font-medium">DESCRIPTION</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGroups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-16 text-muted-foreground">
                      No groups yet. Create your first group above.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedGroups.map((group, index) => (
                    <TableRow key={group} className="hover:bg-slate-50">
                      <TableCell>
                        <span className={cn(
                          "px-3 py-1 rounded text-sm font-medium",
                          GROUP_COLORS[index % GROUP_COLORS.length]
                        )}>
                          {group}
                        </span>
                      </TableCell>
                      <TableCell>
                        {members.filter(m => m.groups?.includes(group)).length} members
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        –
                      </TableCell>
                      <TableCell>
                        {isAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setGroups(prev => prev.filter(g => g !== group))}>
                                <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {/* Pagination */}
            {groupsTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-sm text-muted-foreground">
                  Showing {(groupsPage - 1) * itemsPerPage + 1} to {Math.min(groupsPage * itemsPerPage, groups.length)} of {groups.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGroupsPage(p => Math.max(1, p - 1))}
                    disabled={groupsPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setGroupsPage(p => Math.min(groupsTotalPages, p + 1))}
                    disabled={groupsPage === groupsTotalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="px-6 py-2 bg-slate-100 text-sm text-muted-foreground">
            {activeTab === "full" ? "Full Access Members (Admins & Managers)" : "Limited Access Members"} ({currentMembers.length})
          </div>
          
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-medium">NAME ↑</TableHead>
                <TableHead className="font-medium">EMAIL ↕</TableHead>
                <TableHead className="font-medium">ROLE</TableHead>
                <TableHead className="font-medium">GROUP</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                    {activeTab === "full" 
                      ? "No admins or managers found" 
                      : "No limited access members found"
                    }
                  </TableCell>
                </TableRow>
              ) : (
                paginatedMembers.map((member) => (
                  <TableRow
                    key={member.id}
                    className={cn("hover:bg-slate-50", member.isActive === false && "bg-slate-50 text-muted-foreground")}
                  >
                    <TableCell>
                      <span className="font-medium">
                        {member.firstName && member.lastName
                          ? `${member.firstName} ${member.lastName}`
                          : member.firstName || member.lastName || member.email || "—"}
                        {member.id === currentUserId && (
                          <span className="text-muted-foreground ml-1">(you)</span>
                        )}
                      </span>
                      {member.isActive === false && (
                        <span
                          className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-600 border border-red-200"
                          title={member.deactivatedAt ? `Deactivated at ${member.deactivatedAt.replace("T", " ").slice(0, 16)}` : undefined}
                        >
                          Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {member.email}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {member.role === "admin" && (
                          <span className={cn("px-3 py-1 rounded text-xs font-medium", ROLE_COLORS.admin)}>
                            Admin
                          </span>
                        )}
                        {(member.role === "admin" || member.role === "manager") && (
                          <span className={cn("px-3 py-1 rounded text-xs font-medium", ROLE_COLORS["project manager"])}>
                            Project Manager
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {member.groups?.map((group) => (
                          <span 
                            key={group}
                            className={cn(
                              "px-3 py-1 rounded text-xs font-medium",
                              GROUP_COLORS[groups.indexOf(group) % GROUP_COLORS.length]
                            )}
                          >
                            {group}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(member)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            {member.id !== currentUserId && (
                              <DropdownMenuItem onClick={() => setStatusMember(member)}>
                                {member.isActive === false ? (
                                  <>
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Activate
                                  </>
                                ) : (
                                  <>
                                    <UserX className="h-4 w-4 mr-2" />
                                    Deactivate
                                  </>
                                )}
                              </DropdownMenuItem>
                            )}
                            {member.id !== currentUserId && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => openDeleteDialog(member)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          {membersTotalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-white">
              <span className="text-sm text-muted-foreground">
                Showing {(membersPage - 1) * itemsPerPage + 1} to {Math.min(membersPage * itemsPerPage, currentMembers.length)} of {currentMembers.length}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMembersPage(p => Math.max(1, p - 1))}
                  disabled={membersPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMembersPage(p => Math.min(membersTotalPages, p + 1))}
                  disabled={membersPage === membersTotalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Member Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingMember ? "Edit Team Member" : "Add New Member"}
              </DialogTitle>
              <DialogDescription>
                {editingMember 
                  ? "Update member details and permissions"
                  : "Create a new team member account"
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="username">Username <span className="text-destructive">*</span></Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="johndoe"
                  required={!editingMember}
                  disabled={!!editingMember}
                  className={editingMember ? "bg-muted" : ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!editingMember}
                  className={editingMember ? "bg-muted" : ""}
                  placeholder="john@example.com"
                  required={!editingMember}
                />
              </div>
              {!editingMember && (
                <div className="grid gap-2">
                  <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Role <span className="text-destructive">*</span></Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Project Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Groups</Label>
                <div className="flex flex-wrap gap-2">
                  {groups.map(g => (
                    <label key={g} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={memberGroups.includes(g)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setMemberGroups(prev => [...prev, g])
                          } else {
                            setMemberGroups(prev => prev.filter(x => x !== g))
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{g}</span>
                    </label>
                  ))}
                  {groups.length === 0 && (
                    <span className="text-sm text-muted-foreground">
                      No groups available. Create groups in the GROUPS tab.
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-600"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving..."
                  : editingMember ? "Save Changes" : "Create Member"
                }
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Activate/Deactivate Confirmation Dialog */}
      <Dialog open={!!statusMember} onOpenChange={(open) => !open && setStatusMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {statusMember?.isActive === false ? "Activate Team Member" : "Deactivate Team Member"}
            </DialogTitle>
            <DialogDescription>
              {statusMember?.isActive === false ? (
                <>
                  <strong>{statusMember?.firstName} {statusMember?.lastName}</strong> will be able to sign in to the panel again.
                </>
              ) : (
                <>
                  <strong>{statusMember?.firstName} {statusMember?.lastName}</strong> will lose access to the panel and be signed out of any open session. Their running timer will be stopped. Their history stays available in reports.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setStatusMember(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={statusMember?.isActive === false ? "default" : "destructive"}
              className={statusMember?.isActive === false ? "bg-cyan-500 hover:bg-cyan-600" : undefined}
              disabled={isStatusSubmitting}
              onClick={() => statusMember && handleStatusChange(statusMember)}
            >
              {isStatusSubmitting
                ? "Saving..."
                : statusMember?.isActive === false ? "Activate" : "Deactivate"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{deletingMember?.firstName} {deletingMember?.lastName}</strong>? This action cannot be undone.
              {" "}To keep their history in reports, deactivate them instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingMember(null)
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => deletingMember && handleDelete(deletingMember.id)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
