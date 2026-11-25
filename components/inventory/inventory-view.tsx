"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle, ArrowDownUp, ArrowLeft, Boxes, CircleDollarSign, ClipboardList, Grid2X2,
  History, Laptop, LayoutDashboard, List, Loader2, MapPin, PackageCheck, Pencil, Plus,
  Search, ShieldCheck, Trash2, UserRound, Wrench, X,
} from "lucide-react"
import axiosInstance from "@/lib/axios-config"
import type { InventoryActivity, InventoryFilters, InventoryFormValues, InventoryItem, InventorySummary } from "@/types/inventory"
import { equipmentLabel, formatInventoryMoney, inventoryStatusTone, isWarrantyDue } from "./inventory-utils"

const emptyForm: InventoryFormValues = {
  sku: "", assetTag: "", name: "", description: "", category: "Computers", manufacturer: "", model: "", serialNumber: "",
  status: "Available", condition: "Good", quantity: 1, minimumQuantity: 0, unit: "pcs", location: "", department: "",
  assignedToUserId: null, supplier: "", purchaseDate: null, purchasePrice: null, warrantyExpiry: null, imageUrl: "", notes: "",
}

const blankSummary: InventorySummary = { totalItems: 0, totalUnits: 0, available: 0, assigned: 0, inMaintenance: 0, lowStock: 0, totalValue: 0, categories: [] }
const blankFilters: InventoryFilters = { statuses: ["Available", "Assigned", "In Maintenance", "Reserved", "Retired"], conditions: ["New", "Good", "Fair", "Poor", "Damaged"], categories: [], locations: [], users: [] }

