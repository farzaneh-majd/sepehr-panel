export type ErdProject = {
  id: number
  name: string
  description?: string | null
  color?: string | null
  userId?: number
  moduleCount?: number
  createdAt?: string | null
  updatedAt?: string | null
}

export type ErdModule = {
  id: number
  projectId?: number | null
  name: string
  description?: string | null
  color?: string | null
  position?: number | null
  tableCount?: number
  createdAt?: string | null
  updatedAt?: string | null
}

export type ErdColumn = {
  id: number
  tableId?: number | null
  name: string
  dataType: string
  isPrimaryKey?: boolean | null
  isForeignKey?: boolean | null
  isNullable?: boolean | null
  isUnique?: boolean | null
  defaultValue?: string | null
  description?: string | null
  position?: number | null
  referencedTableId?: number | null
  referencedColumnName?: string | null
  referencedTableName?: string | null
  referencedTableModuleId?: number | null
  createdAt?: string | null
}

export type ErdTable = {
  id: number
  moduleId?: number | null
  moduleName?: string | null
  name: string
  description?: string | null
  positionX?: number | null
  positionY?: number | null
  color?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  columns?: ErdColumn[]
}

export type ErdProjectDetail = ErdProject & {
  modules?: ErdModule[]
}

export type ErdModuleDetail = ErdModule & {
  tables?: ErdTable[]
}

export type ErdTableSummary = {
  id: number
  name: string
  moduleId?: number | null
  moduleName?: string | null
}

export const DATA_TYPES = [
  "string", "int", "long", "short", "bool",
  "decimal", "double", "float",
  "DateTime", "Guid", "text"
]

export const TABLE_COLORS = [
  "#1e5f8a", "#2d7d46", "#8b5cf6", "#d97706",
  "#dc2626", "#0891b2", "#7c3aed", "#059669",
  "#e11d48", "#6366f1", "#0d9488", "#ca8a04",
]
