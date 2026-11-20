import { addDays, addMonths, endOfDay, parseServerDate, startOfDay } from "@/lib/date"
import { normalizeSearchText, searchTokens, matchesTokens } from "@/lib/search"
import type { BoardList, Card } from "@/types/kanban"

export interface BoardFilters {
  keyword: string
  noMembers: boolean
  assignedToMe: boolean
  memberIds: number[]
  complete: boolean
  incomplete: boolean
  noDates: boolean
  overdue: boolean
  dueNextDay: boolean
  dueNextWeek: boolean
  dueNextMonth: boolean
  dueRange: { from: Date; to?: Date } | null
  noLabels: boolean
  labelIds: number[]
}

export const EMPTY_FILTERS: BoardFilters = {
  keyword: "",
  noMembers: false,
  assignedToMe: false,
  memberIds: [],
  complete: false,
  incomplete: false,
  noDates: false,
  overdue: false,
  dueNextDay: false,
  dueNextWeek: false,
  dueNextMonth: false,
  dueRange: null,
  noLabels: false,
  labelIds: [],
}

export function countActiveFilters(filters: BoardFilters): number {
  return (
    (filters.keyword.trim() ? 1 : 0) +
    (filters.dueRange ? 1 : 0) +
    [filters.noMembers, filters.assignedToMe, filters.complete, filters.incomplete, filters.noDates,
      filters.overdue, filters.dueNextDay, filters.dueNextWeek, filters.dueNextMonth, filters.noLabels]
      .filter(Boolean).length +
    filters.memberIds.length +
    filters.labelIds.length
  )
}

function cardMemberIds(card: Card): Set<number> {
  const ids = new Set<number>()
  card.assignees?.forEach((a) => ids.add(a.id))
  card.members?.forEach((m) => ids.add(m.id))
  return ids
}

function cardSearchText(card: Card): string {
  const memberNames = [...(card.assignees ?? []), ...(card.members ?? [])]
    .map((m) => `${m.firstName ?? ""} ${m.lastName ?? ""} ${m.email ?? ""}`)
  return normalizeSearchText([
    card.title,
    card.description,
    ...(card.labels ?? []).map((l) => l.name),
    ...memberNames,
  ].filter(Boolean).join(" "))
}

export function createCardMatcher(filters: BoardFilters, currentUserId: number | null) {
  const tokens = searchTokens(filters.keyword)
  const memberFilterActive = filters.noMembers || filters.assignedToMe || filters.memberIds.length > 0
  const statusFilterActive = filters.complete !== filters.incomplete
  const dateFilterActive = filters.noDates || filters.overdue || filters.dueNextDay || filters.dueNextWeek || filters.dueNextMonth || !!filters.dueRange
  const labelFilterActive = filters.noLabels || filters.labelIds.length > 0

  const now = new Date()
  const ranges: Date[] = []
  if (filters.dueNextDay) ranges.push(addDays(now, 1))
  if (filters.dueNextWeek) ranges.push(addDays(now, 7))
  if (filters.dueNextMonth) ranges.push(addMonths(now, 1))
  const upcomingLimit = ranges.length ? new Date(Math.max(...ranges.map((d) => d.getTime()))) : null
  const rangeStart = filters.dueRange ? startOfDay(filters.dueRange.from) : null
  const rangeEnd = filters.dueRange ? endOfDay(filters.dueRange.to ?? filters.dueRange.from) : null

  return (card: Card): boolean => {
    if (tokens.length && !matchesTokens(cardSearchText(card), tokens)) return false

    if (memberFilterActive) {
      const ids = cardMemberIds(card)
      const matches =
        (filters.noMembers && ids.size === 0) ||
        (filters.assignedToMe && currentUserId != null && ids.has(currentUserId)) ||
        filters.memberIds.some((id) => ids.has(id))
      if (!matches) return false
    }

    if (statusFilterActive) {
      if (filters.complete && !card.dueComplete) return false
      if (filters.incomplete && card.dueComplete) return false
    }

    if (dateFilterActive) {
      const due = card.dueDate ? parseServerDate(card.dueDate) : null
      const openDue = due != null && !card.dueComplete ? due : null
      const matches =
        (filters.noDates && due == null) ||
        (filters.overdue && openDue != null && openDue < now) ||
        (upcomingLimit != null && openDue != null && openDue >= now && openDue <= upcomingLimit) ||
        (rangeStart != null && rangeEnd != null && due != null && due >= rangeStart && due <= rangeEnd)
      if (!matches) return false
    }

    if (labelFilterActive) {
      const labelIds = (card.labels ?? []).map((l) => l.id)
      const matches =
        (filters.noLabels && labelIds.length === 0) ||
        filters.labelIds.some((id) => labelIds.includes(id))
      if (!matches) return false
    }

    return true
  }
}

export function filterLists(lists: BoardList[], filters: BoardFilters, currentUserId: number | null): BoardList[] {
  if (countActiveFilters(filters) === 0) return lists
  const matches = createCardMatcher(filters, currentUserId)
  return lists.map((list) => ({ ...list, cards: list.cards.filter(matches) }))
}
