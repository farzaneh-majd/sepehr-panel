import { bugCode, bugToFormValues, filterBugs, resolveDropAction } from "./bug-utils"
import type { CardBug } from "@/types/kanban"

const bug = (overrides: Partial<CardBug> = {}): CardBug => ({
  id: 12,
  cardId: 4,
  title: "Login button freezes",
  stepsToReproduce: "Open login",
  expectedResult: "Sign in",
  actualResult: "Spinner remains",
  description: null,
  severity: "Major",
  priority: "High",
  environment: "Chrome",
  team: "Frontend",
  reporterId: 2,
  reporterFirstName: "Sara",
  reporterLastName: "Amini",
  reporterName: null,
  assigneeId: null,
  assigneeFirstName: null,
  assigneeLastName: null,
  assigneeAvatarId: null,
  assigneeTeam: null,
  status: "Open",
  resolution: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: null,
  history: [],
  attachments: [],
  ...overrides,
})

describe("bug workflow utilities", () => {
  it("maps valid Kanban drops to workflow actions", () => {
    expect(resolveDropAction("Open", "In Progress")).toBe("start")
    expect(resolveDropAction("In Progress", "Ready for Retest")).toBe("submit")
    expect(resolveDropAction("Ready for Retest", "Closed")).toBe("verify")
    expect(resolveDropAction("Closed", "In Progress")).toBeNull()
  })

  it("creates stable bug codes and form values", () => {
    expect(bugCode(12)).toBe("BUG-12")
    expect(bugToFormValues(bug(), null)).toMatchObject({ title: "Login button freezes", severity: "Major", reporterId: 2 })
    expect(bugToFormValues(null, 9).reporterId).toBe(9)
  })

  it("filters by team and tokenized bug code/title", () => {
    const rows = [bug(), bug({ id: 13, title: "Database timeout", team: "Backend" })]
    expect(filterBugs(rows, "BUG-13 timeout", "Backend").map((item) => item.id)).toEqual([13])
    expect(filterBugs(rows, "", "Frontend").map((item) => item.id)).toEqual([12])
  })
})
