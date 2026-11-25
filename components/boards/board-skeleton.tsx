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
  const accent = background || stored.background || DEFAULT_BACKGROUND;
  const title = name || stored.name;

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#f4f5f7]" aria-busy="true" aria-label="Loading board">
      <div className="flex items-center justify-between gap-2 border-t-4 border-b border-[#dfe1e6] bg-white px-2 py-2 shadow-sm sm:px-5" style={{ borderTopColor: accent }}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="h-9 w-9 shrink-0 rounded-md bg-[#dfe1e6]" />
          {title ? (
            <h1 dir="auto" className="truncate text-base font-semibold text-[#172b4d] sm:text-lg">{title}</h1>
          ) : (
            <div className="h-5 w-40 animate-pulse rounded bg-[#dfe1e6]" />
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden h-9 w-64 rounded-md bg-[#f1f2f4] md:block" />
          <div className="hidden sm:flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 w-8 rounded-full border-2 border-white bg-[#dfe1e6]" />
            ))}
          </div>
          <div className="h-8 w-8 rounded-md bg-[#dfe1e6] md:w-24" />
          <div className="h-8 w-8 rounded-md bg-[#dfe1e6] md:w-24" />
        </div>
      </div>

      <div className="h-11 shrink-0 border-b border-[#dfe1e6] bg-white" />
      <div className="flex-1 min-h-0 overflow-hidden px-3 py-4 sm:px-6 sm:py-5">
        <div className="flex gap-3 sm:gap-4 h-full items-start">
          {LIST_CARDS.map((cards, li) => (
            <div
              key={li}
              className="w-[85vw] max-w-[320px] shrink-0 space-y-2 rounded-lg border border-[#dfe1e6] bg-[#f1f2f4] p-2 sm:w-72"
            >
              <div className="flex items-center justify-between px-1 py-1.5">
                <div className="h-4 animate-pulse rounded bg-[#dfe1e6]" style={{ width: `${40 + li * 12}%` }} />
                <div className="h-4 w-6 rounded bg-[#dfe1e6]" />
              </div>
              {cards.map((height, ci) => (
                <div key={ci} className="space-y-2 rounded-md border border-[#dfe1e6] bg-white p-3" style={{ minHeight: height }}>
                  <div className="h-3 animate-pulse rounded bg-[#dfe1e6]" style={{ width: `${85 - ((li + ci) % 3) * 20}%` }} />
                  {height > 50 && <div className="h-3 w-1/2 animate-pulse rounded bg-[#f1f2f4]" />}
                </div>
              ))}
              <div className="h-8 rounded-md bg-[#dfe1e6]" />
            </div>
          ))}
          <div className="h-12 w-[85vw] max-w-[320px] shrink-0 rounded-lg border border-dashed border-[#8590a2] bg-[#ebecf0] sm:w-72" />
        </div>
      </div>
    </div>
  );
}
