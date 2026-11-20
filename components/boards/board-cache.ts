import axiosInstance from "@/lib/axios-config";
import type { Board, BoardList } from "@/types/kanban";

export interface BoardMeta {
  name: string;
  background: string;
}

const META_KEY = "awan:board-meta";
const MAX_META = 100;
const FRESH_MS = 10_000;

const listsCache = new Map<number, { data: BoardList[]; at: number }>();
const detailCache = new Map<number, { data: Board; at: number }>();
const inflight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, run: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) return existing;
  const promise = run().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function loadBoardLists(boardId: number, { force = false } = {}): Promise<BoardList[]> {
  const cached = listsCache.get(boardId);
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.data);
  return dedupe(`lists:${boardId}`, async () => {
    const res = await axiosInstance.get(`/board/${boardId}/lists`);
    const data = res.data?.result ?? res.data;
    const lists: BoardList[] = (Array.isArray(data) ? data : []).map((list: BoardList) => ({
      ...list,
      cards: list.cards || [],
    }));
    listsCache.set(boardId, { data: lists, at: Date.now() });
    return lists;
  });
}

export function loadBoardDetail(boardId: number, { force = false } = {}): Promise<Board> {
  const cached = detailCache.get(boardId);
  if (!force && cached && Date.now() - cached.at < FRESH_MS) return Promise.resolve(cached.data);
  return dedupe(`detail:${boardId}`, async () => {
    const res = await axiosInstance.get(`/board/${boardId}/detail`, { params: { includeLists: false } });
    const board: Board = res.data?.result ?? res.data;
    detailCache.set(boardId, { data: board, at: Date.now() });
    if (board?.name) saveBoardMeta(boardId, { name: board.name, background: board.background });
    return board;
  });
}

export function prefetchBoard(boardId: number) {
  loadBoardLists(boardId).catch(() => {});
  loadBoardDetail(boardId).catch(() => {});
}

export function getCachedBoardLists(boardId: number): BoardList[] | null {
  return listsCache.get(boardId)?.data ?? null;
}

export function getCachedBoardDetail(boardId: number): Board | null {
  return detailCache.get(boardId)?.data ?? null;
}

export function setCachedBoardLists(boardId: number, lists: BoardList[]) {
  const existing = listsCache.get(boardId);
  listsCache.set(boardId, { data: lists, at: existing?.at ?? 0 });
}

export function setCachedBoardDetail(boardId: number, board: Board) {
  const existing = detailCache.get(boardId);
  detailCache.set(boardId, { data: board, at: existing?.at ?? 0 });
}

type StoredMeta = BoardMeta & { id: number };

function readMetaStore(): StoredMeta[] {
  try {
    const raw = localStorage.getItem(META_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getBoardMeta(boardId: number): BoardMeta | null {
  const found = readMetaStore().find((m) => m.id === boardId);
  return found ? { name: found.name, background: found.background } : null;
}

export function saveBoardMeta(boardId: number, meta: BoardMeta) {
  saveBoardsMeta([{ id: boardId, ...meta }]);
}

export function saveBoardsMeta(boards: StoredMeta[]) {
  try {
    const ids = new Set(boards.map((b) => b.id));
    const next = [
      ...boards.map((b) => ({ id: b.id, name: b.name, background: b.background })),
      ...readMetaStore().filter((m) => !ids.has(m.id)),
    ].slice(0, MAX_META);
    localStorage.setItem(META_KEY, JSON.stringify(next));
  } catch {}
}
