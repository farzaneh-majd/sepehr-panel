"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Box, MoreVertical, Trash2, Download, Upload,
  ChevronDown, ChevronRight, Users, UserPlus, Search, Pencil, Check, X
} from "lucide-react"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios-config"
import type { ErdProject, ErdProjectDetail, ErdMember, ErdProjectListProps } from "@/types/erd-designer"
import { TABLE_COLORS } from "@/types/erd-designer"

export function ErdProjectList({
  projects, selectedProject, selectedModuleId,
  onSelectProject, onSelectModule,
  onCreateProject, onDeleteProject,
  onCreateModule, onDeleteModule,
  onUpdateProject, onUpdateModule,
  onExport, onExportJson, onImportJson,
}: ErdProjectListProps) {
  const [createProjectOpen, setCreateProjectOpen] = React.useState(false)
  const [createModuleOpen, setCreateModuleOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newColor, setNewColor] = React.useState("#1e5f8a")
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [confirmDeleteType, setConfirmDeleteType] = React.useState<"project" | "module" | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<number | null>(null)
  const [confirmDeleteName, setConfirmDeleteName] = React.useState("")

  const [renamingProjectId, setRenamingProjectId] = React.useState<number | null>(null)
  const [renamingModuleId, setRenamingModuleId] = React.useState<number | null>(null)
  const [renameValue, setRenameValue] = React.useState("")

  const [expandedProjectId, setExpandedProjectId] = React.useState<number | null>(null)

  const [membersOpen, setMembersOpen] = React.useState(false)
  const [members, setMembers] = React.useState<ErdMember[]>([])
  const [membersLoading, setMembersLoading] = React.useState(false)
  const [memberSearch, setMemberSearch] = React.useState("")
  const [allUsers, setAllUsers] = React.useState<{ id: number; firstName?: string; lastName?: string; email?: string; isActive?: boolean }[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false)
  const [addMemberRole, setAddMemberRole] = React.useState<"editor" | "viewer">("viewer")

  React.useEffect(() => { if (selectedProject) setExpandedProjectId(selectedProject.id) }, [selectedProject?.id])

  const handleCreateProject = () => { if (!newName.trim()) return; onCreateProject(newName.trim(), newColor); setNewName(""); setCreateProjectOpen(false) }
  const handleCreateModule = () => { if (!newName.trim()) return; onCreateModule(newName.trim(), newColor); setNewName(""); setCreateModuleOpen(false) }

  const handleToggleProject = (id: number) => {
    if (expandedProjectId === id) setExpandedProjectId(null)
    else { setExpandedProjectId(id); onSelectProject(id) }
  }

  const askDeleteProject = (id: number, name: string) => { setConfirmDeleteType("project"); setConfirmDeleteId(id); setConfirmDeleteName(name) }
  const askDeleteModule = (id: number, name: string) => { setConfirmDeleteType("module"); setConfirmDeleteId(id); setConfirmDeleteName(name) }
  const handleConfirmDelete = () => {
    if (confirmDeleteType === "project" && confirmDeleteId) onDeleteProject(confirmDeleteId)
    if (confirmDeleteType === "module" && confirmDeleteId) onDeleteModule(confirmDeleteId)
    setConfirmDeleteType(null)
  }

  const startRenameProject = (id: number, name: string) => { setRenamingProjectId(id); setRenameValue(name) }
  const saveRenameProject = () => { if (renamingProjectId && renameValue.trim()) onUpdateProject(renamingProjectId, renameValue.trim()); setRenamingProjectId(null) }
  const startRenameModule = (id: number, name: string) => { setRenamingModuleId(id); setRenameValue(name) }
  const saveRenameModule = () => { if (renamingModuleId && renameValue.trim()) onUpdateModule(renamingModuleId, renameValue.trim()); setRenamingModuleId(null) }

  // ─── Members ──────────────────────────────────────────────

  const handleOpenMembers = async () => {
    if (!selectedProject) return
    setMembersOpen(true); setMembersLoading(true); setMemberSearch("")
    try { const res = await axiosInstance.get(`/erd/projects/${selectedProject.id}/members`); setMembers(res.data?.result ?? res.data ?? []) } catch {} finally { setMembersLoading(false) }
  }

  React.useEffect(() => { if (membersOpen) fetchAllUsers() }, [membersOpen])

  const fetchAllUsers = async () => {
    setIsLoadingUsers(true)
    try { const res = await axiosInstance.get("/user/all"); setAllUsers(Array.isArray(res.data?.result ?? res.data) ? (res.data?.result ?? res.data) : []) } catch {} finally { setIsLoadingUsers(false) }
  }

  const availableUsers = allUsers.filter(u => {
    const isMember = members.some(m => m.userId === u.id)
    const isOwner = selectedProject?.userId === u.id
    const match = memberSearch === "" || `${u.firstName} ${u.lastName}`.toLowerCase().includes(memberSearch.toLowerCase()) || (u.email || "").toLowerCase().includes(memberSearch.toLowerCase())
    return !isMember && !isOwner && u.isActive !== false && match
  })

  const handleAddMember = async (userId: number) => {
    if (!selectedProject) return
    try {
      await axiosInstance.post(`/erd/projects/${selectedProject.id}/members`, { userId, role: addMemberRole })
      const res = await axiosInstance.get(`/erd/projects/${selectedProject.id}/members`)
      setMembers(res.data?.result ?? res.data ?? []); setMemberSearch("")
    } catch {}
  }

  const handleRemoveMember = async (memberId: number) => {
    if (!selectedProject) return
    try { await axiosInstance.delete(`/erd/projects/${selectedProject.id}/members/${memberId}`); setMembers(prev => prev.filter(m => m.id !== memberId)) } catch {}
  }

  const handleChangeRole = async (memberId: number, newRole: string) => {
    if (!selectedProject) return
    try {
      await axiosInstance.put(`/erd/projects/${selectedProject.id}/members/${memberId}`, { role: newRole })
      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    } catch {}
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) { onImportJson(file); e.target.value = "" }
  }

  return (
    <div className="w-64 border-r bg-slate-50 flex flex-col h-full">
      <div className="p-3 border-b flex items-center justify-between">
        <span className="text-sm font-medium">Projects</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setNewName(""); setCreateProjectOpen(true) }}><Plus className="h-4 w-4" /></Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {projects.map(project => {
            const isExpanded = expandedProjectId === project.id
            const isSelected = selectedProject?.id === project.id
            return (
              <div key={project.id}>
                <div className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-slate-200 group", isSelected && "bg-slate-200 font-medium")}
                  onClick={() => handleToggleProject(project.id)}>
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: project.color || "#1e5f8a" }} />
                  {renamingProjectId === project.id ? (
                    <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <Input className="h-6 text-xs px-1" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveRenameProject(); if (e.key === "Escape") setRenamingProjectId(null) }} autoFocus />
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={saveRenameProject}><Check className="h-3 w-3" /></Button>
                      <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setRenamingProjectId(null)}><X className="h-3 w-3" /></Button>
                    </div>
                  ) : <span className="flex-1 truncate">{project.name}</span>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0" onClick={e => e.stopPropagation()}><MoreVertical className="h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); startRenameProject(project.id, project.name) }}><Pencil className="h-4 w-4 mr-2" />Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); handleOpenMembers() }}><Users className="h-4 w-4 mr-2" />Members</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={e => { e.stopPropagation(); askDeleteProject(project.id, project.name) }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isExpanded && isSelected && selectedProject?.modules && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {selectedProject.modules.map(mod => (
                      <div key={mod.id} className={cn("flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm hover:bg-slate-200 group",
                        selectedModuleId === mod.id && "bg-cyan-100 text-cyan-800 font-medium")} onClick={() => onSelectModule(mod.id)}>
                        <Box className="h-3.5 w-3.5 shrink-0" />
                        {renamingModuleId === mod.id ? (
                          <div className="flex-1 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <Input className="h-6 text-xs px-1" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") saveRenameModule(); if (e.key === "Escape") setRenamingModuleId(null) }} autoFocus />
                            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={saveRenameModule}><Check className="h-3 w-3" /></Button>
                          </div>
                        ) : <span className="flex-1 truncate">{mod.name}</span>}
                        <span className="text-xs text-muted-foreground">{mod.tableCount || 0}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={e => e.stopPropagation()}><MoreVertical className="h-3 w-3" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); startRenameModule(mod.id, mod.name) }}><Pencil className="h-4 w-4 mr-2" />Rename</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={e => { e.stopPropagation(); askDeleteModule(mod.id, mod.name) }} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                    <button className="flex items-center gap-2 px-2 py-1.5 text-sm text-cyan-600 hover:bg-slate-200 rounded-md w-full"
                      onClick={() => { setNewName(""); setCreateModuleOpen(true) }}><Plus className="h-3.5 w-3.5" />Add Module</button>
                  </div>
                )}
              </div>
            )
          })}
          {projects.length === 0 && <div className="text-center text-sm text-muted-foreground py-8">No projects yet</div>}
        </div>
      </ScrollArea>

      {/* Bottom actions */}
      {selectedProject && (
        <div className="p-2 border-t space-y-1">
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={onExport}><Download className="h-4 w-4" />Export C#</Button>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={onExportJson}><Download className="h-3.5 w-3.5" />Backup</Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => fileInputRef.current?.click()}><Upload className="h-3.5 w-3.5" />Restore</Button>
          </div>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
        </div>
      )}

      {/* Create Project */}
      <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}><DialogContent>
        <DialogHeader><DialogTitle>Create ERD Project</DialogTitle></DialogHeader>
        <div className="space-y-4 py-4">
          <Input placeholder="Enter project name..." value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateProject()} autoFocus />
          <div className="space-y-2"><label className="text-sm font-medium">Color</label>
            <div className="flex flex-wrap gap-2">
              {TABLE_COLORS.map(c => <button key={c} className={cn("w-7 h-7 rounded-full border-2", newColor === c ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} onClick={() => setNewColor(c)} />)}
            </div></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setCreateProjectOpen(false)}>Cancel</Button><Button onClick={handleCreateProject} disabled={!newName.trim()}>Create</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Create Module */}
      <Dialog open={createModuleOpen} onOpenChange={setCreateModuleOpen}><DialogContent>
        <DialogHeader><DialogTitle>Create Module</DialogTitle></DialogHeader>
        <div className="py-4"><Input placeholder="Enter module name..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateModule()} autoFocus /></div>
        <DialogFooter><Button variant="outline" onClick={() => setCreateModuleOpen(false)}>Cancel</Button><Button onClick={handleCreateModule} disabled={!newName.trim()}>Create</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Confirm Delete */}
      <Dialog open={confirmDeleteType !== null} onOpenChange={() => setConfirmDeleteType(null)}><DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground py-4">
          Are you sure you want to delete <strong>{confirmDeleteName}</strong>?
          {confirmDeleteType === "project" && " This will delete all modules and tables."} {confirmDeleteType === "module" && " This will delete all tables in this module."}
          <br /><span className="text-destructive">This action cannot be undone.</span>
        </p>
        <DialogFooter><Button variant="outline" onClick={() => setConfirmDeleteType(null)}>Cancel</Button><Button variant="destructive" onClick={handleConfirmDelete}>Delete</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Members — with role selector */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}><DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Project Members</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {membersLoading ? <p className="text-sm text-muted-foreground text-center py-4">Loading...</p> : (
            <div className="space-y-2">
              {members.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No members added yet</p>}
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-medium">{m.firstName} {m.lastName}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <select className="text-xs border rounded px-1.5 py-1" value={m.role || "viewer"} onChange={e => handleChangeRole(m.id, e.target.value)}>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveMember(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Add Member</p>
              <select className="text-xs border rounded px-2 py-1" value={addMemberRole} onChange={e => setAddMemberRole(e.target.value as "editor" | "viewer")}>
                <option value="editor">as Editor</option>
                <option value="viewer">as Viewer</option>
              </select>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search users..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {isLoadingUsers ? <p className="text-sm text-muted-foreground text-center py-4">Loading users...</p>
                : memberSearch && availableUsers.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                : memberSearch ? availableUsers.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer" onClick={() => handleAddMember(user.id)}>
                      <div><p className="text-sm font-medium">{user.firstName} {user.lastName}</p><p className="text-xs text-muted-foreground">{user.email}</p></div>
                      <Button variant="ghost" size="sm"><UserPlus className="h-4 w-4" /></Button>
                    </div>
                  )) : <p className="text-xs text-muted-foreground text-center py-2">Type to search users...</p>}
            </div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setMembersOpen(false)}>Close</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  )
}
