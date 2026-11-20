"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, Loader2, X } from "lucide-react";
import axiosInstance from "@/lib/axios-config";
import { format } from "@/lib/date";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { BoardMember } from "@/types/kanban";

type View = "main" | "profile" | "activity";

interface MemberActivity {
  id: number;
  action: string | null;
  createdAt: string | null;
  cardId: number | null;
  cardTitle: string | null;
  listName: string | null;
}

interface MemberProfilePopoverProps {
  member: BoardMember;
  avatarUrl: string | null;
  boardId: number;
  cardCount: number;
  onOpenCard: (cardId: number) => void;
  children: React.ReactNode;
}

const ROLE_LABELS: Record<string, string> = { owner: "Owner", admin: "Admin", member: "Member" };

function fullName(member: BoardMember) {
  return [member.firstName, member.lastName].filter(Boolean).join(" ") || member.email || "Unknown";
}

function initials(member: BoardMember) {
  return ((member.firstName?.[0] || "") + (member.lastName?.[0] || "")).toUpperCase() || "?";
}

function MemberAvatar({ member, avatarUrl, size }: { member: BoardMember; avatarUrl: string | null; size: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {avatarUrl ? <Image src={avatarUrl} alt="" width={size} height={size} className="h-full w-full object-cover" /> : initials(member)}
    </div>
  );
}

export function MemberProfilePopover({ member, avatarUrl, boardId, cardCount, onOpenCard, children }: MemberProfilePopoverProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const [activities, setActivities] = useState<MemberActivity[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = fullName(member);
  const handle = member.username || member.email?.split("@")[0] || "";

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setView("main");
  };

  const showActivity = async () => {
    setView("activity");
    setLoading(true);
    setError(null);
    try {
      const res = await axiosInstance.get(`/board/${boardId}/members/${member.userId}/activity`);
      const data = res.data?.result ?? res.data;
      setActivities(Array.isArray(data) ? data : []);
    } catch {
      setError("Couldn't load activity. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const subHeader = (title: string) => (
    <div className="relative flex h-11 items-center justify-center border-b border-[#3d4449] px-10">
      <button
        type="button"
        onClick={() => setView("main")}
        className="absolute left-2 rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
        aria-label="Back"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="truncate text-sm font-semibold text-gray-300">{title}</span>
      <button
        type="button"
        onClick={() => handleOpenChange(false)}
        className="absolute right-2 rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(340px,calc(100vw-1rem))] overflow-hidden border-[#3d4449] bg-[#282e33] p-0 text-gray-200 shadow-2xl"
      >
        {view === "main" && (
          <>
            <div className="relative flex items-center gap-4 bg-[#579dff] px-4 pb-4 pt-4">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="absolute right-2 top-2 rounded-md p-1.5 text-[#172b4d] hover:bg-black/10"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="translate-y-6 rounded-full ring-4 ring-[#282e33]">
                <MemberAvatar member={member} avatarUrl={avatarUrl} size={88} />
              </div>
              <div className="min-w-0 pe-6">
                <p dir="auto" className="truncate text-lg font-semibold text-[#172b4d]">{name}</p>
                {handle && <p className="truncate text-sm text-[#172b4d]/80">@{handle}</p>}
              </div>
            </div>
            <div className="pb-2 pt-8">
              <button type="button" onClick={() => setView("profile")} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5">
                View profile
              </button>
              <div className="mx-4 my-1 h-px bg-[#3d4449]" />
              <button type="button" onClick={showActivity} className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/5">
                View member&apos;s board activity
              </button>
            </div>
          </>
        )}

        {view === "profile" && (
          <>
            {subHeader("Profile")}
            <div className="flex flex-col items-center gap-3 px-4 py-5 text-center">
              <MemberAvatar member={member} avatarUrl={avatarUrl} size={72} />
              <div className="min-w-0">
                <p dir="auto" className="truncate text-base font-semibold text-gray-100">{name}</p>
                {handle && <p className="truncate text-sm text-gray-400">@{handle}</p>}
              </div>
            </div>
            <dl className="space-y-2 border-t border-[#3d4449] px-4 py-3 text-sm">
              {member.email && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Email</dt>
                  <dd className="truncate text-gray-300" dir="ltr">{member.email}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Board role</dt>
                <dd className="rounded bg-white/10 px-2 py-0.5 text-xs text-gray-200">{ROLE_LABELS[member.role] ?? member.role}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500">Cards on this board</dt>
                <dd className="text-gray-300">{cardCount}</dd>
              </div>
            </dl>
          </>
        )}

        {view === "activity" && (
          <>
            {subHeader("Board activity")}
            <div className="max-h-[min(420px,60dvh)] overflow-y-auto px-2 py-2">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </div>
              ) : error ? (
                <div className="px-2 py-6 text-center text-sm text-red-400">
                  {error}
                  <button type="button" onClick={showActivity} className="mt-2 block w-full text-xs text-gray-400 hover:text-gray-200 hover:underline">
                    Retry
                  </button>
                </div>
              ) : !activities || activities.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No activity on this board yet</p>
              ) : (
                <ul className="space-y-1">
                  {activities.map((activity) => (
                    <li key={activity.id} className="flex gap-3 rounded-md px-2 py-2 hover:bg-white/5">
                      <MemberAvatar member={member} avatarUrl={avatarUrl} size={28} />
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="text-gray-300">
                          <span className="font-medium text-gray-100">{name}</span>{" "}
                          <span dir="auto">{activity.action}</span>
                        </p>
                        {activity.cardId != null && (
                          <button
                            type="button"
                            dir="auto"
                            onClick={() => {
                              handleOpenChange(false);
                              onOpenCard(activity.cardId!);
                            }}
                            className="mt-0.5 block max-w-full truncate text-start text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {activity.cardTitle || "Untitled card"}
                          </button>
                        )}
                        <p className="mt-0.5 text-xs text-gray-500">
                          {activity.createdAt ? format(new Date(activity.createdAt), "MMM d, yyyy, hh:mm a") : ""}
                          {activity.listName && <span dir="auto"> · {activity.listName}</span>}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
