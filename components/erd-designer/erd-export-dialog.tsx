"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Copy, Download } from "lucide-react"
import axiosInstance from "@/lib/axios-config"
import type { ErdProjectDetail, ErdExportDialogProps } from "@/types/erd-designer"

export function ErdExportDialog({ open, onOpenChange, project }: ErdExportDialogProps) {
  const [scope, setScope] = React.useState("project")
  const [moduleId, setModuleId] = React.useState<string>("")
  const [selectedTableIds, setSelectedTableIds] = React.useState<number[]>([])
  const [moduleTables, setModuleTables] = React.useState<{ id: number; name: string }[]>([])
  const [code, setCode] = React.useState("")
  const [fileName, setFileName] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  // Load tables when module selected for "selected" scope
  React.useEffect(() => {
    if (scope === "selected" && moduleId) {
      loadModuleTables(Number(moduleId))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, moduleId])

  const loadModuleTables = async (modId: number) => {
    try {
      const res = await axiosInstance.get(`/erd/modules/${modId}`)
      const data = res.data?.result ?? res.data
      setModuleTables(data?.tables?.map((t: any) => ({ id: t.id, name: t.name })) || [])
    } catch {}
  }

  const handleToggleTable = (tableId: number) => {
    setSelectedTableIds(prev =>
      prev.includes(tableId) ? prev.filter(id => id !== tableId) : [...prev, tableId]
    )
  }

  const handleExport = async () => {
    setIsLoading(true)
    try {
      const body: Record<string, unknown> = { scope }
      if (scope === "module" && moduleId) body.moduleId = Number(moduleId)
      if (scope === "selected") body.tableIds = selectedTableIds
      const res = await axiosInstance.post(`/erd/projects/${project.id}/export`, body)
      const data = res.data?.result ?? res.data
      if (data) { setCode(data.code || ""); setFileName(data.fileName || "export.cs") }
    } catch (error) { console.error("Export failed:", error) }
    finally { setIsLoading(false) }
  }

  const handleCopy = () => { navigator.clipboard.writeText(code) }

  const handleDownload = () => {
    const blob = new Blob([code], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = fileName; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader><DialogTitle>Export C# Entities</DialogTitle></DialogHeader>

        <div className="flex items-start gap-3 py-2 flex-wrap">
          <div className="space-y-1">
            <label className="text-sm font-medium">Scope</label>
            <Select value={scope} onValueChange={v => { setScope(v); setCode("") }}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="project">Entire Project</SelectItem>
                <SelectItem value="module">Module</SelectItem>
                <SelectItem value="selected">Selected Tables</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(scope === "module" || scope === "selected") && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Module</label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Select module..." /></SelectTrigger>
                <SelectContent>
                  {project.modules?.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="mt-5">
            <Button onClick={handleExport} disabled={isLoading || ((scope === "module" || scope === "selected") && !moduleId) || (scope === "selected" && selectedTableIds.length === 0)}>
              {isLoading ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        {/* Table selection for "selected" scope */}
        {scope === "selected" && moduleId && moduleTables.length > 0 && (
          <div className="border rounded-lg p-3 max-h-40 overflow-auto space-y-1">
            {moduleTables.map(t => (
              <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                <Checkbox
                  checked={selectedTableIds.includes(t.id)}
                  onCheckedChange={() => handleToggleTable(t.id)}
                />
                {t.name}
              </label>
            ))}
          </div>
        )}

        {code && (
          <div className="flex-1 overflow-auto border rounded-lg bg-slate-900 relative min-h-[200px]">
            <div className="absolute top-2 right-2 flex gap-1 z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleCopy}><Copy className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-white" onClick={handleDownload}><Download className="h-4 w-4" /></Button>
            </div>
            <pre className="p-4 text-sm text-green-400 font-mono whitespace-pre overflow-auto">{code}</pre>
          </div>
        )}

        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