export function InventoryView() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [summary, setSummary] = useState<InventorySummary>(blankSummary)
  const [filters, setFilters] = useState<InventoryFilters>(blankFilters)
  const [section, setSection] = useState<"overview" | "equipment">("overview")
  const [view, setView] = useState<"table" | "grid">("table")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("")
  const [status, setStatus] = useState("")
  const [location, setLocation] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InventoryItem | null>(null)
  const [selected, setSelected] = useState<InventoryItem | null>(null)
  const [activity, setActivity] = useState<InventoryActivity[]>([])

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const [itemsRes, summaryRes, filtersRes] = await Promise.all([
        axiosInstance.get("/inventory"), axiosInstance.get("/inventory/summary"), axiosInstance.get("/inventory/filters"),
      ])
      setItems(itemsRes.data?.result ?? []); setSummary(summaryRes.data?.result ?? blankSummary); setFilters(filtersRes.data?.result ?? blankFilters)
    } catch { setError("Could not load the equipment inventory.") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const visibleItems = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter(item => (!term || `${item.name} ${item.sku} ${item.assetTag ?? ""} ${item.serialNumber ?? ""} ${item.manufacturer ?? ""} ${item.model ?? ""}`.toLowerCase().includes(term)) &&
      (!category || item.category === category) && (!status || item.status === status) && (!location || item.location === location))
  }, [items, query, category, status, location])

  const openCreate = () => { setEditing(null); setFormOpen(true) }
  const openEdit = (item: InventoryItem) => { setEditing(item); setFormOpen(true) }
  const openDetails = async (item: InventoryItem) => {
    setSelected(item); setActivity([])
    try { const res = await axiosInstance.get(`/inventory/${item.id}/activity`); setActivity(res.data?.result ?? []) } catch { /* details remain usable */ }
  }
  const refreshItem = (saved: InventoryItem) => {
    setItems(current => current.some(x => x.id === saved.id) ? current.map(x => x.id === saved.id ? saved : x) : [...current, saved])
    setSelected(current => current?.id === saved.id ? saved : current)
    void axiosInstance.get("/inventory/summary").then(res => setSummary(res.data?.result ?? blankSummary))
  }
  const remove = async (item: InventoryItem) => {
    if (!window.confirm(`Delete ${item.name}? This also removes its equipment history.`)) return
    try { await axiosInstance.delete(`/inventory/${item.id}`); setItems(current => current.filter(x => x.id !== item.id)); setSelected(null); void load() }
    catch (e: unknown) { setError(errorMessage(e, "Could not delete this equipment.")) }
  }

  return (
    <main className="min-h-svh bg-[#eef1f4] text-[#172b4d]">
      <div className="flex min-h-svh">
        <aside className="hidden w-64 shrink-0 flex-col bg-[#172b4d] text-white lg:flex">
          <div className="flex items-center gap-3 border-b border-white/10 px-6 py-6"><div className="flex size-10 items-center justify-center rounded-xl bg-[#579dff]"><Boxes className="size-5" /></div><div><p className="font-bold">Sepehr Inventory</p><p className="text-xs text-slate-300">Equipment workspace</p></div></div>
          <nav className="space-y-2 p-4">
            <SideButton active={section === "overview"} icon={LayoutDashboard} label="Overview" onClick={() => setSection("overview")} />
            <SideButton active={section === "equipment"} icon={Laptop} label="Equipment" count={summary.totalItems} onClick={() => setSection("equipment")} />
          </nav>
          <div className="mt-auto border-t border-white/10 p-4"><Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><ArrowLeft className="size-4" /> Dashboard chooser</Link></div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="border-b border-[#dfe1e6] bg-white px-4 py-4 sm:px-7"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div><div className="flex items-center gap-2 lg:hidden"><Boxes className="size-5 text-[#0c66e4]" /><span className="font-bold">Sepehr Inventory</span></div><h1 className="mt-1 text-2xl font-bold">{section === "overview" ? "Inventory overview" : "Equipment catalog"}</h1><p className="text-sm text-[#626f86]">{section === "overview" ? "Live equipment availability, value, and attention items" : "Register, assign, and track every team asset"}</p></div><button onClick={openCreate} className="inline-flex items-center gap-2 rounded-lg bg-[#0c66e4] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#0055cc]"><Plus className="size-4" /> Register equipment</button></div></header>
          <div className="border-b border-[#dfe1e6] bg-white px-4 lg:hidden"><div className="mx-auto flex max-w-[1500px] gap-1"><MobileTab active={section === "overview"} label="Overview" onClick={() => setSection("overview")} /><MobileTab active={section === "equipment"} label="Equipment" onClick={() => setSection("equipment")} /></div></div>

          <div className="mx-auto max-w-[1500px] p-4 sm:p-7">
            {error && <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertTriangle className="size-4" />{error}</div>}
            {loading ? <div className="flex h-72 items-center justify-center"><Loader2 className="size-8 animate-spin text-[#0c66e4]" /></div> : section === "overview" ? (
              <Overview summary={summary} items={items} onShowEquipment={() => setSection("equipment")} onSelect={openDetails} />
            ) : (
              <EquipmentCatalog items={visibleItems} allItems={items} filters={filters} query={query} category={category} status={status} location={location} view={view}
                setQuery={setQuery} setCategory={setCategory} setStatus={setStatus} setLocation={setLocation} setView={setView} onEdit={openEdit} onSelect={openDetails} onDelete={remove} />
            )}
          </div>
        </div>
      </div>
      {formOpen && <EquipmentForm item={editing} filters={filters} onClose={() => setFormOpen(false)} onSaved={item => { refreshItem(item); setFormOpen(false) }} />}
      {selected && <EquipmentDetails item={selected} activity={activity} onClose={() => setSelected(null)} onEdit={() => { setEditing(selected); setFormOpen(true) }} onAdjusted={refreshItem} />}
    </main>
  )
}

