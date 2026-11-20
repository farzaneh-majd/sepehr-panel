"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
  Plus, Minus, Trash2, MoreVertical, Link2, GripVertical, Pencil, Search, Maximize2, Copy, Palette, Type, Cable, Unlink,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ErdTable, ErdColumn, ErdTableSummary, ErdCanvasProps } from "@/types/erd-designer"
import { DATA_TYPES, TABLE_COLORS } from "@/types/erd-designer"

const HEADER_H = 36
const ROW_H = 28
const BODY_TOP = HEADER_H + 1
const STUB = 26

type Point = { x: number; y: number }
type NodeBox = { x: number; y: number; w: number; h: number }
type Ghost = { refId: number; name: string; moduleName: string; columnName: string; parentTableId: number }
type Relation = {
  key: string; columnId: number; childKey: string; parentKey: string; childRow: number; parentRow: number
  nullable: boolean; unique: boolean; external: boolean; label: string
}
type DropTarget = { tableId: number; columnId?: number }
type Connect = { fromKey: string; mouse: Point; startClient: Point; sticky: boolean }

const sortColumns = (cols?: ErdColumn[]) => [...(cols || [])].sort((a, b) => (a.position || 0) - (b.position || 0))

function parseLayout(raw?: string | null): Record<number, Point> {
  if (!raw) return {}
  try { const v = JSON.parse(raw); return v && typeof v === "object" ? v : {} } catch { return {} }
}

function singular(name: string) {
  if (/ies$/i.test(name)) return name.slice(0, -3) + (name.endsWith("IES") ? "Y" : "y")
  if (/(ss|us|is)$/i.test(name)) return name
  if (/s$/i.test(name)) return name.slice(0, -1)
  return name
}

function fkColumnName(tableName: string, pkName: string) {
  const base = singular(tableName.trim().replace(/\s+/g, "_"))
  if (/^[A-Z]/.test(pkName)) return `${base.charAt(0).toUpperCase()}${base.slice(1)}${pkName}`
  return `${base.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase()}_${pkName}`
}

function roundedPath(pts: Point[], radius = 8) {
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1]
    const rr = Math.min(radius, Math.hypot(b.x - a.x, b.y - a.y) / 2, Math.hypot(c.x - b.x, c.y - b.y) / 2)
    const ux = Math.sign(b.x - a.x), uy = Math.sign(b.y - a.y), vx = Math.sign(c.x - b.x), vy = Math.sign(c.y - b.y)
    d += ` L ${b.x - ux * rr} ${b.y - uy * rr} Q ${b.x} ${b.y} ${b.x + vx * rr} ${b.y + vy * rr}`
  }
  const last = pts[pts.length - 1]
  return `${d} L ${last.x} ${last.y}`
}

function relationGeometry(child: NodeBox, childRow: number, parent: NodeBox, parentRow: number) {
  const cy = child.y + BODY_TOP + childRow * ROW_H + ROW_H / 2
  const py = parent.y + BODY_TOP + parentRow * ROW_H + ROW_H / 2
  let pDir: 1 | -1 = 1, cDir: 1 | -1 = 1
  if (parent.x + parent.w + 2 * STUB <= child.x) { pDir = 1; cDir = -1 }
  else if (child.x + child.w + 2 * STUB <= parent.x) { pDir = -1; cDir = 1 }
  const px = pDir === 1 ? parent.x + parent.w : parent.x
  const cx = cDir === 1 ? child.x + child.w : child.x
  const p1 = px + pDir * STUB, c1 = cx + cDir * STUB
  const mx = pDir === cDir ? Math.max(p1, c1) + 16 : (p1 + c1) / 2
  const path = roundedPath([{ x: px, y: py }, { x: mx, y: py }, { x: mx, y: cy }, { x: cx, y: cy }])
  return { path, mid: { x: mx, y: (py + cy) / 2 }, parent: { x: px, y: py, dir: pDir }, child: { x: cx, y: cy, dir: cDir } }
}

function OneMarker({ x, y, dir, optional, color }: { x: number; y: number; dir: number; optional?: boolean; color: string }) {
  return (
    <g stroke={color} strokeWidth={1.5} fill="none">
      <line x1={x + dir * 8} y1={y - 6} x2={x + dir * 8} y2={y + 6} />
      {optional
        ? <circle cx={x + dir * 17} cy={y} r={4} fill="#fff" />
        : <line x1={x + dir * 13} y1={y - 6} x2={x + dir * 13} y2={y + 6} />}
    </g>
  )
}

function ManyMarker({ x, y, dir, color }: { x: number; y: number; dir: number; color: string }) {
  const tip = x + dir * 13
  return (
    <g stroke={color} strokeWidth={1.5} fill="none">
      <line x1={tip} y1={y} x2={x} y2={y - 6} />
      <line x1={tip} y1={y} x2={x} y2={y + 6} />
      <circle cx={x + dir * 19} cy={y} r={4} fill="#fff" />
    </g>
  )
}

interface FkTableSelectorProps {
  allProjectTables: ErdTableSummary[]
  value?: number
  onChange: (id: number | undefined) => void
}

