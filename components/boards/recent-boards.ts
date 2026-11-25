const STORAGE_KEY = "sepehr:recent-boards";
const MAX_RECENT = 4;

export function getRecentBoardIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "number") : [];
  } catch {
    return [];
  }
}

export function rememberRecentBoard(boardId: number) {
  try {
    const next = [boardId, ...getRecentBoardIds().filter((id) => id !== boardId)].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}
