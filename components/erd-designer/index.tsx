"use client"

import * as React from "react"
import axiosInstance from "@/lib/axios-config"
import { ErdProjectList } from "./erd-project-list"
import { ErdCanvas } from "./erd-canvas"
import { ErdExportDialog } from "./erd-export-dialog"
import type { ErdProject, ErdProjectDetail, ErdModuleDetail, ErdTable, ErdColumn, ErdTableSummary } from "@/types/erd-designer"
import { useUser } from "@/context/UserContext"

export function ErdDesigner() {
  const { user } = useUser()
  const [projects, setProjects] = React.useState<ErdProject[]>([])
  const [selectedProject, setSelectedProject] = React.useState<ErdProjectDetail | null>(null)
  const [selectedModule, setSelectedModule] = React.useState<ErdModuleDetail | null>(null)
  const [allProjectTables, setAllProjectTables] = React.useState<ErdTableSummary[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [exportOpen, setExportOpen] = React.useState(false)
  const [userRole, setUserRole] = React.useState<string>("viewer") // owner | editor | viewer

  React.useEffect(() => { fetchProjects() }, [])

  const fetchProjects = async () => {
    try { const res = await axiosInstance.get("/erd/projects"); setProjects(Array.isArray(res.data?.result ?? res.data) ? (res.data?.result ?? res.data) : []) } catch {} finally { setIsLoading(false) }
  }

  const fetchAllProjectTables = async (projectId: number) => {
    try { const res = await axiosInstance.get(`/erd/projects/${projectId}/tables`); setAllProjectTables(Array.isArray(res.data?.result ?? res.data) ? (res.data?.result ?? res.data) : []) } catch {}
  }

  const determineUserRole = (projectDetail: ErdProjectDetail) => {
    const userId = user?.id
    if (!userId) { setUserRole("viewer"); return }
    if (projectDetail.userId === userId) { setUserRole("owner"); return }
    // Check via members API
    axiosInstance.get(`/erd/projects/${projectDetail.id}/members`).then(res => {
      const members = res.data?.result ?? res.data ?? []
      const myMembership = members.find((m: any) => m.userId === userId)
      setUserRole(myMembership?.role || "viewer")
    }).catch(() => setUserRole("viewer"))
  }

  const canEdit = userRole === "owner" || userRole === "editor"

  const handleSelectProject = async (id: number) => {
    try {
      const res = await axiosInstance.get(`/erd/projects/${id}`)
      const data = res.data?.result ?? res.data
      setSelectedProject(data); setSelectedModule(null); fetchAllProjectTables(id)
      if (data) determineUserRole(data)
    } catch {}
  }

  const handleSelectModule = async (moduleId: number) => {
    try { const res = await axiosInstance.get(`/erd/modules/${moduleId}`); setSelectedModule(res.data?.result ?? res.data) } catch {}
  }

  const handleCreateProject = async (name: string, color?: string) => {
    try { const res = await axiosInstance.post("/erd/projects", { name, color }); const d = res.data?.result ?? res.data; if (d) { setProjects(prev => [d, ...prev]); handleSelectProject(d.id) } } catch {}
  }

  const handleUpdateProject = async (id: number, name: string) => {
    try { const res = await axiosInstance.put(`/erd/projects/${id}`, { name }); const d = res.data?.result ?? res.data
      if (d) { setProjects(prev => prev.map(p => p.id === id ? { ...p, name: d.name } : p)); setSelectedProject(prev => prev?.id === id ? { ...prev, name: d.name } : prev) }
    } catch {}
  }

  const handleDeleteProject = async (id: number) => {
    try { await axiosInstance.delete(`/erd/projects/${id}`); setProjects(prev => prev.filter(p => p.id !== id)); if (selectedProject?.id === id) { setSelectedProject(null); setSelectedModule(null) } } catch {}
  }

  const handleCreateModule = async (name: string, color?: string) => {
    if (!selectedProject) return
    try { const res = await axiosInstance.post(`/erd/projects/${selectedProject.id}/modules`, { name, color }); const d = res.data?.result ?? res.data
      if (d) { setSelectedProject(prev => prev ? { ...prev, modules: [...(prev.modules || []), d] } : null); handleSelectModule(d.id) }
    } catch {}
  }

  const handleUpdateModule = async (moduleId: number, name: string) => {
    try { const res = await axiosInstance.put(`/erd/modules/${moduleId}`, { name }); const d = res.data?.result ?? res.data
      if (d) { setSelectedProject(prev => prev ? { ...prev, modules: prev.modules?.map(m => m.id === moduleId ? { ...m, name: d.name } : m) || [] } : null)
        setSelectedModule(prev => prev?.id === moduleId ? { ...prev, name: d.name } : prev) }
    } catch {}
  }

  const handleDeleteModule = async (moduleId: number) => {
    try { await axiosInstance.delete(`/erd/modules/${moduleId}`); setSelectedProject(prev => prev ? { ...prev, modules: prev.modules?.filter(m => m.id !== moduleId) || [] } : null)
      if (selectedModule?.id === moduleId) setSelectedModule(null) } catch {}
  }

  // ─── Table CRUD ───────────────────────────────────────────

  const handleCreateTable = async (name: string, x?: number, y?: number) => {
    if (!selectedModule || !selectedProject) return
    try { const res = await axiosInstance.post(`/erd/modules/${selectedModule.id}/tables`, { name, positionX: x ?? 100, positionY: y ?? 100 }); const d = res.data?.result ?? res.data
      if (d) { setSelectedModule(prev => prev ? { ...prev, tables: [...(prev.tables || []), d] } : null)
        setSelectedProject(prev => prev ? { ...prev, modules: prev.modules?.map(m => m.id === selectedModule.id ? { ...m, tableCount: (m.tableCount || 0) + 1 } : m) || [] } : null)
        fetchAllProjectTables(selectedProject.id) }
    } catch {}
  }

  const handleUpdateTable = async (tableId: number, updates: Partial<ErdTable>) => {
    if (updates.positionX !== undefined || updates.positionY !== undefined) {
      setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.map(t => t.id === tableId ? { ...t, ...updates } : t) || [] } : null)
      try { await axiosInstance.put(`/erd/tables/${tableId}`, updates) } catch {}; return
    }
    try { const res = await axiosInstance.put(`/erd/tables/${tableId}`, updates); const d = res.data?.result ?? res.data
      if (d) setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.map(t => t.id === tableId ? d : {
        ...t, columns: t.columns?.map(c => c.referencedTableId === tableId ? { ...c, referencedTableName: d.name } : c) || [] }) || [] } : null)
      if (d && updates.name !== undefined && selectedProject) fetchAllProjectTables(selectedProject.id)
    } catch {}
  }

  const handleDeleteTable = async (tableId: number) => {
    if (!selectedModule || !selectedProject) return
    try { await axiosInstance.delete(`/erd/tables/${tableId}`); setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.filter(t => t.id !== tableId) || [] } : null)
      setSelectedProject(prev => prev ? { ...prev, modules: prev.modules?.map(m => m.id === selectedModule.id ? { ...m, tableCount: Math.max(0, (m.tableCount || 0) - 1) } : m) || [] } : null)
      fetchAllProjectTables(selectedProject.id) } catch {}
  }

  const handleCreateColumn = async (tableId: number, column: Partial<ErdColumn>) => {
    try { const res = await axiosInstance.post(`/erd/tables/${tableId}/columns`, column); const d = res.data?.result ?? res.data
      if (d) setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.map(t => t.id === tableId ? { ...t, columns: [...(t.columns || []), d] } : t) || [] } : null)
    } catch {}
  }

  const handleUpdateColumn = async (columnId: number, updates: Partial<ErdColumn>) => {
    try { const res = await axiosInstance.put(`/erd/columns/${columnId}`, updates); const d = res.data?.result ?? res.data
      if (d) setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.map(t => ({ ...t, columns: t.columns?.map(c => c.id === columnId ? d : c) || [] })) || [] } : null)
    } catch {}
  }

  const handleDeleteColumn = async (columnId: number, tableId: number) => {
    try { await axiosInstance.delete(`/erd/columns/${columnId}`)
      setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.map(t => t.id === tableId ? { ...t, columns: t.columns?.filter(c => c.id !== columnId) || [] } : t) || [] } : null)
    } catch {}
  }

  const handleReorderColumns = async (tableId: number, columnIds: number[]) => {
    setSelectedModule(prev => prev ? { ...prev, tables: prev.tables?.map(t => t.id === tableId
      ? { ...t, columns: t.columns?.map(c => ({ ...c, position: columnIds.indexOf(c.id) })) || [] } : t) || [] } : null)
    try { await axiosInstance.put(`/erd/tables/${tableId}/columns/order`, { columnIds }) }
    catch { if (selectedModule) handleSelectModule(selectedModule.id) }
  }

  const handleDuplicateTable = async (table: ErdTable, x: number, y: number) => {
    if (!selectedModule || !selectedProject) return
    const moduleId = selectedModule.id
    try {
      const res = await axiosInstance.post(`/erd/modules/${moduleId}/tables`, { name: `${table.name}_copy`, positionX: x, positionY: y, color: table.color })
      const created: ErdTable | undefined = res.data?.result ?? res.data
      if (!created) return
      const sourceColumns = [...(table.columns || [])].sort((a, b) => (a.position || 0) - (b.position || 0))
      const sourcePk = sourceColumns.find(c => c.isPrimaryKey)
      const createdPk = created.columns?.find(c => c.isPrimaryKey)
      if (sourcePk && createdPk && (sourcePk.name !== createdPk.name || sourcePk.dataType !== createdPk.dataType))
        await axiosInstance.put(`/erd/columns/${createdPk.id}`, { name: sourcePk.name, dataType: sourcePk.dataType })
      for (const col of sourceColumns.filter(c => c.id !== sourcePk?.id)) {
        await axiosInstance.post(`/erd/tables/${created.id}/columns`, {
          name: col.name, dataType: col.dataType, isPrimaryKey: col.isPrimaryKey, isForeignKey: col.isForeignKey,
          isNullable: col.isNullable, isUnique: col.isUnique, defaultValue: col.defaultValue, description: col.description,
          referencedTableId: col.referencedTableId, referencedColumnName: col.referencedColumnName,
        })
      }
      setSelectedProject(prev => prev ? { ...prev, modules: prev.modules?.map(m => m.id === moduleId ? { ...m, tableCount: (m.tableCount || 0) + 1 } : m) || [] } : null)
      await handleSelectModule(moduleId)
      fetchAllProjectTables(selectedProject.id)
    } catch {}
  }

  const handleUpdateExternalLayout = async (externalLayout: string) => {
    if (!selectedModule) return
    const moduleId = selectedModule.id
    setSelectedModule(prev => prev?.id === moduleId ? { ...prev, externalLayout } : prev)
    try { await axiosInstance.put(`/erd/modules/${moduleId}`, { externalLayout }) } catch {}
  }

  // ─── JSON Import / Export ─────────────────────────────────

  const handleExportJson = async () => {
    if (!selectedProject) return
    try {
      const res = await axiosInstance.get(`/erd/projects/${selectedProject.id}/backup`)
      const data = res.data?.result ?? res.data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a"); a.href = url; a.download = `${selectedProject.name}_backup.json`; a.click()
      URL.revokeObjectURL(url)
    } catch (error) { console.error("Export failed:", error) }
  }

  const handleImportJson = async (file: File) => {
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await axiosInstance.post("/erd/projects/restore", data)
      const newProject = res.data?.result ?? res.data
      if (newProject) { await fetchProjects(); handleSelectProject(newProject.id) }
    } catch (error) { console.error("Import failed:", error) }
  }

  if (isLoading) return <div className="flex items-center justify-center h-full"><div className="text-muted-foreground">Loading...</div></div>

  return (
    <div className="flex h-full">
      <ErdProjectList
        projects={projects} selectedProject={selectedProject} selectedModuleId={selectedModule?.id}
        onSelectProject={handleSelectProject} onSelectModule={handleSelectModule}
        onCreateProject={handleCreateProject} onDeleteProject={handleDeleteProject}
        onCreateModule={handleCreateModule} onDeleteModule={handleDeleteModule}
        onUpdateProject={handleUpdateProject} onUpdateModule={handleUpdateModule}
        onExport={() => setExportOpen(true)} onExportJson={handleExportJson} onImportJson={handleImportJson}
      />
      <div className="flex-1 overflow-hidden">
        {selectedModule ? (
          <ErdCanvas key={selectedModule.id} module={selectedModule} allProjectTables={allProjectTables} canEdit={canEdit}
            onCreateTable={handleCreateTable} onUpdateTable={handleUpdateTable} onDeleteTable={handleDeleteTable} onDuplicateTable={handleDuplicateTable}
            onCreateColumn={handleCreateColumn} onUpdateColumn={handleUpdateColumn} onDeleteColumn={handleDeleteColumn}
            onReorderColumns={handleReorderColumns} onUpdateExternalLayout={handleUpdateExternalLayout} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {selectedProject ? "Select a module or create one to start designing" : "Select a project or create one to get started"}
          </div>
        )}
      </div>
      {selectedProject && <ErdExportDialog open={exportOpen} onOpenChange={setExportOpen} project={selectedProject} />}
    </div>
  )
}
