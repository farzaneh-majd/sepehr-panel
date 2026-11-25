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
    <div className="shrink-0 border-b border-[#dfe1e6] bg-white px-3 sm:px-6">
      <nav className="flex items-center gap-1 overflow-x-auto" aria-label="Board views">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <Fragment key={item.id}>
              {item.separated && <span className="mx-1 h-6 w-px shrink-0 bg-[#dfe1e6]" aria-hidden />}
              <button
                type="button"
                onClick={() => onViewChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-12 items-center gap-2 whitespace-nowrap px-3 text-[15px] font-medium transition-colors",
                  isActive
                    ? "text-[#0c66e4]"
                    : "text-[#44546f] hover:bg-[#091e420f] hover:text-[#172b4d]"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-[#0c66e4]" aria-hidden />
                )}
              </button>
            </Fragment>
          );
        })}
      </nav>
    </div>
  );
}
