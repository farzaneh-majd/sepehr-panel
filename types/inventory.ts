export interface InventoryItem {
  id: number
  sku: string
  assetTag: string | null
  name: string
  description: string | null
  category: string
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  status: "Available" | "Assigned" | "In Maintenance" | "Reserved" | "Retired"
  condition: "New" | "Good" | "Fair" | "Poor" | "Damaged"
  quantity: number
  minimumQuantity: number
  unit: string
  location: string | null
  department: string | null
  assignedToUserId: number | null
  assignedToName: string | null
  supplier: string | null
  purchaseDate: string | null
  purchasePrice: number | null
  warrantyExpiry: string | null
  imageUrl: string | null
  notes: string | null
  createdById: number
  createdByName: string | null
  updatedById: number
  updatedByName: string | null
  createdAt: string
  updatedAt: string
  isLowStock: boolean
  stockValue: number
  warrantyExpired: boolean
}

export type InventoryFormValues = Omit<InventoryItem, "id" | "assignedToName" | "createdById" | "createdByName" | "updatedById" | "updatedByName" | "createdAt" | "updatedAt" | "isLowStock" | "stockValue" | "warrantyExpired">

export interface InventorySummary {
  totalItems: number
  totalUnits: number
  available: number
  assigned: number
  inMaintenance: number
  lowStock: number
  totalValue: number
  categories: { name: string; count: number }[]
}

export interface InventoryFilters {
  statuses: string[]
  conditions: string[]
  categories: string[]
  locations: string[]
  users: { id: number; name: string; username: string }[]
}

export interface InventoryActivity {
  id: number
  action: string
  details: string | null
  userId: number
  userName: string
  createdAt: string
}
