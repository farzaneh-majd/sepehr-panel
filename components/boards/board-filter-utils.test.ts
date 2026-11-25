import { countActiveFilters, createCardMatcher, EMPTY_FILTERS, filterLists } from "./board-filter-utils"
import type { BoardList, Card } from "@/types/kanban"

const card = (overrides: Partial<Card> = {}): Card => ({
  id: 1,
  title: "Fix login flow",
  description: "OAuth callback",
  listId: 10,
  position: 0,
  coverColor: null,
  coverImage: null,
  dueDate: null,
  dueComplete: false,
  isArchived: false,
  taskId: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  labels: [{ id: 7, name: "Backend", color: "#579dff" }],
  members: [{ id: 4, firstName: "Ava", lastName: "Nouri", email: "ava@example.com", avatarUrl: null }],
  ...overrides,
})

describe("board filters", () => {
  it("counts compound filter selections", () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, keyword: "login", overdue: true, memberIds: [4, 5], labelIds: [7] })).toBe(5)
  })

  it("searches card content, labels, and member names", () => {
    expect(createCardMatcher({ ...EMPTY_FILTERS, keyword: "backend ava" }, null)(card())).toBe(true)
    expect(createCardMatcher({ ...EMPTY_FILTERS, keyword: "frontend" }, null)(card())).toBe(false)
  })

  it("combines assignee, completion, and label filters", () => {
    const filters = { ...EMPTY_FILTERS, assignedToMe: true, incomplete: true, labelIds: [7] }
    expect(createCardMatcher(filters, 4)(card())).toBe(true)
    expect(createCardMatcher(filters, 9)(card())).toBe(false)
  })

  it("keeps list structure while filtering cards", () => {
    const list: BoardList = { id: 10, name: "To do", boardId: 1, position: 0, isArchived: false, createdAt: "", updatedAt: "", cards: [card(), card({ id: 2, title: "Write docs", labels: [] })] }
    const result = filterLists([list], { ...EMPTY_FILTERS, keyword: "login" }, null)
    expect(result).toHaveLength(1)
    expect(result[0].cards.map((item) => item.id)).toEqual([1])
  })
})
