"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function LabelTooltip({ name, children }: { name: string | null; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="rounded-[3px] bg-[#dcdfe4] px-2 py-0.5 text-[13px] text-[#1d2125] [&>span]:hidden"
      >
        {name || "Unnamed label"}
      </TooltipContent>
    </Tooltip>
  );
}
