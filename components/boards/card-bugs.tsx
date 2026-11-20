"use client";

import { useEffect, useMemo, useState } from "react";
import { isAxiosError } from "axios";
import { Bug, LayoutGrid, List, Plus, Search, Users } from "lucide-react";
import axiosInstance from "@/lib/axios-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BUG_STATUSES, BUG_TEAMS } from "@/types/boards";
import type { CardBugsProps } from "@/types/boards";
import type { BugAction, BugFormValues, BugStatus, CardBug } from "@/types/kanban";
import { MemberAvatar } from "./member-avatar";
import { BugDialog, BugReasonDialog, BugResolutionDialog } from "./bug-dialog";
import {
  BUG_SEVERITY_STYLES,
  BUG_STATUS_STYLES,
  bugCode,
  bugToFormValues,
  filterBugs,
  personName,
  resolveDropAction,
} from "./bug-utils";

const ALL_TEAMS = "all";
const fieldClass = "bg-[#1d2125] border-[#3d4449] text-gray-200 placeholder:text-gray-500";

function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  return (isAxiosError(error) && error.response?.data?.message) || fallback;
}

function BugCardTile({
  bug,
  onOpen,
}: {
  bug: CardBug;
  onOpen: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData("text/plain", String(bug.id))}
      onClick={onOpen}
      className="cursor-pointer rounded-lg border border-[#3d4449] bg-[#22272b] p-2.5 transition-colors hover:border-blue-500/60 hover:bg-[#2c3339]"
    >
      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500">
        <span className="truncate">{bugCode(bug.id)} · {bug.team ?? "Unassigned"}</span>
        {bug.priority && <span className="shrink-0 rounded bg-white/10 px-1 text-gray-300">{bug.priority}</span>}
      </div>
      <p dir="auto" className="mt-1.5 line-clamp-3 text-sm text-gray-200">{bug.title}</p>
      {bug.resolution && (
        <span className="mt-1.5 inline-block rounded bg-green-500/20 px-1.5 py-0.5 text-[11px] text-green-300">
          {bug.resolution}
        </span>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
        <span className={`rounded px-1.5 py-0.5 ${BUG_SEVERITY_STYLES[bug.severity]}`}>{bug.severity}</span>
        {bug.assigneeTeam ? (
          <span className="flex min-w-0 items-center gap-1 text-gray-400">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{bug.assigneeTeam} Team</span>
          </span>
        ) : bug.assigneeId ? (
          <span className="flex min-w-0 items-center gap-1 text-gray-400">
            <MemberAvatar
              member={{ firstName: bug.assigneeFirstName, lastName: bug.assigneeLastName, avatarId: bug.assigneeAvatarId }}
              className="h-5 w-5 shrink-0"
              fallbackClassName="bg-gradient-to-br from-blue-500 to-purple-500 text-[9px] text-white"
            />
            <span dir="auto" className="truncate">{personName(bug.assigneeFirstName, bug.assigneeLastName)}</span>
          </span>
        ) : (
          <span className="text-gray-500">Unassigned</span>
        )}
      </div>
    </div>
  );
}

export function CardBugs({ cardId, boardMembers, onBugsChange, onActivityChange }: CardBugsProps) {
  const [bugs, setBugs] = useState<CardBug[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState(ALL_TEAMS);
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [activeBug, setActiveBug] = useState<CardBug | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState<{ bug: CardBug; action: "close" | "reopen" } | null>(null);
  const [dragOver, setDragOver] = useState<BugStatus | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get(`/card/${cardId}/bugs`)
      .then((res) => {
        if (cancelled) return;
        const data = res.data?.result ?? res.data;
        setBugs(Array.isArray(data) ? data : []);
        setLoaded(true);
      })
      .catch((error) => {
        if (!cancelled) console.error("Error fetching bugs:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [cardId]);

  useEffect(() => {
    if (loaded) onBugsChange?.(bugs);
  }, [bugs, loaded, onBugsChange]);

  const filtered = useMemo(
    () => filterBugs(bugs, search, team === ALL_TEAMS ? "" : team),
    [bugs, search, team]
  );

  const applyBug = (updated: CardBug) => {
    setBugs((prev) =>
      prev.some((b) => b.id === updated.id) ? prev.map((b) => (b.id === updated.id ? updated : b)) : [...prev, updated]
    );
    setActiveBug((prev) => (prev && prev.id === updated.id ? updated : prev));
  };

  const openBug = (bug: CardBug) => {
    setNotice("");
    setActiveBug(bug);
    setDialogOpen(true);
    axiosInstance
      .get(`/bug/${bug.id}`)
      .then((res) => {
        const detail: CardBug | undefined = res.data?.result ?? res.data;
        if (detail) applyBug(detail);
      })
      .catch((error) => console.error("Error fetching bug:", error));
  };

  const openCreate = () => {
    setNotice("");
    setActiveBug(null);
    setDialogOpen(true);
  };

  const submitBug = async (values: BugFormValues, files: File[]): Promise<string | null> => {
    let saved: CardBug | undefined;
    const unchanged = !!activeBug && JSON.stringify(values) === JSON.stringify(bugToFormValues(activeBug, null));
    try {
      if (unchanged) {
        saved = activeBug!;
      } else {
        const res = activeBug
          ? await axiosInstance.put(`/bug/${activeBug.id}`, values)
          : await axiosInstance.post(`/card/${cardId}/bugs`, values);
        saved = res.data?.result ?? res.data;
      }
    } catch (error) {
      return errorMessage(error, "Failed to save the bug. Please try again.");
    }
    if (!saved) return null;
    applyBug(saved);
    setActiveBug(saved);

    const failures: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await axiosInstance.post(`/bug/${saved.id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (error) {
        failures.push(`${file.name}: ${errorMessage(error, "Upload failed")}`);
      }
    }
    if (files.length > 0) {
      try {
        const res = await axiosInstance.get(`/bug/${saved.id}`);
        const detail: CardBug | undefined = res.data?.result ?? res.data;
        if (detail) applyBug(detail);
      } catch (error) {
        console.error("Error fetching bug:", error);
      }
    }
    onActivityChange?.();
    return failures.length > 0 ? `The bug was saved, but some files could not be uploaded. ${failures.join(" — ")}` : null;
  };

  const deleteAttachment = async (bug: CardBug, attachmentId: number): Promise<string | null> => {
    try {
      await axiosInstance.delete(`/bug/${bug.id}/attachments/${attachmentId}`);
      const res = await axiosInstance.get(`/bug/${bug.id}`);
      const detail: CardBug | undefined = res.data?.result ?? res.data;
      if (detail) applyBug(detail);
      onActivityChange?.();
      return null;
    } catch (error) {
      return errorMessage(error, "Failed to remove the file. Please try again.");
    }
  };

  const runAction = async (bug: CardBug, action: BugAction, extra?: { resolution?: string; reason?: string }) => {
    try {
      const res = await axiosInstance.post(`/bug/${bug.id}/transition`, { action, ...extra });
      const updated: CardBug | undefined = res.data?.result ?? res.data;
      if (updated) applyBug(updated);
      onActivityChange?.();
      return null;
    } catch (error) {
      return errorMessage(error, "Failed to update the bug status. Please try again.");
    }
  };

  const requestAction = async (bug: CardBug, action: BugAction) => {
    if (action === "close" || action === "reopen") {
      setPending({ bug, action });
      return null;
    }
    return runAction(bug, action);
  };

  const handleDrop = (e: React.DragEvent, status: BugStatus) => {
    e.preventDefault();
    setDragOver(null);
    setNotice("");
    const bug = bugs.find((b) => b.id === Number(e.dataTransfer.getData("text/plain")));
    if (!bug || bug.status === status) return;
    const action = resolveDropAction(bug.status, status);
    if (!action) {
      setNotice(`${bugCode(bug.id)} cannot be moved from ${bug.status} to ${status}. Use the workflow actions in Bug Details.`);
      return;
    }
    requestAction(bug, action).then((message) => {
      if (message) setNotice(message);
    });
  };

  const confirmPending = async (extra: { resolution?: string; reason?: string }) => {
    if (!pending) return null;
    const message = await runAction(pending.bug, pending.action, extra);
    if (!message) setPending(null);
    return message;
  };

  const counts = useMemo(
    () => Object.fromEntries(BUG_STATUSES.map((s) => [s, bugs.filter((b) => b.status === s).length])) as Record<BugStatus, number>,
    [bugs]
  );

  return (
    <div className="mb-6">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Bug className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">Bugs</h3>
          {bugs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-gray-300">{bugs.length} bugs</span>
              {BUG_STATUSES.map((s) => (
                <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] ${BUG_STATUS_STYLES[s]}`}>
                  {s}: {counts[s]}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="border-none bg-red-500/20 text-red-300 hover:bg-red-500/30"
          onClick={openCreate}
        >
          <Plus className="mr-1 h-4 w-4" />
          Report Bug
        </Button>
      </div>

      {notice && (
        <div className="mb-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {notice}
        </div>
      )}

      {bugs.length === 0 ? (
        <div className="rounded-lg bg-[#22272b] p-3 text-sm text-gray-500">
          {loaded ? "No bugs reported for this card" : "Loading bugs..."}
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[160px] flex-1">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                dir="auto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bugs..."
                className={`h-8 pl-8 ${fieldClass}`}
              />
            </div>
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className={`h-8 w-[130px] ${fieldClass}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#22272b] border-[#3d4449] text-gray-200">
                <SelectItem value={ALL_TEAMS} className="focus:bg-white/10 focus:text-gray-100">All teams</SelectItem>
                {BUG_TEAMS.map((t) => (
                  <SelectItem key={t} value={t} className="focus:bg-white/10 focus:text-gray-100">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1 rounded-md bg-[#1d2125] p-0.5">
              <button
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${view === "kanban" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:bg-white/10"}`}
                onClick={() => setView("kanban")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Kanban
              </button>
              <button
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${view === "list" ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:bg-white/10"}`}
                onClick={() => setView("list")}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>
          </div>

          {view === "kanban" ? (
            <div className="grid grid-cols-[repeat(4,minmax(200px,1fr))] gap-2 overflow-x-auto pb-1">
              {BUG_STATUSES.map((status) => {
                const laneBugs = filtered.filter((b) => b.status === status);
                return (
                  <div
                    key={status}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(status); }}
                    onDragLeave={() => setDragOver((prev) => (prev === status ? null : prev))}
                    onDrop={(e) => handleDrop(e, status)}
                    className={`min-h-[120px] rounded-lg border p-2 transition-colors ${
                      dragOver === status ? "border-blue-500/60 bg-blue-500/5" : "border-[#3d4449] bg-[#161a1d]"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-300">
                      <span>{status}</span>
                      <span className="rounded-full bg-white/10 px-1.5 text-[11px]">{laneBugs.length}</span>
                    </div>
                    <div className="space-y-2">
                      {laneBugs.length === 0 ? (
                        <div className="py-4 text-center text-xs text-gray-600">No bugs</div>
                      ) : (
                        laneBugs.map((bug) => <BugCardTile key={bug.id} bug={bug} onOpen={() => openBug(bug)} />)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.length === 0 ? (
                <div className="rounded-lg bg-[#22272b] p-3 text-center text-sm text-gray-500">No matching bugs</div>
              ) : (
                filtered.map((bug) => (
                  <div
                    key={bug.id}
                    onClick={() => openBug(bug)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-[#3d4449] bg-[#22272b] p-2.5 transition-colors hover:bg-[#2c3339]"
                  >
                    <span dir="auto" className="min-w-0 truncate text-sm text-gray-200">
                      <b className="text-gray-400">{bugCode(bug.id)}</b> — {bug.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${BUG_SEVERITY_STYLES[bug.severity]}`}>{bug.severity}</span>
                      {bug.resolution && (
                        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[11px] text-green-300">{bug.resolution}</span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-[11px] ${BUG_STATUS_STYLES[bug.status]}`}>{bug.status}</span>
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      <BugDialog
        bug={activeBug}
        isOpen={dialogOpen}
        boardMembers={boardMembers}
        onClose={() => setDialogOpen(false)}
        onSubmit={submitBug}
        onDeleteAttachment={deleteAttachment}
        onAction={requestAction}
      />
      <BugResolutionDialog
        isOpen={pending?.action === "close"}
        onClose={() => setPending(null)}
        onConfirm={(resolution) => confirmPending({ resolution })}
      />
      <BugReasonDialog
        isOpen={pending?.action === "reopen"}
        onClose={() => setPending(null)}
        onConfirm={(reason) => confirmPending({ reason })}
      />
    </div>
  );
}
