import type { InventoryItem } from "@/types/inventory"

export function inventoryStatusTone(status: InventoryItem["status"]) {
  if (status === "Available") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
  if (status === "Assigned") return "bg-blue-50 text-blue-700 ring-blue-600/20"
  if (status === "In Maintenance") return "bg-amber-50 text-amber-800 ring-amber-600/20"
  if (status === "Reserved") return "bg-violet-50 text-violet-700 ring-violet-600/20"
  return "bg-slate-100 text-slate-600 ring-slate-500/20"
}

export function equipmentLabel(item: Pick<InventoryItem, "manufacturer" | "model" | "name">) {
  return [item.manufacturer, item.model].filter(Boolean).join(" ") || item.name
}

export function formatInventoryMoney(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(value)
}

export function isWarrantyDue(date: string | null, now = new Date()) {
  if (!date) return false
  const expiry = new Date(date)
  const warning = new Date(now)
  warning.setDate(warning.getDate() + 30)
  return expiry >= now && expiry <= warning
}
