"use client";

import { useSyncExternalStore } from "react";
import { useParams } from "next/navigation";
import { getBoardMeta } from "./board-cache";

const DEFAULT_BACKGROUND = "#44546f";
const LIST_CARDS = [[64, 40, 88], [40, 72], [88, 40, 40, 64], [56]];

const noopSubscribe = () => () => {};

function useStoredMeta(boardId: number | null) {
  const background = useSyncExternalStore(
    noopSubscribe,
    () => (boardId ? getBoardMeta(boardId)?.background ?? null : null),
    () => null
  );
  const name = useSyncExternalStore(
    noopSubscribe,
    () => (boardId ? getBoardMeta(boardId)?.name ?? null : null),
    () => null
  );
  return { background, name };
}

export function BoardSkeleton({ background, name }: { background?: string | null; name?: string | null }) {
  const params = useParams<{ id?: string }>();
  const boardId = params?.id ? Number(params.id) : null;
  const stored = useStoredMeta(Number.isFinite(boardId) ? boardId : null);
  const bg = background || stored.background || DEFAULT_BACKGROUND;
  const title = name || stored.name;

  return (
    <div className="h-dvh flex flex-col w-full overflow-hidden" style={{ backgroundColor: bg }} aria-busy="true" aria-label="Loading board">
      <div className="flex items-center justify-between gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-black/20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-9 w-9 rounded-md bg-white/15 shrink-0" />
          {title ? (
            <h1 dir="auto" className="text-base sm:text-lg font-bold text-white truncate">{title}</h1>
          ) : (
            <div className="h-5 w-40 rounded bg-white/25 animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:block h-9 w-64 rounded-md bg-white/15" />
          <div className="hidden sm:flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-white/20 bg-white/20" />
            ))}
          </div>
          <div className="h-8 w-8 md:w-24 rounded-md bg-white/15" />
          <div className="h-8 w-8 md:w-24 rounded-md bg-white/15" />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-3 pt-3 pb-20 sm:p-4 sm:pb-24">
        <div className="flex gap-3 sm:gap-4 h-full items-start">
          {LIST_CARDS.map((cards, li) => (
            <div
              key={li}
              className="w-[85vw] max-w-[320px] sm:w-72 shrink-0 rounded-xl bg-[#101204]/90 p-2 space-y-2"
            >
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="h-4 rounded bg-white/15 animate-pulse" style={{ width: `${40 + li * 12}%` }} />
                <div className="h-4 w-6 rounded bg-white/10" />
              </div>
              {cards.map((height, ci) => (
                <div key={ci} className="rounded-lg bg-[#22272b] p-3 space-y-2" style={{ minHeight: height }}>
                  <div className="h-3 rounded bg-white/10 animate-pulse" style={{ width: `${85 - ((li + ci) % 3) * 20}%` }} />
                  {height > 50 && <div className="h-3 w-1/2 rounded bg-white/10 animate-pulse" />}
                </div>
              ))}
              <div className="h-8 rounded-lg bg-white/5" />
            </div>
          ))}
          <div className="w-[85vw] max-w-[320px] sm:w-72 shrink-0 h-12 rounded-xl bg-white/20" />
        </div>
      </div>

      <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-6 left-1/2 -translate-x-1/2 h-12 w-72 sm:w-[26rem] max-w-[calc(100vw-1rem)] rounded-full bg-white/80 dark:bg-[#1d2125]/80 shadow-xl" />
    </div>
  );
}
