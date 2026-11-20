"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { DateRange } from "react-day-picker";
import { AlertCircle, CalendarClock, CalendarDays, CalendarX, ChevronDown, Clock, Filter, Search, Tag, UserRound, UserX, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay } from "@/lib/date";
import { useAvatar } from "@/context/AvatarContext";
import { normalizeSearchText } from "@/lib/search";
import type { BoardLabel, BoardMember } from "@/types/kanban";
import { countActiveFilters, EMPTY_FILTERS, type BoardFilters } from "./board-filter-utils";

interface BoardFilterProps {
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  labels: BoardLabel[];
  members: BoardMember[];
  matchCount: number;
  totalCount: number;
}

const CHECKBOX_CLASS = "border-gray-500 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white";

function FilterOption({ checked, onToggle, children }: { checked: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <label className="flex min-h-9 cursor-pointer items-center gap-3 rounded px-1.5 py-1 hover:bg-white/5">
      <Checkbox checked={checked} onCheckedChange={onToggle} className={CHECKBOX_CLASS} />
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-300">{children}</div>
    </label>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="mb-1 mt-4 text-xs font-semibold text-gray-400 first:mt-0">{children}</div>;
}

export function BoardFilter({ filters, onChange, labels, members, matchCount, totalCount }: BoardFilterProps) {
  const { getAvatarUrl } = useAvatar();
  const [memberSearch, setMemberSearch] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const activeCount = countActiveFilters(filters);

  const set = <K extends keyof BoardFilters>(key: K, value: BoardFilters[K]) => onChange({ ...filters, [key]: value });
  const toggle = (key: { [K in keyof BoardFilters]: BoardFilters[K] extends boolean ? K : never }[keyof BoardFilters]) =>
    set(key, !filters[key]);
  const toggleId = (key: "memberIds" | "labelIds", id: number) =>
    set(key, filters[key].includes(id) ? filters[key].filter((x) => x !== id) : [...filters[key], id]);

  const toggleDueRange = () => {
    if (filters.dueRange) {
      set("dueRange", null);
      setDatePickerOpen(false);
    } else {
      set("dueRange", { from: new Date() });
      setDatePickerOpen(true);
    }
  };

  const dueRangeLabel = filters.dueRange
    ? !filters.dueRange.to || isSameDay(filters.dueRange.from, filters.dueRange.to)
      ? format(filters.dueRange.from, "EEE, MMM d")
      : `${format(filters.dueRange.from, "MMM d")} – ${format(filters.dueRange.to, "MMM d")}`
    : null;

  const visibleMembers = useMemo(() => {
    const q = normalizeSearchText(memberSearch);
    if (!q) return members;
    return members.filter((m) =>
      normalizeSearchText(`${m.firstName ?? ""} ${m.lastName ?? ""} ${m.username ?? ""} ${m.email}`).includes(q)
    );
  }, [members, memberSearch]);

  return (
    <div className="flex items-center">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "text-white hover:bg-white/20 px-2 xl:px-3",
              activeCount > 0 && "bg-white/25 hover:bg-white/30",
              activeCount > 0 ? "rounded-r-none" : ""
            )}
            title="Filter cards"
          >
            <Filter className="w-4 h-4 xl:mr-2" />
            <span className="hidden xl:inline">Filter</span>
            {activeCount > 0 && (
              <span className="ml-1.5 rounded-full bg-white px-1.5 text-xs font-semibold text-gray-900 tabular-nums">
                {matchCount}/{totalCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="flex max-h-[min(80dvh,var(--radix-popover-content-available-height))] w-[min(340px,calc(100vw-16px))] flex-col overflow-hidden border-[#3d4449] bg-[#282e33] p-0 text-gray-200"
        >
          <div className="flex items-center border-b border-[#3d4449] px-3 py-2.5">
            <span className="flex-1 text-center text-sm font-semibold text-gray-300">Filter</span>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3">
            <SectionTitle>Keyword</SectionTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                value={filters.keyword}
                onChange={(e) => set("keyword", e.target.value)}
                placeholder="Enter a keyword..."
                dir="auto"
                className="h-9 border-[#3d4449] bg-[#1d2125] pl-8 text-gray-200 placeholder:text-gray-500"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Search cards, members, and labels.</p>

            <SectionTitle>Members</SectionTitle>
            <FilterOption checked={filters.noMembers} onToggle={() => toggle("noMembers")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d4449]"><UserX className="h-3.5 w-3.5" /></span>
              No members
            </FilterOption>
            <FilterOption checked={filters.assignedToMe} onToggle={() => toggle("assignedToMe")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d4449]"><UserRound className="h-3.5 w-3.5" /></span>
              Cards assigned to me
            </FilterOption>
            {members.length > 6 && (
              <div className="relative my-1">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  dir="auto"
                  className="h-8 border-[#3d4449] bg-[#1d2125] pl-8 text-sm text-gray-200 placeholder:text-gray-500"
                />
              </div>
            )}
            <div className="max-h-52 overflow-y-auto overscroll-contain">
              {visibleMembers.map((member) => {
                const name = `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() || member.username || member.email;
                const avatarUrl = member.avatarId ? getAvatarUrl(member.avatarId) : null;
                return (
                  <FilterOption
                    key={member.userId}
                    checked={filters.memberIds.includes(member.userId)}
                    onToggle={() => toggleId("memberIds", member.userId)}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      {avatarUrl && <AvatarImage src={avatarUrl} className="object-cover" />}
                      <AvatarFallback className="bg-blue-600 text-[10px] text-white">
                        {((member.firstName?.[0] ?? "") + (member.lastName?.[0] ?? "")).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span dir="auto" className="truncate">{name}</span>
                    {member.username && <span className="truncate text-xs text-gray-500">@{member.username}</span>}
                  </FilterOption>
                );
              })}
              {visibleMembers.length === 0 && <div className="px-1.5 py-2 text-xs text-gray-500">No members found</div>}
            </div>

            <SectionTitle>Card status</SectionTitle>
            <FilterOption checked={filters.complete} onToggle={() => toggle("complete")}>Marked as complete</FilterOption>
            <FilterOption checked={filters.incomplete} onToggle={() => toggle("incomplete")}>Not marked as complete</FilterOption>

            <SectionTitle>Due date</SectionTitle>
            <FilterOption checked={filters.noDates} onToggle={() => toggle("noDates")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d4449]"><CalendarX className="h-3.5 w-3.5" /></span>
              No dates
            </FilterOption>
            <FilterOption checked={filters.overdue} onToggle={() => toggle("overdue")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-600"><AlertCircle className="h-3.5 w-3.5 text-white" /></span>
              Overdue
            </FilterOption>
            <FilterOption checked={filters.dueNextDay} onToggle={() => toggle("dueNextDay")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-600"><Clock className="h-3.5 w-3.5 text-white" /></span>
              Due in the next day
            </FilterOption>
            <FilterOption checked={filters.dueNextWeek} onToggle={() => toggle("dueNextWeek")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d4449]"><CalendarClock className="h-3.5 w-3.5" /></span>
              Due in the next week
            </FilterOption>
            <FilterOption checked={filters.dueNextMonth} onToggle={() => toggle("dueNextMonth")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d4449]"><CalendarClock className="h-3.5 w-3.5" /></span>
              Due in the next month
            </FilterOption>
            <FilterOption checked={!!filters.dueRange} onToggle={toggleDueRange}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-600"><CalendarDays className="h-3.5 w-3.5 text-white" /></span>
              <span className="shrink-0">Specific date</span>
              {dueRangeLabel && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setDatePickerOpen((v) => !v);
                  }}
                  className="ml-auto flex min-w-0 items-center gap-1 rounded bg-[#1d2125] px-2 py-1 text-xs text-gray-200 hover:bg-[#3d4449]"
                >
                  <span className="truncate">{dueRangeLabel}</span>
                  <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform", datePickerOpen && "rotate-180")} />
                </button>
              )}
            </FilterOption>
            {filters.dueRange && datePickerOpen && (
              <div className="mt-1 flex flex-col items-center rounded-md border border-[#3d4449] bg-[#1d2125] pb-2">
                <Calendar
                  mode="range"
                  selected={{ from: filters.dueRange.from, to: filters.dueRange.to }}
                  defaultMonth={filters.dueRange.from}
                  onSelect={(range: DateRange | undefined) => {
                    if (range?.from) set("dueRange", { from: range.from, to: range.to });
                  }}
                  className="bg-transparent text-gray-300"
                />
                <p className="px-3 text-center text-xs text-gray-500">Pick one day, or two days for a range.</p>
              </div>
            )}

            <SectionTitle>Labels</SectionTitle>
            <FilterOption checked={filters.noLabels} onToggle={() => toggle("noLabels")}>
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3d4449]"><Tag className="h-3.5 w-3.5" /></span>
              No labels
            </FilterOption>
            {labels.map((label) => (
              <FilterOption key={label.id} checked={filters.labelIds.includes(label.id)} onToggle={() => toggleId("labelIds", label.id)}>
                <span
                  dir="auto"
                  className="flex h-8 min-w-0 flex-1 items-center truncate rounded px-3 text-sm font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              </FilterOption>
            ))}
          </div>

          {activeCount > 0 && (
            <div className="flex items-center justify-between gap-2 border-t border-[#3d4449] px-3 py-2">
              <span className="text-xs text-gray-400">
                {matchCount} of {totalCount} cards match
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-gray-300 hover:bg-white/10 hover:text-white"
                onClick={() => onChange(EMPTY_FILTERS)}
              >
                Clear all
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="rounded-l-none bg-white/25 px-1.5 text-white hover:bg-white/30"
          onClick={() => onChange(EMPTY_FILTERS)}
          title="Clear filters"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
