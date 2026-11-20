"use client";

import { Fragment } from "react";
import { CalendarDays, Columns3, Layers2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BoardView, BoardBottomMenuProps } from "@/types/boards"

export type { BoardView } from "@/types/boards"

const menuItems: { id: BoardView; label: string; shortLabel?: string; icon: React.ComponentType<{ className?: string }>; separated?: boolean }[] = [
  { id: "planner", label: "Planner", icon: CalendarDays },
  { id: "board", label: "Board", icon: Columns3 },
  { id: "switch", label: "Switch boards", shortLabel: "Switch", icon: Layers2, separated: true },
];

export function BoardBottomMenu({ activeView, onViewChange }: BoardBottomMenuProps) {
  return (
    <div className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-5 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-1rem)]">
      <nav className="flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1d2125]/95 p-1 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <Fragment key={item.id}>
              {item.separated && <span className="mx-1 h-6 w-px shrink-0 bg-white/15" aria-hidden />}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-col sm:flex-row items-center gap-0.5 sm:gap-2 rounded-lg px-3 py-1.5 sm:py-2 text-[10px] leading-none sm:text-sm font-semibold whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-[#1c2b41] text-[#579dff]"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="sm:hidden">{item.shortLabel ?? item.label}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#579dff]" aria-hidden />
                )}
              </button>
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}