function FkTableSelector({ allProjectTables, value, onChange }: FkTableSelectorProps) {
  const [search, setSearch] = React.useState("")
  const filtered = allProjectTables.filter(t =>
    search === "" || t.name!.toLowerCase().includes(search.toLowerCase()) || (t.moduleName || "").toLowerCase().includes(search.toLowerCase())
  )
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tables..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
      </div>
      <div className="max-h-40 overflow-auto border rounded-md">
        {filtered.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground text-center">No tables found</div>
        ) : filtered.map(t => (
          <button key={t.id} type="button"
            className={cn("w-full text-left px-3 py-1.5 text-sm hover:bg-slate-100 flex items-center gap-2", value === t.id && "bg-cyan-50 text-cyan-700")}
            onClick={() => onChange(t.id)}>
            <span className="text-xs text-muted-foreground shrink-0">{t.moduleName}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="flex-1 truncate">{t.name}</span>
            {value === t.id && <span className="text-cyan-500 text-xs">✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ErdCanvas({
  module, allProjectTables, canEdit,
  onCreateTable, onUpdateTable, onDeleteTable, onDuplicateTable,
  onCreateColumn, onUpdateColumn, onDeleteColumn, onReorderColumns, onUpdateExternalLayout,
}: ErdCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null)
  const [pan, setPan] = React.useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = React.useState(false)
  const panStartRef = React.useRef({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1)
  const [viewport, setViewport] = React.useState({ w: 800, h: 600 })

  const [localPositions, setLocalPositions] = React.useState<Record<number, Point>>({})
  const [draggingTableId, setDraggingTableId] = React.useState<number | null>(null)
  const dragStartRef = React.useRef({ tableX: 0, tableY: 0, mouseX: 0, mouseY: 0 })

  const [extLayout, setExtLayout] = React.useState<Record<number, Point>>(() => parseLayout(module.externalLayout))
  const [draggingGhostId, setDraggingGhostId] = React.useState<number | null>(null)
  const ghostDragStartRef = React.useRef({ x: 0, y: 0, mouseX: 0, mouseY: 0 })

  const [colDrag, setColDrag] = React.useState<{ tableId: number; from: number; over: number } | null>(null)
  const colDragTopRef = React.useRef(0)

  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)
  const [connectMode, setConnectMode] = React.useState(false)
  const [connect, setConnect] = React.useState<Connect | null>(null)
  const [dropTarget, setDropTarget] = React.useState<DropTarget | null>(null)
  const [selectedRelation, setSelectedRelation] = React.useState<number | null>(null)
  const [renamingTableId, setRenamingTableId] = React.useState<number | null>(null)
  const [renameValue, setRenameValue] = React.useState("")
  const [deleteTableId, setDeleteTableId] = React.useState<number | null>(null)

  const [sizes, setSizes] = React.useState<Record<string, { w: number; h: number }>>({})
  const observerRef = React.useRef<ResizeObserver | null>(null)
  const nodeEls = React.useRef(new Map<string, HTMLElement>())
  const refCallbacks = React.useRef(new Map<string, (el: HTMLDivElement | null) => void>())
  const fittedRef = React.useRef(false)

  const [createTableOpen, setCreateTableOpen] = React.useState(false)
  const [newTableName, setNewTableName] = React.useState("")
  const [addColumnTableId, setAddColumnTableId] = React.useState<number | null>(null)
  const [newColName, setNewColName] = React.useState("")
  const [newColType, setNewColType] = React.useState("string")
  const [newColNullable, setNewColNullable] = React.useState(true)
  const [newColUnique, setNewColUnique] = React.useState(false)
  const [newColIsFK, setNewColIsFK] = React.useState(false)
  const [newColRefTableId, setNewColRefTableId] = React.useState<number | undefined>()

  const [editingColumn, setEditingColumn] = React.useState<ErdColumn | null>(null)
  const [editColName, setEditColName] = React.useState("")
  const [editColType, setEditColType] = React.useState("string")
  const [editColNullable, setEditColNullable] = React.useState(true)
  const [editColUnique, setEditColUnique] = React.useState(false)
  const [editColIsFK, setEditColIsFK] = React.useState(false)
  const [editColRefTableId, setEditColRefTableId] = React.useState<number | undefined>()
  const [editColIsPK, setEditColIsPK] = React.useState(false)

  const tables = React.useMemo(() => module.tables || [], [module.tables])

  // ─── Node measurement ─────────────────────────────────────

  React.useEffect(() => {
    const ro = new ResizeObserver(entries => {
      setSizes(prev => {
        let next = prev
        for (const entry of entries) {
          const el = entry.target as HTMLElement
          const key = el.dataset.nodeKey
          if (!key) continue
          const w = el.offsetWidth, h = el.offsetHeight
          if (prev[key]?.w !== w || prev[key]?.h !== h) {
            if (next === prev) next = { ...prev }
            next[key] = { w, h }
          }
        }
        return next
      })
    })
    observerRef.current = ro
    nodeEls.current.forEach(el => ro.observe(el))
    return () => { ro.disconnect(); observerRef.current = null }
  }, [])

  React.useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewport({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const nodeRef = (key: string) => {
    let cb = refCallbacks.current.get(key)
    if (!cb) {
      cb = (el: HTMLDivElement | null) => {
        const prev = nodeEls.current.get(key)
        if (prev && prev !== el) observerRef.current?.unobserve(prev)
        if (el) { nodeEls.current.set(key, el); observerRef.current?.observe(el) }
        else nodeEls.current.delete(key)
      }
      refCallbacks.current.set(key, cb)
    }
    return cb
  }

  const getTablePos = (table: ErdTable): Point => localPositions[table.id] || { x: table.positionX || 0, y: table.positionY || 0 }
  const tableBox = (table: ErdTable): NodeBox => {
    const p = getTablePos(table), s = sizes[`t-${table.id}`]
    return { x: p.x, y: p.y, w: s?.w ?? 240, h: s?.h ?? BODY_TOP + ((table.columns?.length || 0) + (canEdit ? 1 : 0)) * ROW_H }
  }

  // ─── External (ghost) tables ──────────────────────────────

  const ghosts = React.useMemo(() => {
    const list: Ghost[] = []
    tables.forEach(table => sortColumns(table.columns).forEach(col => {
      const refId = col.referencedTableId
      if (!col.isForeignKey || !refId || tables.some(t => t.id === refId) || list.some(g => g.refId === refId)) return
      const summary = allProjectTables.find(t => t.id === refId)
      list.push({
        refId, name: col.referencedTableName || summary?.name || "External",
        moduleName: summary?.moduleName || "", columnName: col.referencedColumnName || "id", parentTableId: table.id,
      })
    }))
    return list
  }, [tables, allProjectTables])

  const ghostPositions = React.useMemo(() => {
    const res: Record<number, Point> = {}
    const occupied = tables.map(tableBox)
    const gw = 200, gh = BODY_TOP + ROW_H, gap = 30
    const overlaps = (x: number, y: number) => occupied.some(b => x < b.x + b.w + gap && x + gw + gap > b.x && y < b.y + b.h + gap && y + gh + gap > b.y)
    ghosts.forEach(g => { if (extLayout[g.refId]) { res[g.refId] = extLayout[g.refId]; occupied.push({ ...extLayout[g.refId], w: gw, h: gh }) } })
    ghosts.forEach(g => {
      if (res[g.refId]) return
      const parent = tables.find(t => t.id === g.parentTableId)
      if (!parent) return
      const box = tableBox(parent)
      let spot: Point | null = null
      for (let k = 0; k < 12 && !spot; k++) {
        const dy = k * (gh + gap)
        const candidates = [
          { x: box.x - gw - 120, y: box.y + dy },
          { x: box.x + box.w + 120, y: box.y + dy },
          { x: box.x, y: box.y + box.h + 60 + dy },
          { x: box.x, y: box.y - gh - 60 - dy },
        ]
        spot = candidates.find(c => !overlaps(c.x, c.y)) || null
      }
      const p = spot || { x: box.x - gw - 120, y: box.y }
      res[g.refId] = p
      occupied.push({ ...p, w: gw, h: gh })
    })
    return res
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghosts, extLayout, tables, localPositions, sizes])

  const ghostBox = (refId: number): NodeBox | null => {
    const p = ghostPositions[refId]
    if (!p) return null
    const s = sizes[`g-${refId}`]
    return { x: p.x, y: p.y, w: s?.w ?? 180, h: s?.h ?? BODY_TOP + ROW_H }
  }

  const boxOf = (key: string): NodeBox | null => {
    const id = Number(key.slice(2))
    if (key.startsWith("t-")) { const t = tables.find(x => x.id === id); return t ? tableBox(t) : null }
    return ghostBox(id)
  }

  // ─── Relations ────────────────────────────────────────────

  const relations = React.useMemo(() => {
    const list: Relation[] = []
    tables.forEach(table => sortColumns(table.columns).forEach((col, i) => {
      if (!col.isForeignKey || !col.referencedTableId) return
      const refColName = col.referencedColumnName || "id"
      const internal = tables.find(t => t.id === col.referencedTableId)
      let parentKey: string, parentRow = 0
      if (internal) {
        const pc = sortColumns(internal.columns)
        const idx = pc.findIndex(c => c.name === refColName)
        parentRow = idx >= 0 ? idx : Math.max(0, pc.findIndex(c => c.isPrimaryKey))
        parentKey = `t-${internal.id}`
      } else if (ghosts.some(g => g.refId === col.referencedTableId)) {
        parentKey = `g-${col.referencedTableId}`
      } else return
      list.push({
        key: `r-${col.id}`, columnId: col.id, childKey: `t-${table.id}`, parentKey, childRow: i, parentRow,
        nullable: !!col.isNullable, unique: !!col.isUnique, external: !internal,
        label: `${col.referencedTableName || ""}.${refColName}  (1) ──< (N)  ${table.name}.${col.name}`,
      })
    }))
    return list
  }, [tables, ghosts])

  // ─── View ─────────────────────────────────────────────────

  const allBoxes = () => [
    ...tables.map(tableBox),
    ...ghosts.map(g => ghostBox(g.refId)).filter((b): b is NodeBox => !!b),
  ]

  const fitView = () => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const boxes = allBoxes()
    if (!rect || boxes.length === 0) { setZoom(1); setPan({ x: 0, y: 0 }); return }
    const minX = Math.min(...boxes.map(b => b.x)), minY = Math.min(...boxes.map(b => b.y))
    const maxX = Math.max(...boxes.map(b => b.x + b.w)), maxY = Math.max(...boxes.map(b => b.y + b.h))
    const pad = 60
    const z = Math.max(0.3, Math.min(1, (rect.width - pad * 2) / (maxX - minX || 1), (rect.height - pad * 2) / (maxY - minY || 1)))
    setZoom(z)
    setPan({ x: (rect.width - (maxX - minX) * z) / 2 - minX * z, y: (rect.height - (maxY - minY) * z) / 2 - minY * z })
  }

  React.useEffect(() => {
    if (fittedRef.current) return
    if (tables.length === 0) { fittedRef.current = true; return }
    if (tables.every(t => sizes[`t-${t.id}`])) { fittedRef.current = true; fitView() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes, tables])

  const zoomBy = (delta: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    const newZoom = Math.max(0.3, Math.min(2, zoom + delta))
    if (rect) {
      const mx = rect.width / 2, my = rect.height / 2
      setPan({ x: mx - ((mx - pan.x) / zoom) * newZoom, y: my - ((my - pan.y) / zoom) * newZoom })
    }
    setZoom(newZoom)
  }

  const viewportCenter = (): Point => {
    const r = canvasRef.current?.getBoundingClientRect()
    if (!r) return { x: 100, y: 100 }
    return { x: Math.round((r.width / 2 - pan.x) / zoom - 120), y: Math.round((r.height / 2 - pan.y) / zoom - 60) }
  }

  // ─── Relationship tool ────────────────────────────────────

  const toWorld = (clientX: number, clientY: number): Point => {
    const rect = canvasRef.current?.getBoundingClientRect()
    return { x: (clientX - (rect?.left || 0) - pan.x) / zoom, y: (clientY - (rect?.top || 0) - pan.y) / zoom }
  }

  const parentInfo = (key: string) => {
    const id = Number(key.slice(2))
    if (key.startsWith("t-")) {
      const t = tables.find(x => x.id === id)
      if (!t) return null
      const cols = sortColumns(t.columns)
      const row = Math.max(0, cols.findIndex(c => c.isPrimaryKey))
      return { id, name: t.name, pkName: cols[row]?.name || "id", pkType: cols[row]?.dataType || "long", row }
    }
    const g = ghosts.find(x => x.refId === id)
    if (!g) return null
    const existing = tables.flatMap(t => t.columns || []).find(c => c.referencedTableId === id)
    return { id, name: g.name, pkName: g.columnName, pkType: existing?.dataType || "long", row: 0 }
  }

  const cancelConnect = () => { setConnect(null); setDropTarget(null) }

  const startConnect = (key: string, e: React.MouseEvent, sticky: boolean) => {
    setSelectedRelation(null)
    setConnect({ fromKey: key, mouse: toWorld(e.clientX, e.clientY), startClient: { x: e.clientX, y: e.clientY }, sticky })
    setDropTarget(null)
  }

  const finishConnect = (target: DropTarget) => {
    const from = connect
    cancelConnect()
    if (!from || !canEdit) return
    const parent = parentInfo(from.fromKey)
    const child = tables.find(t => t.id === target.tableId)
    if (!parent || !child) return
    const self = from.fromKey === `t-${child.id}`
    const col = target.columnId ? child.columns?.find(c => c.id === target.columnId) : undefined
    if (col && !col.isPrimaryKey) {
      if (col.isForeignKey && col.referencedTableId === parent.id) return
      onUpdateColumn(col.id, { isForeignKey: true, referencedTableId: parent.id, referencedColumnName: parent.pkName, dataType: parent.pkType })
      return
    }
    const base = fkColumnName(self ? "parent" : parent.name, parent.pkName)
    const taken = new Set((child.columns || []).map(c => c.name.toLowerCase()))
    let name = base
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${base}_${n}`
    onCreateColumn(child.id, {
      name, dataType: parent.pkType, isNullable: self, isUnique: false, isPrimaryKey: false,
      isForeignKey: true, referencedTableId: parent.id, referencedColumnName: parent.pkName,
    })
  }

  const handleConnectHandleMouseDown = (e: React.MouseEvent, key: string) => {
    if (e.button !== 0) return
    e.stopPropagation(); e.preventDefault()
    startConnect(key, e, false)
  }

  const targetFromEvent = (e: React.MouseEvent, tableId: number): DropTarget => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-col-id]")
    return { tableId, columnId: row ? Number(row.dataset.colId) : undefined }
  }

  const handleNodeMouseMove = (e: React.MouseEvent, tableId: number) => {
    if (!connect) return
    const t = targetFromEvent(e, tableId)
    if (dropTarget?.tableId !== t.tableId || dropTarget?.columnId !== t.columnId) setDropTarget(t)
  }

  const findColumn = (columnId: number) => tables.flatMap(t => t.columns || []).find(c => c.id === columnId)

  const removeRelation = (columnId: number) => {
    onUpdateColumn(columnId, { isForeignKey: false })
    setSelectedRelation(null)
  }

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return
      if (e.key === "Escape") { setConnect(null); setDropTarget(null); setConnectMode(false); setSelectedRelation(null) }
      if (e.key === "Delete" && selectedRelation !== null && canEdit) removeRelation(selectedRelation)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  // ─── Pan / Drag ───────────────────────────────────────────

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    setSelectedRelation(null)
    if (connect) { cancelConnect(); return }
    if (e.button === 0 || e.button === 1) {
      setIsPanning(true); panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; e.preventDefault()
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (connect) setConnect({ ...connect, mouse: toWorld(e.clientX, e.clientY) })
    if (isPanning) setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y })
    if (draggingTableId !== null) {
      const dx = (e.clientX - dragStartRef.current.mouseX) / zoom
      const dy = (e.clientY - dragStartRef.current.mouseY) / zoom
      setLocalPositions(prev => ({ ...prev, [draggingTableId]: { x: Math.round(dragStartRef.current.tableX + dx), y: Math.round(dragStartRef.current.tableY + dy) } }))
    }
    if (draggingGhostId !== null) {
      const dx = (e.clientX - ghostDragStartRef.current.mouseX) / zoom
      const dy = (e.clientY - ghostDragStartRef.current.mouseY) / zoom
      setExtLayout(prev => ({ ...prev, [draggingGhostId]: { x: Math.round(ghostDragStartRef.current.x + dx), y: Math.round(ghostDragStartRef.current.y + dy) } }))
    }
    if (colDrag) {
      const table = tables.find(t => t.id === colDrag.tableId)
      const count = table?.columns?.length || 0
      const over = Math.max(0, Math.min(count, Math.round((e.clientY - colDragTopRef.current) / (ROW_H * zoom))))
      if (over !== colDrag.over) setColDrag({ ...colDrag, over })
    }
  }

  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (connect && !connect.sticky) {
      const moved = Math.hypot(e.clientX - connect.startClient.x, e.clientY - connect.startClient.y) > 4
      if (dropTarget && moved) finishConnect(dropTarget)
      else if (!moved) setConnect({ ...connect, sticky: true })
      else cancelConnect()
    }
    if (draggingTableId !== null) {
      const pos = localPositions[draggingTableId]
      const moved = pos && (pos.x !== dragStartRef.current.tableX || pos.y !== dragStartRef.current.tableY)
      if (moved && canEdit) onUpdateTable(draggingTableId, { positionX: pos.x, positionY: pos.y })
      setDraggingTableId(null)
    }
    if (draggingGhostId !== null) {
      const start = ghostDragStartRef.current, pos = ghostPositions[draggingGhostId]
      const full: Record<number, Point> = {}
      ghosts.forEach(g => { if (ghostPositions[g.refId]) full[g.refId] = ghostPositions[g.refId] })
      setExtLayout(full)
      if (canEdit && pos && (pos.x !== start.x || pos.y !== start.y)) onUpdateExternalLayout(JSON.stringify(full))
      setDraggingGhostId(null)
    }
    if (colDrag) {
      const table = tables.find(t => t.id === colDrag.tableId)
      const { from, over } = colDrag
      if (table && over !== from && over !== from + 1) {
        const ids = sortColumns(table.columns).map(c => c.id)
        const [moved] = ids.splice(from, 1)
        ids.splice(over > from ? over - 1 : over, 0, moved)
        onReorderColumns(table.id, ids)
      }
      setColDrag(null)
    }
    setIsPanning(false)
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.05 : 0.05
    const newZoom = Math.max(0.3, Math.min(2, zoom + delta))
    if (newZoom === zoom) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      const mx = e.clientX - rect.left, my = e.clientY - rect.top
      const wx = (mx - pan.x) / zoom, wy = (my - pan.y) / zoom
      setPan({ x: mx - wx * newZoom, y: my - wy * newZoom })
    }
    setZoom(newZoom)
  }

  const handleTableMouseDown = (e: React.MouseEvent, table: ErdTable) => {
    if (e.button !== 0 || e.ctrlKey) return
    e.stopPropagation(); e.preventDefault()
    setSelectedRelation(null)
    if (connect) { finishConnect(targetFromEvent(e, table.id)); return }
    if (connectMode && canEdit) { startConnect(`t-${table.id}`, e, true); return }
    const pos = getTablePos(table)
    setDraggingTableId(table.id)
    dragStartRef.current = { tableX: pos.x, tableY: pos.y, mouseX: e.clientX, mouseY: e.clientY }
    setLocalPositions(prev => ({ ...prev, [table.id]: pos }))
  }

  const handleGhostMouseDown = (e: React.MouseEvent, refId: number) => {
    if (e.button !== 0 || e.ctrlKey) return
    e.stopPropagation(); e.preventDefault()
    if (connect) { cancelConnect(); return }
    if (connectMode && canEdit) { startConnect(`g-${refId}`, e, true); return }
    const pos = ghostPositions[refId]
    if (!pos) return
    setDraggingGhostId(refId)
    ghostDragStartRef.current = { x: pos.x, y: pos.y, mouseX: e.clientX, mouseY: e.clientY }
  }

  const handleColumnGripMouseDown = (e: React.MouseEvent, tableId: number, index: number) => {
    if (e.button !== 0) return
    e.stopPropagation(); e.preventDefault()
    const el = nodeEls.current.get(`t-${tableId}`)
    if (!el) return
    colDragTopRef.current = el.getBoundingClientRect().top + BODY_TOP * zoom
    setColDrag({ tableId, from: index, over: index })
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  // ─── Table handlers ───────────────────────────────────────

  const startRename = (table: ErdTable) => { if (!canEdit) return; setRenamingTableId(table.id); setRenameValue(table.name) }
  const commitRename = () => {
    if (renamingTableId === null) return
    const table = tables.find(t => t.id === renamingTableId)
    const name = renameValue.trim()
    if (table && name && name !== table.name) onUpdateTable(table.id, { name })
    setRenamingTableId(null)
  }

  const handleCreateTable = () => {
    const name = newTableName.trim()
    if (!name) return
    const c = viewportCenter()
    onCreateTable(name, c.x, c.y)
    setCreateTableOpen(false)
  }

  // ─── Column handlers ──────────────────────────────────────

  const handleAddColumn = () => {
    if (!addColumnTableId || !newColName.trim()) return
    const col: Partial<ErdColumn> = { name: newColName.trim(), dataType: newColType, isNullable: newColNullable, isUnique: newColUnique, isForeignKey: newColIsFK, isPrimaryKey: false }
    if (newColIsFK && newColRefTableId) { col.referencedTableId = newColRefTableId; col.referencedColumnName = "id" }
    onCreateColumn(addColumnTableId, col)
    setNewColName(""); setNewColType("string"); setNewColNullable(true); setNewColUnique(false); setNewColIsFK(false); setNewColRefTableId(undefined); setAddColumnTableId(null)
  }

  const openEditColumn = (col: ErdColumn) => {
    if (!canEdit) return
    setEditingColumn(col); setEditColName(col.name); setEditColType(col.dataType)
    setEditColNullable(col.isNullable ?? true); setEditColUnique(col.isUnique ?? false); setEditColIsFK(col.isForeignKey ?? false)
    setEditColRefTableId(col.referencedTableId ?? undefined); setEditColIsPK(col.isPrimaryKey ?? false)
  }
  const handleSaveEditColumn = () => {
    if (!editingColumn || !editColName.trim()) return
    const updates: Partial<ErdColumn> = { name: editColName.trim(), dataType: editColType, isNullable: editColNullable, isUnique: editColUnique, isForeignKey: editColIsFK && !!editColRefTableId, isPrimaryKey: editColIsPK }
    if (editColIsFK && editColRefTableId) { updates.referencedTableId = editColRefTableId; updates.referencedColumnName = "id" }
    onUpdateColumn(editingColumn.id, updates); setEditingColumn(null)
  }

  // ─── Render ───────────────────────────────────────────────

  const deleteTarget = tables.find(t => t.id === deleteTableId)
  const minimapBoxes = [
    ...tables.map(t => ({ ...tableBox(t), color: t.color || "#1e5f8a" })),
    ...ghosts.map(g => ghostBox(g.refId)).filter((b): b is NodeBox => !!b).map(b => ({ ...b, color: "#cbd5e1" })),
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
        <span className="text-sm font-medium text-muted-foreground">{module.name}</span>
        {!canEdit && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">View Only</span>}
        <div className="flex-1" />
        <div className="flex items-center gap-1 border rounded-md px-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomBy(-0.1)}><Minus className="h-3.5 w-3.5" /></Button>
          <span className="text-xs text-muted-foreground min-w-[40px] text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => zoomBy(0.1)}><Plus className="h-3.5 w-3.5" /></Button>
        </div>
        <Button variant="outline" size="sm" className="gap-1" onClick={fitView}><Maximize2 className="h-3.5 w-3.5" />Fit</Button>
        {canEdit && (
          <Button variant={connectMode ? "default" : "outline"} size="sm" title="Draw a relationship: parent table → child table (Esc to exit)"
            className={cn("gap-1", connectMode && "bg-cyan-600 hover:bg-cyan-700")}
            onClick={() => { setConnectMode(m => !m); cancelConnect() }}>
            <Cable className="h-3.5 w-3.5" />Relationship
          </Button>
        )}
        {canEdit && (
          <Button size="sm" className="gap-1 bg-cyan-500 hover:bg-cyan-600" onClick={() => { setNewTableName(""); setCreateTableOpen(true) }}>
            <Plus className="h-4 w-4" />Add Table
          </Button>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <div ref={canvasRef} className={cn("absolute inset-0 bg-[#f8fafc]", isPanning ? "cursor-grabbing" : "cursor-grab", colDrag && "cursor-ns-resize", (connectMode || connect) && "cursor-crosshair")}
          onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp} onWheel={handleWheel}
          style={{ backgroundImage: "radial-gradient(circle, #ddd 1px, transparent 1px)", backgroundSize: `${20 * zoom}px ${20 * zoom}px`, backgroundPosition: `${pan.x}px ${pan.y}px` }}>
          <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}>

            <svg className="absolute inset-0 pointer-events-none" style={{ width: 1, height: 1, overflow: "visible" }}>
              {relations.map(r => {
                const child = boxOf(r.childKey), parent = boxOf(r.parentKey)
                if (!child || !parent) return null
                const g = relationGeometry(child, r.childRow, parent, r.parentRow)
                const selected = selectedRelation === r.columnId
                const active = selected || (hoveredKey !== null && (hoveredKey === r.childKey || hoveredKey === r.parentKey))
                const faded = hoveredKey !== null && !active
                const color = active ? "#0891b2" : r.external ? "#94a3b8" : "#475569"
                return (
                  <g key={r.key} opacity={faded ? 0.25 : 1}>
                    <title>{r.label}</title>
                    <path d={g.path} fill="none" stroke={color} strokeWidth={selected ? 2.75 : active ? 2.25 : 1.5} strokeDasharray={r.external ? "6 4" : undefined} />
                    {canEdit && !connect && (
                      <path d={g.path} fill="none" stroke="transparent" strokeWidth={12} style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onMouseDown={e => e.stopPropagation()} onClick={() => setSelectedRelation(r.columnId)} />
                    )}
                    <OneMarker x={g.parent.x} y={g.parent.y} dir={g.parent.dir} optional={r.nullable} color={color} />
                    {r.unique
                      ? <OneMarker x={g.child.x} y={g.child.y} dir={g.child.dir} optional color={color} />
                      : <ManyMarker x={g.child.x} y={g.child.y} dir={g.child.dir} color={color} />}
                  </g>
                )
              })}
              {connect && (() => {
                const from = boxOf(connect.fromKey), info = parentInfo(connect.fromKey)
                if (!from || !info) return null
                const y = from.y + BODY_TOP + info.row * ROW_H + ROW_H / 2
                const x = connect.mouse.x >= from.x + from.w / 2 ? from.x + from.w : from.x
                return (
                  <g stroke="#0891b2" strokeWidth={2} fill="none">
                    <path d={`M ${x} ${y} L ${connect.mouse.x} ${connect.mouse.y}`} strokeDasharray="6 4" />
                    <circle cx={x} cy={y} r={4} fill="#0891b2" />
                    <circle cx={connect.mouse.x} cy={connect.mouse.y} r={4} fill="#fff" />
                  </g>
                )
              })()}
            </svg>

            {/* Tables */}
            {tables.map(table => {
              const pos = getTablePos(table)
              const columns = sortColumns(table.columns)
              const key = `t-${table.id}`
              const isRenaming = renamingTableId === table.id
              const isDropTable = connect !== null && dropTarget?.tableId === table.id
              const pkRow = Math.max(0, columns.findIndex(c => c.isPrimaryKey))
              const showHandles = canEdit && !connect && !colDrag && draggingTableId === null && (hoveredKey === key || connectMode)
              return (
                <div key={table.id} ref={nodeRef(key)} data-node-key={key} data-erd-table
                  className={cn("absolute select-none w-max min-w-[220px] max-w-[560px] bg-white border rounded-lg shadow-md transition-shadow",
                    isDropTable ? "ring-2 ring-cyan-500 shadow-lg" : hoveredKey === key ? "shadow-lg ring-2 ring-cyan-400/50" : "hover:shadow-lg", draggingTableId === table.id && "shadow-xl")}
                  style={{ left: pos.x, top: pos.y, zIndex: draggingTableId === table.id || colDrag?.tableId === table.id ? 5 : 1 }}
                  onMouseEnter={() => setHoveredKey(key)} onMouseMove={e => handleNodeMouseMove(e, table.id)}
                  onMouseLeave={() => { setHoveredKey(k => k === key ? null : k); if (connect) setDropTarget(null) }}
                  onMouseDown={e => handleTableMouseDown(e, table)}>
                  {showHandles && [-1, 1].map(side => (
                    <span key={side} title="Drag to a child table to create a relationship"
                      className="absolute z-10 h-3 w-3 rounded-full bg-white border-2 border-cyan-500 cursor-crosshair hover:scale-125 transition-transform"
                      style={{ top: BODY_TOP + pkRow * ROW_H + ROW_H / 2 - 6, ...(side === -1 ? { left: -7 } : { right: -7 }) }}
                      onMouseDown={e => handleConnectHandleMouseDown(e, key)} />
                  ))}
                  <div className="flex items-center gap-2 px-3 rounded-t-[7px] cursor-move text-white text-sm font-medium"
                    style={{ backgroundColor: table.color || "#1e5f8a", height: HEADER_H }}
                    onDoubleClick={() => startRename(table)} title={canEdit ? `${table.name} — double-click to rename` : table.name}>
                    {isRenaming ? (
                      <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onMouseDown={stop} onDoubleClick={stop} onBlur={commitRename}
                        onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenamingTableId(null) }}
                        className="flex-1 min-w-0 bg-white/95 text-slate-900 rounded px-1.5 py-0.5 text-sm outline-none ring-2 ring-white/60" />
                    ) : (
                      <span className="flex-1 min-w-0 truncate">{table.name}</span>
                    )}
                    {canEdit && !isRenaming && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-white/80 hover:text-white hover:bg-white/20" onMouseDown={stop} onClick={stop}>
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" onMouseDown={stop} onWheel={stop}>
                          <DropdownMenuItem onClick={() => setAddColumnTableId(table.id)}><Plus className="h-4 w-4 mr-2" />Add Column</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => startRename(table)}><Type className="h-4 w-4 mr-2" />Rename</DropdownMenuItem>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><Palette className="h-4 w-4 mr-2" />Color</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent onMouseDown={stop} onWheel={stop}>
                              <div className="grid grid-cols-4 gap-1.5 p-1.5">
                                {TABLE_COLORS.map(c => (
                                  <button key={c} type="button" className={cn("h-6 w-6 rounded border-2", (table.color || "#1e5f8a") === c ? "border-slate-900" : "border-transparent")}
                                    style={{ backgroundColor: c }} onClick={() => onUpdateTable(table.id, { color: c })} />
                                ))}
                              </div>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                          <DropdownMenuItem onClick={() => { const b = tableBox(table); onDuplicateTable(table, b.x + b.w + 60, b.y) }}><Copy className="h-4 w-4 mr-2" />Duplicate</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setDeleteTableId(table.id)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete Table</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="relative">
                    {columns.map((col, index) => {
                      const refTitle = col.isForeignKey && col.referencedTableName ? `  →  ${col.referencedTableName}.${col.referencedColumnName || "id"}` : ""
                      const isDragged = colDrag?.tableId === table.id && colDrag.from === index
                      const isDropRow = isDropTable && dropTarget?.columnId === col.id && !col.isPrimaryKey
                      return (
                        <div key={col.id} data-col-id={col.id} className={cn("flex items-center gap-1.5 pl-1 pr-2 text-xs border-t first:border-t-0 group",
                          isDragged ? "bg-cyan-50 opacity-60" : isDropRow ? "bg-cyan-100" : "hover:bg-slate-50")}
                          style={{ height: ROW_H }} title={`${col.name} : ${col.dataType}${col.isNullable ? " (nullable)" : ""}${refTitle}`}
                          onDoubleClick={() => openEditColumn(col)}>
                          {canEdit ? (
                            <span title="Drag to reorder" className="h-5 w-4 shrink-0 flex items-center justify-center cursor-ns-resize text-slate-300 opacity-0 group-hover:opacity-100 hover:text-slate-500"
                              onMouseDown={e => handleColumnGripMouseDown(e, table.id, index)}>
                              <GripVertical className="h-3.5 w-3.5" />
                            </span>
                          ) : <span className="w-1 shrink-0" />}
                          <span className={cn("w-6 shrink-0 text-[10px] font-bold", col.isPrimaryKey ? "text-amber-600" : "text-blue-600")}>
                            {col.isPrimaryKey ? "PK" : col.isForeignKey ? "FK" : ""}
                          </span>
                          <span className={cn("flex-1 min-w-0 truncate whitespace-nowrap", col.isPrimaryKey && "font-semibold underline underline-offset-2")}>{col.name}</span>
                          <span className="ml-3 text-muted-foreground shrink-0">{col.dataType}{col.isNullable ? "?" : ""}</span>
                          {canEdit && (
                            <span className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="h-5 w-5" onMouseDown={stop} onClick={() => openEditColumn(col)}><Pencil className="h-3 w-3 text-muted-foreground" /></Button>
                              <Button variant="ghost" size="icon" className="h-5 w-5" disabled={!!col.isPrimaryKey} onMouseDown={stop} onClick={() => onDeleteColumn(col.id, table.id)}><Trash2 className="h-3 w-3 text-muted-foreground" /></Button>
                            </span>
                          )}
                        </div>
                      )
                    })}
                    {colDrag?.tableId === table.id && colDrag.over !== colDrag.from && colDrag.over !== colDrag.from + 1 && (
                      <div className="absolute left-0 right-0 h-0.5 bg-cyan-500 pointer-events-none" style={{ top: colDrag.over * ROW_H - 1 }} />
                    )}
                  </div>
                  {canEdit && (
                    <button className="w-full text-left px-3 text-xs text-cyan-600 hover:bg-cyan-50 rounded-b-[7px] flex items-center gap-1 border-t"
                      style={{ height: ROW_H }} onMouseDown={stop} onClick={() => setAddColumnTableId(table.id)}>
                      <Plus className="h-3 w-3" />Add column
                    </button>
                  )}
                </div>
              )
            })}

            {/* External tables */}
            {ghosts.map(ghost => {
              const pos = ghostPositions[ghost.refId]
              if (!pos) return null
              const key = `g-${ghost.refId}`
              return (
                <div key={key} ref={nodeRef(key)} data-node-key={key}
                  className={cn("absolute select-none w-max min-w-[180px] max-w-[420px] bg-white border border-dashed border-slate-400 rounded-lg shadow-sm",
                    hoveredKey === key && "ring-2 ring-cyan-400/50")}
                  style={{ left: pos.x, top: pos.y, zIndex: draggingGhostId === ghost.refId ? 5 : 1 }}
                  onMouseEnter={() => setHoveredKey(key)} onMouseLeave={() => setHoveredKey(k => k === key ? null : k)}
                  onMouseDown={e => handleGhostMouseDown(e, ghost.refId)}
                  title={`${ghost.name}${ghost.moduleName ? ` (module: ${ghost.moduleName})` : ""}`}>
                  {canEdit && !connect && draggingGhostId === null && (hoveredKey === key || connectMode) && [-1, 1].map(side => (
                    <span key={side} title="Drag to a child table to create a relationship"
                      className="absolute z-10 h-3 w-3 rounded-full bg-white border-2 border-cyan-500 cursor-crosshair hover:scale-125 transition-transform"
                      style={{ top: BODY_TOP + ROW_H / 2 - 6, ...(side === -1 ? { left: -7 } : { right: -7 }) }}
                      onMouseDown={e => handleConnectHandleMouseDown(e, key)} />
                  ))}
                  <div className={cn("bg-slate-100 px-3 rounded-t-[7px] text-xs font-medium text-slate-600 flex items-center gap-1.5 cursor-move")}
                    style={{ height: HEADER_H }}>
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{ghost.name}</span>
                    {ghost.moduleName && <span className="text-[10px] text-slate-500 bg-white border rounded px-1.5 py-0.5 shrink-0">{ghost.moduleName}</span>}
                  </div>
                  <div className="flex items-center gap-1.5 pl-2 pr-2 text-xs text-slate-500 border-t border-dashed border-slate-300" style={{ height: ROW_H }}>
                    <span className="w-6 shrink-0 text-[10px] font-bold text-amber-600">PK</span>
                    <span className="font-semibold underline underline-offset-2">{ghost.columnName}</span>
                  </div>
                </div>
              )
            })}

            {selectedRelation !== null && canEdit && (() => {
              const rel = relations.find(x => x.columnId === selectedRelation)
              const child = rel && boxOf(rel.childKey), parent = rel && boxOf(rel.parentKey)
              if (!rel || !child || !parent) return null
              const { mid } = relationGeometry(child, rel.childRow, parent, rel.parentRow)
              const col = findColumn(rel.columnId)
              return (
                <div className="absolute z-20 flex items-center gap-0.5 bg-white border rounded-md shadow-lg p-0.5 -translate-x-1/2 -translate-y-1/2"
                  style={{ left: mid.x, top: mid.y }} onMouseDown={stop}>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => { if (col) openEditColumn(col); setSelectedRelation(null) }}>
                    <Pencil className="h-3 w-3" />Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive hover:text-destructive" onClick={() => removeRelation(rel.columnId)}>
                    <Unlink className="h-3 w-3" />Remove
                  </Button>
                </div>
              )
            })()}
          </div>

          {(connectMode || connect) && canEdit && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-cyan-600 text-white text-xs rounded-md shadow px-3 py-1.5 pointer-events-none">
              {connect
                ? "Now click the child table — or one of its columns to turn it into the FK"
                : "Click the parent table, then the child table. The FK column is added automatically · Esc to exit"}
            </div>
          )}

          {tables.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-sm text-muted-foreground">{canEdit ? "No tables yet — click “Add Table” to start" : "This module has no tables"}</div>
            </div>
          )}

          <Minimap boxes={minimapBoxes} pan={pan} zoom={zoom} viewport={viewport} onNavigate={setPan} />
        </div>
      </div>

      {/* Dialogs — only if canEdit */}
      {canEdit && <>
        <Dialog open={createTableOpen} onOpenChange={setCreateTableOpen}><DialogContent>
          <DialogHeader><DialogTitle>Add Table</DialogTitle></DialogHeader>
          <div className="py-4"><Input placeholder="Table name..." value={newTableName} onChange={e => setNewTableName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleCreateTable()} autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setCreateTableOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTable} disabled={!newTableName.trim()}>Create</Button></DialogFooter>
        </DialogContent></Dialog>

        <Dialog open={deleteTableId !== null} onOpenChange={o => !o && setDeleteTableId(null)}><DialogContent>
          <DialogHeader><DialogTitle>Delete Table</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Delete <span className="font-medium text-foreground">{deleteTarget?.name}</span>? Foreign keys that reference it will be removed.
          </p>
          <DialogFooter><Button variant="outline" onClick={() => setDeleteTableId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteTableId !== null) onDeleteTable(deleteTableId); setDeleteTableId(null) }}>Delete</Button></DialogFooter>
        </DialogContent></Dialog>

        <Dialog open={addColumnTableId !== null} onOpenChange={() => setAddColumnTableId(null)}><DialogContent>
          <DialogHeader><DialogTitle>Add Column</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Column Name</label>
              <Input placeholder="column_name" value={newColName} onChange={e => setNewColName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddColumn()} autoFocus /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Data Type</label>
              <select className="w-full border rounded-md px-3 py-1.5 text-sm" value={newColType} onChange={e => setNewColType(e.target.value)}>
                {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newColNullable} onChange={e => setNewColNullable(e.target.checked)} className="rounded" />Nullable</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newColUnique} onChange={e => setNewColUnique(e.target.checked)} className="rounded" />Unique</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newColIsFK} onChange={e => setNewColIsFK(e.target.checked)} className="rounded" />Foreign Key</label>
            </div>
            {newColIsFK && <div className="space-y-2"><label className="text-sm font-medium">References Table (parent)</label>
              <FkTableSelector allProjectTables={allProjectTables} value={newColRefTableId} onChange={setNewColRefTableId} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setAddColumnTableId(null)}>Cancel</Button>
            <Button onClick={handleAddColumn} disabled={!newColName.trim() || (newColIsFK && !newColRefTableId)}>Add</Button></DialogFooter>
        </DialogContent></Dialog>

        <Dialog open={editingColumn !== null} onOpenChange={() => setEditingColumn(null)}><DialogContent>
          <DialogHeader><DialogTitle>Edit Column</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Column Name</label>
              <Input value={editColName} onChange={e => setEditColName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveEditColumn()} autoFocus /></div>
            <div className="space-y-2"><label className="text-sm font-medium">Data Type</label>
              <select className="w-full border rounded-md px-3 py-1.5 text-sm" value={editColType} onChange={e => setEditColType(e.target.value)}>
                {DATA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editColIsPK} onChange={e => setEditColIsPK(e.target.checked)} className="rounded" />Primary Key</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editColNullable} onChange={e => setEditColNullable(e.target.checked)} className="rounded" />Nullable</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editColUnique} onChange={e => setEditColUnique(e.target.checked)} className="rounded" />Unique</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editColIsFK} onChange={e => setEditColIsFK(e.target.checked)} className="rounded" />Foreign Key</label>
            </div>
            {editColIsFK && <div className="space-y-2"><label className="text-sm font-medium">References Table (parent)</label>
              <FkTableSelector allProjectTables={allProjectTables} value={editColRefTableId} onChange={setEditColRefTableId} /></div>}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setEditingColumn(null)}>Cancel</Button>
            <Button onClick={handleSaveEditColumn} disabled={!editColName.trim()}>Save</Button></DialogFooter>
        </DialogContent></Dialog>
      </>}
    </div>
  )
}

// ─── Minimap ────────────────────────────────────────────────

function Minimap({ boxes, pan, zoom, viewport, onNavigate }: {
  boxes: (NodeBox & { color: string })[]
  pan: Point; zoom: number
  viewport: { w: number; h: number }
  onNavigate: (pan: Point) => void
}) {
  const W = 180, H = 120
  if (boxes.length === 0) return null

  const minX = Math.min(...boxes.map(p => p.x)) - 50, minY = Math.min(...boxes.map(p => p.y)) - 50
  const maxX = Math.max(...boxes.map(p => p.x + p.w)) + 50, maxY = Math.max(...boxes.map(p => p.y + p.h)) + 50
  const wW = maxX - minX || 1, wH = maxY - minY || 1
  const s = Math.min(W / wW, H / wH)

  const vpW = viewport.w / zoom, vpH = viewport.h / zoom
  const vpX = -pan.x / zoom, vpY = -pan.y / zoom

  const handleClick = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    const wx = (e.clientX - r.left) / s + minX, wy = (e.clientY - r.top) / s + minY
    onNavigate({ x: -(wx - vpW / 2) * zoom, y: -(wy - vpH / 2) * zoom })
  }

  return (
    <div className="absolute bottom-4 right-4 bg-white/95 border rounded-lg shadow-lg overflow-hidden cursor-crosshair backdrop-blur-sm z-10"
      style={{ width: W, height: H }} onMouseDown={e => e.stopPropagation()} onClick={handleClick}>
      <svg width={W} height={H}>
        <rect width={W} height={H} fill="#f8fafc" />
        {boxes.map((p, i) => <rect key={i} x={(p.x - minX) * s} y={(p.y - minY) * s} width={Math.max(p.w * s, 2)} height={Math.max(p.h * s, 2)} fill={p.color} opacity={0.7} rx={1} />)}
        <rect x={(vpX - minX) * s} y={(vpY - minY) * s} width={vpW * s} height={vpH * s} fill="rgba(8,145,178,0.08)" stroke="#0891b2" strokeWidth={1.5} rx={1} />
      </svg>
    </div>
  )
}