function Overview({ summary, items, onShowEquipment, onSelect }: { summary: InventorySummary; items: InventoryItem[]; onShowEquipment: () => void; onSelect: (item: InventoryItem) => void }) {
  const attention = items.filter(x => x.isLowStock || x.warrantyExpired || x.status === "In Maintenance" || isWarrantyDue(x.warrantyExpiry)).slice(0, 6)
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={Laptop} label="Registered equipment" value={String(summary.totalItems)} detail={`${summary.totalUnits} total units`} tone="blue" />
      <Metric icon={PackageCheck} label="Available" value={String(summary.available)} detail={`${summary.assigned} assigned`} tone="green" />
      <Metric icon={Wrench} label="Needs attention" value={String(summary.inMaintenance + summary.lowStock)} detail={`${summary.inMaintenance} maintenance · ${summary.lowStock} low stock`} tone="amber" />
      <Metric icon={CircleDollarSign} label="Inventory value" value={formatInventoryMoney(summary.totalValue)} detail="Based on purchase price" tone="violet" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
      <section className="overflow-hidden rounded-xl border border-[#dfe1e6] bg-white shadow-sm"><div className="flex items-center justify-between border-b border-[#dfe1e6] px-5 py-4"><div><h2 className="font-semibold">Equipment requiring attention</h2><p className="text-sm text-[#626f86]">Low stock, maintenance, and warranty alerts</p></div><button onClick={onShowEquipment} className="text-sm font-semibold text-[#0c66e4] hover:underline">View all</button></div>{attention.length ? <div className="divide-y divide-[#dfe1e6]">{attention.map(item => <button key={item.id} onClick={() => onSelect(item)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[#f7f8f9]"><EquipmentAvatar item={item} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><p className="truncate text-xs text-[#626f86]">{item.assetTag || item.sku} · {equipmentLabel(item)}</p></div><div className="text-right">{item.isLowStock && <p className="text-xs font-semibold text-red-700">Low stock</p>}{item.status === "In Maintenance" && <p className="text-xs font-semibold text-amber-700">Maintenance</p>}{item.warrantyExpired && <p className="text-xs font-semibold text-red-700">Warranty expired</p>}{isWarrantyDue(item.warrantyExpiry) && <p className="text-xs font-semibold text-amber-700">Warranty due</p>}</div></button>)}</div> : <Empty message="No equipment currently needs attention." />}</section>
      <section className="rounded-xl border border-[#dfe1e6] bg-white p-5 shadow-sm"><h2 className="font-semibold">Equipment by category</h2><p className="mb-5 text-sm text-[#626f86]">Distribution of registered assets</p><div className="space-y-4">{summary.categories.map(category => { const percent = summary.totalItems ? Math.round(category.count / summary.totalItems * 100) : 0; return <div key={category.name}><div className="mb-1.5 flex justify-between text-sm"><span>{category.name}</span><span className="font-semibold">{category.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#dfe1e6]"><div className="h-full rounded-full bg-[#0c66e4]" style={{ width: `${percent}%` }} /></div></div> })}</div></section>
    </div>
  </div>
}

function EquipmentCatalog(props: { items: InventoryItem[]; allItems: InventoryItem[]; filters: InventoryFilters; query: string; category: string; status: string; location: string; view: "table" | "grid"; setQuery: (v: string) => void; setCategory: (v: string) => void; setStatus: (v: string) => void; setLocation: (v: string) => void; setView: (v: "table" | "grid") => void; onEdit: (x: InventoryItem) => void; onSelect: (x: InventoryItem) => void; onDelete: (x: InventoryItem) => void }) {
  const { items, allItems, filters } = props
  const categories = Array.from(new Set([...filters.categories, ...allItems.map(x => x.category)])).sort()
  const locations = Array.from(new Set([...filters.locations, ...allItems.map(x => x.location).filter((x): x is string => Boolean(x))])).sort()
  return <section className="overflow-hidden rounded-xl border border-[#dfe1e6] bg-white shadow-sm">
    <div className="grid gap-3 border-b border-[#dfe1e6] bg-[#f7f8f9] p-4 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]"><FilterSearch value={props.query} onChange={props.setQuery} /><FilterSelect value={props.category} onChange={props.setCategory} placeholder="All categories" options={categories} /><FilterSelect value={props.status} onChange={props.setStatus} placeholder="All statuses" options={filters.statuses} /><FilterSelect value={props.location} onChange={props.setLocation} placeholder="All locations" options={locations} /><div className="hidden rounded-lg border border-[#dfe1e6] bg-white p-1 sm:flex"><ViewButton active={props.view === "table"} icon={List} label="Table" onClick={() => props.setView("table")} /><ViewButton active={props.view === "grid"} icon={Grid2X2} label="Grid" onClick={() => props.setView("grid")} /></div></div>
    <div className="flex items-center justify-between border-b border-[#dfe1e6] px-5 py-3 text-sm text-[#626f86]"><span><strong className="text-[#172b4d]">{items.length}</strong> equipment records</span><span>Click an item to see history</span></div>
    {items.length === 0 ? <Empty message="No equipment matches these filters." /> : props.view === "grid" ? <EquipmentGrid items={items} onSelect={props.onSelect} onEdit={props.onEdit} /> : <><div className="sm:hidden"><EquipmentGrid items={items} onSelect={props.onSelect} onEdit={props.onEdit} /></div><div className="hidden sm:block"><EquipmentTable items={items} onSelect={props.onSelect} onEdit={props.onEdit} onDelete={props.onDelete} /></div></>}
  </section>
}

function EquipmentGrid({ items, onSelect, onEdit }: { items: InventoryItem[]; onSelect: (x: InventoryItem) => void; onEdit: (x: InventoryItem) => void }) {
  return <div className="grid gap-4 p-4 sm:grid-cols-2 2xl:grid-cols-3">{items.map(item => <EquipmentCard key={item.id} item={item} onSelect={onSelect} onEdit={onEdit} />)}</div>
}

function EquipmentTable({ items, onSelect, onEdit, onDelete }: { items: InventoryItem[]; onSelect: (x: InventoryItem) => void; onEdit: (x: InventoryItem) => void; onDelete: (x: InventoryItem) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[#172b4d] text-xs uppercase tracking-wide text-white"><tr><th className="px-4 py-3">Equipment</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Assigned to</th><th className="px-4 py-3">Location</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Value</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody>{items.map(item => <tr key={item.id} onClick={() => onSelect(item)} className="cursor-pointer border-t border-[#dfe1e6] hover:bg-[#f7f8f9]"><td className="px-4 py-3"><div className="flex items-center gap-3"><EquipmentAvatar item={item} /><div><p className="font-semibold">{item.name}</p><p className="text-xs text-[#626f86]">{item.assetTag || item.sku} · {equipmentLabel(item)}</p></div></div></td><td className="px-4 py-3">{item.category}<p className="text-xs text-[#626f86]">{item.condition}</p></td><td className="px-4 py-3"><StatusBadge status={item.status} />{item.warrantyExpired && <p className="mt-1 text-xs font-medium text-red-700">Warranty expired</p>}</td><td className="px-4 py-3">{item.assignedToName || "Unassigned"}<p className="text-xs text-[#626f86]">{item.department || "No department"}</p></td><td className="px-4 py-3"><span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{item.location || "Not set"}</span></td><td className="px-4 py-3"><span className={item.isLowStock ? "font-bold text-red-700" : "font-semibold"}>{item.quantity} {item.unit}</span><p className="text-xs text-[#626f86]">Min. {item.minimumQuantity}</p></td><td className="px-4 py-3">{formatInventoryMoney(item.stockValue)}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><IconButton label="Edit" icon={Pencil} onClick={e => { e.stopPropagation(); onEdit(item) }} /><IconButton danger label="Delete" icon={Trash2} onClick={e => { e.stopPropagation(); onDelete(item) }} /></div></td></tr>)}</tbody></table></div>
}

function EquipmentCard({ item, onSelect, onEdit }: { item: InventoryItem; onSelect: (x: InventoryItem) => void; onEdit: (x: InventoryItem) => void }) {
  return <article onClick={() => onSelect(item)} className="group cursor-pointer overflow-hidden rounded-xl border border-[#dfe1e6] bg-white transition hover:-translate-y-0.5 hover:border-[#85b8ff] hover:shadow-md"><div className="flex h-32 items-center justify-center bg-gradient-to-br from-[#e9f2ff] to-[#f7f8f9]">{item.imageUrl ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover" /> : <Laptop className="size-12 text-[#0c66e4]" />}</div><div className="p-4"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{item.name}</p><p className="text-xs text-[#626f86]">{item.assetTag || item.sku}</p></div><button onClick={e => { e.stopPropagation(); onEdit(item) }} className="rounded-md p-1.5 opacity-0 hover:bg-[#f1f2f4] group-hover:opacity-100"><Pencil className="size-4" /></button></div><div className="mt-3 flex items-center justify-between"><StatusBadge status={item.status} /><span className={item.isLowStock ? "text-sm font-bold text-red-700" : "text-sm font-semibold"}>{item.quantity} {item.unit}</span></div><div className="mt-3 border-t border-[#dfe1e6] pt-3 text-xs text-[#626f86]"><p>{equipmentLabel(item)}</p><p className="mt-1">{item.assignedToName || "Unassigned"} · {item.location || "No location"}</p></div></div></article>
}

function EquipmentForm({ item, filters, onClose, onSaved }: { item: InventoryItem | null; filters: InventoryFilters; onClose: () => void; onSaved: (item: InventoryItem) => void }) {
  const [form, setForm] = useState<InventoryFormValues>(() => item ? toForm(item) : emptyForm)
  const [saving, setSaving] = useState(false); const [error, setError] = useState("")
  const set = <K extends keyof InventoryFormValues>(key: K, value: InventoryFormValues[K]) => setForm(current => ({ ...current, [key]: value }))
  const save = async () => {
    setSaving(true); setError("")
    try { const res = item ? await axiosInstance.put(`/inventory/${item.id}`, form) : await axiosInstance.post("/inventory", form); onSaved(res.data?.result) }
    catch (e: unknown) { setError(errorMessage(e, "Could not save this equipment.")) }
    finally { setSaving(false) }
  }
  return <Modal title={item ? "Edit equipment" : "Register equipment"} subtitle="Catalog, ownership, purchasing, and lifecycle details" onClose={onClose} wide>
    <div className="max-h-[70vh] space-y-6 overflow-y-auto p-5">
      <FormSection title="Identification" icon={ClipboardList}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Equipment name *" value={form.name} onChange={v => set("name", v)} /><Field label="SKU *" value={form.sku} onChange={v => set("sku", v)} /><Field label="Asset tag" value={form.assetTag ?? ""} onChange={v => set("assetTag", v)} /><Field label="Category *" value={form.category} onChange={v => set("category", v)} list="inventory-categories" /><datalist id="inventory-categories">{filters.categories.map(x => <option key={x} value={x} />)}</datalist><Field label="Manufacturer" value={form.manufacturer ?? ""} onChange={v => set("manufacturer", v)} /><Field label="Model" value={form.model ?? ""} onChange={v => set("model", v)} /><Field label="Serial number" value={form.serialNumber ?? ""} onChange={v => set("serialNumber", v)} /><Field label="Image URL" value={form.imageUrl ?? ""} onChange={v => set("imageUrl", v)} className="sm:col-span-2" /></div></FormSection>
      <FormSection title="Availability and assignment" icon={UserRound}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><SelectField label="Status" value={form.status} onChange={v => set("status", v as InventoryItem["status"])} options={filters.statuses} /><SelectField label="Condition" value={form.condition} onChange={v => set("condition", v as InventoryItem["condition"])} options={filters.conditions} /><SelectField label="Assigned to" value={form.assignedToUserId?.toString() ?? ""} onChange={v => set("assignedToUserId", v ? Number(v) : null)} options={filters.users.map(x => ({ value: String(x.id), label: x.name || x.username }))} placeholder="Unassigned" /><Field label="Department" value={form.department ?? ""} onChange={v => set("department", v)} /><Field label="Location" value={form.location ?? ""} onChange={v => set("location", v)} list="inventory-locations" /><datalist id="inventory-locations">{filters.locations.map(x => <option key={x} value={x} />)}</datalist></div></FormSection>
      <FormSection title="Stock and purchasing" icon={CircleDollarSign}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><Field label="Quantity" type="number" value={String(form.quantity)} onChange={v => set("quantity", Number(v))} /><Field label="Minimum stock" type="number" value={String(form.minimumQuantity)} onChange={v => set("minimumQuantity", Number(v))} /><Field label="Unit" value={form.unit} onChange={v => set("unit", v)} /><Field label="Purchase price" type="number" value={form.purchasePrice?.toString() ?? ""} onChange={v => set("purchasePrice", v === "" ? null : Number(v))} /><Field label="Supplier" value={form.supplier ?? ""} onChange={v => set("supplier", v)} className="sm:col-span-2" /><Field label="Purchase date" type="date" value={dateValue(form.purchaseDate)} onChange={v => set("purchaseDate", v || null)} /><Field label="Warranty expiry" type="date" value={dateValue(form.warrantyExpiry)} onChange={v => set("warrantyExpiry", v || null)} /></div></FormSection>
      <FormSection title="Details" icon={ShieldCheck}><div className="grid gap-4 sm:grid-cols-2"><TextArea label="Description" value={form.description ?? ""} onChange={v => set("description", v)} /><TextArea label="Internal notes" value={form.notes ?? ""} onChange={v => set("notes", v)} /></div></FormSection>
      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    </div><ModalFooter onClose={onClose} onSave={() => void save()} saving={saving} saveLabel={item ? "Save changes" : "Register equipment"} />
  </Modal>
}

function EquipmentDetails({ item, activity, onClose, onEdit, onAdjusted }: { item: InventoryItem; activity: InventoryActivity[]; onClose: () => void; onEdit: () => void; onAdjusted: (item: InventoryItem) => void }) {
  const [adjusting, setAdjusting] = useState(false); const [change, setChange] = useState(0); const [reason, setReason] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState("")
  const adjust = async () => { setSaving(true); setError(""); try { const res = await axiosInstance.post(`/inventory/${item.id}/adjust-stock`, { change, reason }); onAdjusted(res.data?.result); setAdjusting(false) } catch (e: unknown) { setError(errorMessage(e, "Could not adjust stock.")) } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-40 bg-black/35" onMouseDown={onClose}><aside onMouseDown={e => e.stopPropagation()} className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#dfe1e6] p-5"><div className="flex gap-3"><EquipmentAvatar item={item} large /><div><h2 className="text-xl font-bold">{item.name}</h2><p className="text-sm text-[#626f86]">{item.assetTag || item.sku} · {equipmentLabel(item)}</p></div></div><button onClick={onClose} className="rounded p-2 hover:bg-[#f1f2f4]"><X className="size-5" /></button></div><div className="flex-1 space-y-6 overflow-y-auto p-5"><div className="flex flex-wrap gap-2"><StatusBadge status={item.status} /><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">{item.condition}</span>{item.isLowStock && <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">Low stock</span>}</div><div className="grid grid-cols-2 gap-4"><Detail label="Category" value={item.category} /><Detail label="Serial number" value={item.serialNumber} /><Detail label="Assigned to" value={item.assignedToName || "Unassigned"} /><Detail label="Department" value={item.department} /><Detail label="Location" value={item.location} /><Detail label="Supplier" value={item.supplier} /><Detail label="Purchase price" value={item.purchasePrice == null ? null : formatInventoryMoney(item.purchasePrice)} /><Detail label="Stock value" value={formatInventoryMoney(item.stockValue)} /><Detail label="Purchase date" value={friendlyDate(item.purchaseDate)} /><Detail label="Warranty expiry" value={friendlyDate(item.warrantyExpiry)} /></div><div className="rounded-xl bg-[#f7f8f9] p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-[#626f86]">Current stock</p><p className="text-2xl font-bold">{item.quantity} <span className="text-sm font-medium">{item.unit}</span></p></div><button onClick={() => setAdjusting(!adjusting)} className="inline-flex items-center gap-2 rounded-lg border border-[#dfe1e6] bg-white px-3 py-2 text-sm font-semibold hover:bg-[#f1f2f4]"><ArrowDownUp className="size-4" /> Adjust stock</button></div>{adjusting && <div className="mt-4 grid gap-3 border-t border-[#dfe1e6] pt-4 sm:grid-cols-[120px_1fr_auto]"><Field label="Change (+/-)" type="number" value={String(change)} onChange={v => setChange(Number(v))} /><Field label="Reason" value={reason} onChange={setReason} /><button disabled={saving || change === 0} onClick={() => void adjust()} className="self-end rounded-lg bg-[#0c66e4] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Apply</button>{error && <p className="text-sm text-red-700 sm:col-span-3">{error}</p>}</div>}</div>{item.description && <DetailBlock label="Description" value={item.description} />}{item.notes && <DetailBlock label="Internal notes" value={item.notes} />}<section><div className="mb-3 flex items-center gap-2"><History className="size-4" /><h3 className="font-semibold">Activity history</h3></div><div className="space-y-3">{activity.length ? activity.map(entry => <div key={entry.id} className="border-l-2 border-[#85b8ff] pl-3"><p className="text-sm"><strong>{entry.userName || "User"}</strong> · {entry.action}</p><p className="text-sm text-[#626f86]">{entry.details}</p><p className="mt-1 text-xs text-[#8993a4]">{new Date(entry.createdAt).toLocaleString()}</p></div>) : <p className="text-sm text-[#626f86]">No activity recorded yet.</p>}</div></section><p className="border-t border-[#dfe1e6] pt-4 text-xs text-[#626f86]">Created by {item.createdByName || "Unknown"} · Last modified by {item.updatedByName || "Unknown"}</p></div><div className="flex justify-end border-t border-[#dfe1e6] p-4"><button onClick={onEdit} className="inline-flex items-center gap-2 rounded-lg bg-[#0c66e4] px-4 py-2 text-sm font-semibold text-white"><Pencil className="size-4" /> Edit equipment</button></div></aside></div>
}

function SideButton({ active, icon: Icon, label, count, onClick }: { active: boolean; icon: typeof Boxes; label: string; count?: number; onClick: () => void }) { return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${active ? "bg-[#579dff] text-[#172b4d]" : "text-slate-200 hover:bg-white/10"}`}><Icon className="size-4" />{label}{count != null && <span className="ml-auto rounded-full bg-black/15 px-2 py-0.5 text-xs">{count}</span>}</button> }
function MobileTab({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) { return <button onClick={onClick} className={`border-b-2 px-4 py-3 text-sm font-semibold ${active ? "border-[#0c66e4] text-[#0c66e4]" : "border-transparent text-[#626f86]"}`}>{label}</button> }
function Metric({ icon: Icon, label, value, detail, tone }: { icon: typeof Boxes; label: string; value: string; detail: string; tone: "blue" | "green" | "amber" | "violet" }) { const colors = { blue: "bg-blue-50 text-blue-700", green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", violet: "bg-violet-50 text-violet-700" }; return <div className="rounded-xl border border-[#dfe1e6] bg-white p-5 shadow-sm"><div className={`mb-4 flex size-10 items-center justify-center rounded-lg ${colors[tone]}`}><Icon className="size-5" /></div><p className="text-sm text-[#626f86]">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p><p className="mt-1 text-xs text-[#8993a4]">{detail}</p></div> }
function EquipmentAvatar({ item, large = false }: { item: InventoryItem; large?: boolean }) { return <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#e9f2ff] text-[#0c66e4] ${large ? "size-14" : "size-10"}`}>{item.imageUrl ? <img src={item.imageUrl} alt="" className="size-full object-cover" /> : <Laptop className={large ? "size-7" : "size-5"} />}</div> }
function StatusBadge({ status }: { status: InventoryItem["status"] }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${inventoryStatusTone(status)}`}>{status}</span> }
function FilterSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) { return <label className="flex items-center gap-2 rounded-lg border border-[#dfe1e6] bg-white px-3"><Search className="size-4 text-[#626f86]" /><input value={value} onChange={e => onChange(e.target.value)} placeholder="Search name, asset tag, serial..." className="h-10 w-full bg-transparent text-sm outline-none" /></label> }
function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) { return <select value={value} onChange={e => onChange(e.target.value)} className="h-10 rounded-lg border border-[#dfe1e6] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"><option value="">{placeholder}</option>{options.map(x => <option key={x} value={x}>{x}</option>)}</select> }
function ViewButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof List; label: string; onClick: () => void }) { return <button onClick={onClick} title={label} className={`rounded-md p-2 ${active ? "bg-[#e9f2ff] text-[#0c66e4]" : "text-[#626f86] hover:bg-[#f1f2f4]"}`}><Icon className="size-4" /></button> }
function IconButton({ icon: Icon, label, onClick, danger = false }: { icon: typeof Pencil; label: string; onClick: (e: React.MouseEvent) => void; danger?: boolean }) { return <button title={label} onClick={onClick} className={`rounded p-2 ${danger ? "text-red-700 hover:bg-red-50" : "text-[#44546f] hover:bg-[#dfe1e6]"}`}><Icon className="size-4" /></button> }
function Empty({ message }: { message: string }) { return <div className="flex min-h-40 flex-col items-center justify-center p-8 text-center text-[#626f86]"><Boxes className="mb-3 size-8 text-[#8993a4]" /><p>{message}</p></div> }
function Modal({ title, subtitle, onClose, wide = false, children }: { title: string; subtitle?: string; onClose: () => void; wide?: boolean; children: React.ReactNode }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3" onMouseDown={onClose}><div role="dialog" aria-modal="true" onMouseDown={e => e.stopPropagation()} className={`w-full overflow-hidden rounded-xl bg-white shadow-2xl ${wide ? "max-w-5xl" : "max-w-lg"}`}><div className="flex items-start justify-between border-b border-[#dfe1e6] px-5 py-4"><div><h2 className="text-lg font-bold">{title}</h2>{subtitle && <p className="text-sm text-[#626f86]">{subtitle}</p>}</div><button aria-label="Close dialog" onClick={onClose} className="rounded p-1.5 hover:bg-[#f1f2f4]"><X className="size-5" /></button></div>{children}</div></div> }
function ModalFooter({ onClose, onSave, saving, saveLabel }: { onClose: () => void; onSave: () => void; saving: boolean; saveLabel: string }) { return <div className="flex justify-end gap-2 border-t border-[#dfe1e6] px-5 py-4"><button onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold hover:bg-[#f1f2f4]">Cancel</button><button disabled={saving} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-[#0c66e4] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving && <Loader2 className="size-4 animate-spin" />}{saveLabel}</button></div> }
function FormSection({ title, icon: Icon, children }: { title: string; icon: typeof Boxes; children: React.ReactNode }) { return <section><div className="mb-3 flex items-center gap-2 border-b border-[#dfe1e6] pb-2"><Icon className="size-4 text-[#0c66e4]" /><h3 className="font-semibold">{title}</h3></div>{children}</section> }
function Field({ label, value, onChange, type = "text", list, className = "" }: { label: string; value: string; onChange: (value: string) => void; type?: string; list?: string; className?: string }) { const cleanLabel = label.replace(" *", "").toLowerCase(); return <label className={className}><span className="mb-1 block text-sm font-medium">{label}</span><input type={type} list={list} placeholder={type === "date" ? undefined : `Enter ${cleanLabel}`} step={type === "number" ? "any" : undefined} value={value} onChange={e => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-[#8590a2] px-3 text-sm placeholder:text-[#8993a4] outline-none focus:border-[#0c66e4] focus:ring-1 focus:ring-[#0c66e4]" /></label> }
function SelectField({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (value: string) => void; options: (string | { value: string; label: string })[]; placeholder?: string }) { return <label><span className="mb-1 block text-sm font-medium">{label}</span><select value={value} onChange={e => onChange(e.target.value)} className="h-10 w-full rounded-lg border border-[#8590a2] bg-white px-3 text-sm outline-none focus:border-[#0c66e4]"><option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>{options.map(option => { const value = typeof option === "string" ? option : option.value; return <option key={value} value={value}>{typeof option === "string" ? option : option.label}</option> })}</select></label> }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className="mb-1 block text-sm font-medium">{label}</span><textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={`Enter ${label.toLowerCase()}`} className="w-full rounded-lg border border-[#8590a2] px-3 py-2 text-sm placeholder:text-[#8993a4] outline-none focus:border-[#0c66e4]" /></label> }
function Detail({ label, value }: { label: string; value: string | null | undefined }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-[#8993a4]">{label}</p><p className="mt-1 text-sm font-medium">{value || "Not set"}</p></div> }
function DetailBlock({ label, value }: { label: string; value: string }) { return <div><h3 className="mb-1 text-sm font-semibold">{label}</h3><p className="whitespace-pre-wrap text-sm leading-6 text-[#44546f]">{value}</p></div> }
function toForm(item: InventoryItem): InventoryFormValues { return { sku: item.sku, assetTag: item.assetTag, name: item.name, description: item.description, category: item.category, manufacturer: item.manufacturer, model: item.model, serialNumber: item.serialNumber, status: item.status, condition: item.condition, quantity: item.quantity, minimumQuantity: item.minimumQuantity, unit: item.unit, location: item.location, department: item.department, assignedToUserId: item.assignedToUserId, supplier: item.supplier, purchaseDate: item.purchaseDate, purchasePrice: item.purchasePrice, warrantyExpiry: item.warrantyExpiry, imageUrl: item.imageUrl, notes: item.notes } }
function dateValue(value: string | null) { return value ? value.slice(0, 10) : "" }
function friendlyDate(value: string | null) { return value ? new Date(value).toLocaleDateString() : null }
function errorMessage(error: unknown, fallback: string) { if (typeof error === "object" && error && "response" in error) { const response = (error as { response?: { data?: { message?: string } } }).response; return response?.data?.message ?? fallback } return fallback }
