import { normalizeSearchText, searchTokens, matchesTokens } from "@/lib/search"
import type { BugAction, BugFormValues, BugSeverity, BugStatus, CardBug } from "@/types/kanban"

export const bugCode = (id: number) => `BUG-${id}`

export const personName = (firstName?: string | null, lastName?: string | null) =>
  [firstName, lastName].filter(Boolean).join(" ")

export const BUG_PRIMARY_ACTIONS: Record<BugStatus, { label: string; action: BugAction }> = {
  "Open": { label: "Start Work", action: "start" },
  "In Progress": { label: "Submit for Retest", action: "submit" },
  "Ready for Retest": { label: "Verify Fix", action: "verify" },
  "Closed": { label: "Reopen Bug", action: "reopen" },
}

export const BUG_EXTRA_ACTIONS: Record<BugStatus, { label: string; action: BugAction }[]> = {
  "Open": [{ label: "Close with Resolution...", action: "close" }],
  "In Progress": [],
  "Ready for Retest": [{ label: "Reject Fix / Reopen", action: "reopen" }],
  "Closed": [],
}

export const BUG_SEVERITY_STYLES: Record<BugSeverity, string> = {
  "Critical": "bg-red-500/20 text-red-300",
  "Major": "bg-orange-500/20 text-orange-300",
  "Medium": "bg-yellow-500/20 text-yellow-300",
  "Low": "bg-sky-500/20 text-sky-300",
}

export const BUG_STATUS_STYLES: Record<BugStatus, string> = {
  "Open": "bg-blue-500/20 text-blue-300",
  "In Progress": "bg-amber-500/20 text-amber-300",
  "Ready for Retest": "bg-purple-500/20 text-purple-300",
  "Closed": "bg-green-500/20 text-green-300",
}

export function resolveDropAction(from: BugStatus, to: BugStatus): BugAction | null {
  if (from === to) return null
  if (to === "Open") return "reopen"
  if (to === "In Progress" && from === "Open") return "start"
  if (to === "Ready for Retest" && from === "In Progress") return "submit"
  if (to === "Closed" && from === "Ready for Retest") return "verify"
  if (to === "Closed" && from === "Open") return "close"
  return null
}

export function bugToFormValues(bug: CardBug | null, currentUserId: number | null): BugFormValues {
  return {
    title: bug?.title ?? "",
    stepsToReproduce: bug?.stepsToReproduce ?? "",
    expectedResult: bug?.expectedResult ?? "",
    actualResult: bug?.actualResult ?? "",
    description: bug?.description ?? "",
    severity: bug?.severity ?? "Medium",
    priority: bug?.priority ?? "",
    environment: bug?.environment ?? "",
    team: bug?.team ?? "",
    reporterId: bug ? bug.reporterId : currentUserId,
    reporterName: bug?.reporterName ?? null,
    assigneeId: bug?.assigneeId ?? null,
    assigneeTeam: bug?.assigneeTeam ?? "",
  }
}

export function filterBugs(bugs: CardBug[], search: string, team: string): CardBug[] {
  const tokens = searchTokens(search)
  return bugs.filter((bug) => {
    if (team && bug.team !== team) return false
    if (tokens.length === 0) return true
    return matchesTokens(normalizeSearchText(`${bugCode(bug.id)} ${bug.title}`), tokens)
  })
}
