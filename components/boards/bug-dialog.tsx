"use client";

import { useMemo, useRef, useState } from "react";
import { Bug, ChevronDown, Download, Paperclip, Trash2, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUser } from "@/context/UserContext";
import axiosInstance from "@/lib/axios-config";
import { format } from "@/lib/date";
import {
  BUG_CLOSE_RESOLUTIONS,
  BUG_EVIDENCE_EXTENSIONS,
  BUG_PRIORITIES,
  BUG_RESOLUTION_INFO,
  BUG_SEVERITIES,
  BUG_TEAMS,
} from "@/types/boards";
import type { BugDialogProps, BugReasonDialogProps, BugResolutionDialogProps } from "@/types/boards";
import type { BugAction, BugAttachment, BugFormValues, BugPriority, BugResolution, BugSeverity, BugTeam } from "@/types/kanban";
import {
  BUG_EXTRA_ACTIONS,
  BUG_PRIMARY_ACTIONS,
  BUG_STATUS_STYLES,
  bugCode,
  bugToFormValues,
  personName,
} from "./bug-utils";
import { FilePreview, formatFileSize } from "./file-preview";

const NONE = "none";
const CUSTOM = "custom";
const fieldClass = "bg-[#1d2125] border-[#3d4449] text-gray-200 placeholder:text-gray-500";
const selectContentClass = "max-h-60 bg-[#22272b] border-[#3d4449] text-gray-200";
const selectItemClass = "focus:bg-white/10 focus:text-gray-100";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[#3d4449] bg-[#22272b] p-4">
      <h3 className="mb-3 text-sm font-medium text-gray-300">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label className="text-xs font-medium text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function ReadOnlyValue({ value, placeholder }: { value?: string | null; placeholder?: string }) {
  return (
    <div
      dir="auto"
      className={`flex min-h-9 cursor-default select-none items-center rounded-md bg-white/5 px-3 py-1.5 text-sm ${value ? "text-gray-300" : "text-gray-500"}`}
    >
      {value || placeholder}
    </div>
  );
}

async function downloadAttachment(attachment: BugAttachment) {
  if (!attachment.fileId) return;
  try {
    const res = await axiosInstance.get(`/files/${attachment.fileId}`, { responseType: "blob" });
    const blob = new Blob([res.data], { type: res.headers["content-type"] as string });
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = attachment.name;
    link.click();
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Download failed:", error);
  }
}

export function BugDialog({ bug, isOpen, boardMembers, onClose, onSubmit, onDeleteAttachment, onAction }: BugDialogProps) {
  const { user } = useUser();
  const currentUserId = user?.id ?? null;
  const isEdit = !!bug;

  const syncKey = isOpen ? `${bug?.id ?? "new"}|${bug?.updatedAt ?? ""}|${bug?.status ?? ""}|${currentUserId}` : "";
  const [syncedKey, setSyncedKey] = useState("");
  const [values, setValues] = useState<BugFormValues>(() => bugToFormValues(bug, currentUserId));
  const [files, setFiles] = useState<File[]>([]);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    if (isOpen) {
      setValues(bugToFormValues(bug, currentUserId));
      setFiles([]);
      setError("");
    }
  }

  const set = <K extends keyof BugFormValues>(key: K, value: BugFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const memberOptions = useMemo(() => {
    const options = new Map<number, string>();
    boardMembers.forEach((m) => options.set(m.userId, personName(m.firstName, m.lastName) || m.email));
    if (user?.id && !options.has(user.id)) {
      options.set(user.id, personName(user.firstName ?? user.first_name, user.lastName ?? user.last_name) || user.email || "Me");
    }
    if (bug?.reporterId && !options.has(bug.reporterId)) {
      options.set(bug.reporterId, personName(bug.reporterFirstName, bug.reporterLastName));
    }
    if (bug?.assigneeId && !options.has(bug.assigneeId)) {
      options.set(bug.assigneeId, personName(bug.assigneeFirstName, bug.assigneeLastName));
    }
    return Array.from(options, ([id, name]) => ({ id, name }));
  }, [boardMembers, user, bug]);

  const assigneeOptions = useMemo(() => {
    const options = new Map<number, string>();
    boardMembers.forEach((m) => options.set(m.userId, personName(m.firstName, m.lastName) || m.email));
    if (bug?.assigneeId && !options.has(bug.assigneeId)) {
      options.set(bug.assigneeId, personName(bug.assigneeFirstName, bug.assigneeLastName));
    }
    return Array.from(options, ([id, name]) => ({ id, name }));
  }, [boardMembers, bug]);

  const isDirty = files.length > 0 || JSON.stringify(values) !== JSON.stringify(bugToFormValues(bug, currentUserId));

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    const rejected = selected.filter((f) => !BUG_EVIDENCE_EXTENSIONS.includes(f.name.split(".").pop()?.toLowerCase() ?? ""));
    const accepted = selected.filter((f) => !rejected.includes(f));
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    setError(rejected.length ? `File format is not allowed: ${rejected.map((f) => f.name).join(", ")}` : "");
  };

  const removeAttachment = async (attachmentId: number) => {
    if (!bug) return;
    const message = await onDeleteAttachment(bug, attachmentId);
    if (message) setError(message);
  };

  const submit = async () => {
    if (!values.title.trim() || !values.stepsToReproduce.trim() || !values.expectedResult.trim() || !values.actualResult.trim()) {
      setError("Title, Steps to Reproduce, Expected Result, and Actual Result are required.");
      return false;
    }
    if (values.reporterName !== null && !values.reporterName.trim()) {
      setError("Enter the reporter name.");
      return false;
    }
    setSaving(true);
    setError("");
    const message = await onSubmit(values, files);
    setSaving(false);
    if (message) {
      setError(message);
      return false;
    }
    setFiles([]);
    return true;
  };

  const handleSave = async () => {
    if (isEdit && !isDirty) {
      onClose();
      return;
    }
    if (await submit()) onClose();
  };

  const handleAction = async (action: BugAction) => {
    if (!bug) return;
    if (isDirty && !(await submit())) return;
    const message = await onAction(bug, action);
    if (message) setError(message);
  };

  const primary = bug ? BUG_PRIMARY_ACTIONS[bug.status] : null;
  const extras = bug ? BUG_EXTRA_ACTIONS[bug.status] : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex flex-col gap-0 w-full max-w-full h-dvh max-h-dvh rounded-none border-0 sm:w-[96vw] sm:max-w-[760px] sm:h-auto sm:max-h-[92dvh] sm:rounded-lg sm:border overflow-hidden p-0 bg-[#1d2125] border-[#3d4449] text-gray-200 shadow-2xl [&>button]:hidden">
        <div className="flex items-center justify-between gap-3 border-b border-[#3d4449] px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Bug className="h-4 w-4 shrink-0 text-red-400" />
            <DialogTitle className="truncate text-base font-semibold text-gray-200">
              {bug ? `${bugCode(bug.id)} — Bug Details` : "Report Bug"}
            </DialogTitle>
            {bug && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${BUG_STATUS_STYLES[bug.status]}`}>{bug.status}</span>
            )}
          </div>
          <button className="rounded-md p-1.5 transition-colors hover:bg-[#3d4449]" onClick={onClose}>
            <X className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        <DialogDescription className="sr-only">Bug report details and workflow</DialogDescription>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-4">
          <Section title="1. Bug Report">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title *" wide>
                <Input
                  dir="auto"
                  value={values.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Summarize the issue clearly"
                  maxLength={500}
                  className={fieldClass}
                />
              </Field>
              <Field label="Steps to Reproduce *" wide>
                <Textarea
                  dir="auto"
                  value={values.stepsToReproduce}
                  onChange={(e) => set("stepsToReproduce", e.target.value)}
                  placeholder={"1. ...\n2. ..."}
                  maxLength={4000}
                  className={`${fieldClass} min-h-[96px]`}
                />
              </Field>
              <Field label="Expected Result *">
                <Textarea
                  dir="auto"
                  value={values.expectedResult}
                  onChange={(e) => set("expectedResult", e.target.value)}
                  maxLength={2000}
                  className={fieldClass}
                />
              </Field>
              <Field label="Actual Result *">
                <Textarea
                  dir="auto"
                  value={values.actualResult}
                  onChange={(e) => set("actualResult", e.target.value)}
                  maxLength={2000}
                  className={fieldClass}
                />
              </Field>
              <Field label="Description (Optional)" wide>
                <Textarea
                  dir="auto"
                  value={values.description}
                  onChange={(e) => set("description", e.target.value)}
                  maxLength={4000}
                  className={fieldClass}
                />
              </Field>
            </div>
          </Section>

          <Section title="2. Classification">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Severity">
                <Select value={values.severity} onValueChange={(v) => set("severity", v as BugSeverity)}>
                  <SelectTrigger className={`w-full ${fieldClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {BUG_SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s} className={selectItemClass}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Priority">
                <Select value={values.priority || NONE} onValueChange={(v) => set("priority", v === NONE ? "" : (v as BugPriority))}>
                  <SelectTrigger className={`w-full ${fieldClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value={NONE} className={selectItemClass}>Not Set</SelectItem>
                    {BUG_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className={selectItemClass}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Environment">
                <Input
                  dir="auto"
                  value={values.environment}
                  onChange={(e) => set("environment", e.target.value)}
                  placeholder="Staging / Chrome / Build"
                  maxLength={500}
                  className={fieldClass}
                />
              </Field>
              <Field label="Responsible Team">
                <Select value={values.team || NONE} onValueChange={(v) => set("team", v === NONE ? "" : (v as BugTeam))}>
                  <SelectTrigger className={`w-full ${fieldClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value={NONE} className={selectItemClass}>Not Set</SelectItem>
                    {BUG_TEAMS.map((t) => (
                      <SelectItem key={t} value={t} className={selectItemClass}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="3. Assignment & Workflow">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reporter">
                <Select
                  value={values.reporterName !== null ? CUSTOM : values.reporterId != null ? String(values.reporterId) : ""}
                  onValueChange={(v) =>
                    setValues((prev) =>
                      v === CUSTOM
                        ? { ...prev, reporterId: null, reporterName: prev.reporterName ?? "" }
                        : { ...prev, reporterId: Number(v), reporterName: null }
                    )
                  }
                >
                  <SelectTrigger className={`w-full ${fieldClass}`}>
                    <SelectValue placeholder="Select reporter" />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    {memberOptions.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)} className={selectItemClass}>
                        <span dir="auto">{m.name}</span>
                      </SelectItem>
                    ))}
                    <SelectSeparator className="bg-[#3d4449]" />
                    <SelectItem value={CUSTOM} className={selectItemClass}>Other (enter a name)...</SelectItem>
                  </SelectContent>
                </Select>
                {values.reporterName !== null && (
                  <Input
                    dir="auto"
                    autoFocus
                    value={values.reporterName}
                    onChange={(e) => set("reporterName", e.target.value)}
                    placeholder="e.g. Client, Support team"
                    maxLength={200}
                    className={fieldClass}
                  />
                )}
              </Field>
              <Field label="Assignee">
                <Select
                  value={values.assigneeId != null ? String(values.assigneeId) : NONE}
                  onValueChange={(v) =>
                    setValues((prev) => ({ ...prev, assigneeId: v === NONE ? null : Number(v), assigneeTeam: "" }))
                  }
                >
                  <SelectTrigger className={`w-full ${fieldClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClass}>
                    <SelectItem value={NONE} className={selectItemClass}>Unassigned</SelectItem>
                    {assigneeOptions.map((m) => (
                      <SelectItem key={m.id} value={String(m.id)} className={selectItemClass}>
                        <span dir="auto">{m.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {bug && (
                <Field label="Current Status" wide>
                  <ReadOnlyValue value={bug.status} />
                </Field>
              )}
            </div>

            {bug && primary && (
              <div className="mt-4 rounded-lg border border-[#3d4449] bg-[#1d2125] p-3">
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-300">Workflow actions</div>
                  <div className="text-xs text-gray-500">Actions depend on the current bug status, not the user role.</div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-blue-600 text-white hover:bg-blue-700"
                    disabled={saving}
                    onClick={() => handleAction(primary.action)}
                  >
                    {primary.label}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="secondary" className="border-none bg-[#22272b] text-gray-300 hover:bg-[#3d4449]">
                        More Actions
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="min-w-[14rem] border-[#3d4449] bg-[#22272b]">
                      {extras.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-gray-500">No additional actions</div>
                      ) : (
                        extras.map((item) => (
                          <DropdownMenuItem
                            key={item.action}
                            onClick={() => handleAction(item.action)}
                            className="text-gray-200 focus:bg-white/10"
                          >
                            {item.label}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}
          </Section>

          <Section title="4. Resolution, Evidence & History">
            <div className="grid gap-3 sm:grid-cols-2">
              {bug && (
                <Field label="Resolution" wide>
                  <ReadOnlyValue value={bug.resolution} placeholder="Set when the bug is closed" />
                </Field>
              )}
              <Field label="Evidence Files" wide>
                <input
                  type="file"
                  multiple
                  accept={BUG_EVIDENCE_EXTENSIONS.map((ext) => `.${ext}`).join(",")}
                  ref={fileInputRef}
                  className="hidden"
                  onChange={addFiles}
                />
                <div className="space-y-1.5">
                  {bug?.attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md bg-[#1d2125] px-2.5 py-1.5 hover:bg-[#2c3339]"
                      onClick={() => setPreviewId(attachment.id)}
                    >
                      <Paperclip className="h-4 w-4 shrink-0 text-gray-500" />
                      <span dir="auto" className="min-w-0 flex-1 truncate text-sm text-gray-200">{attachment.name}</span>
                      {attachment.status && (
                        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] ${BUG_STATUS_STYLES[attachment.status]}`}>
                          {attachment.status}
                        </span>
                      )}
                      {attachment.size ? <span className="shrink-0 text-xs text-gray-500">{formatFileSize(attachment.size)}</span> : null}
                      <button
                        type="button"
                        className="rounded p-1 text-gray-400 hover:bg-[#3d4449] hover:text-white"
                        title="Download"
                        onClick={(e) => { e.stopPropagation(); downloadAttachment(attachment); }}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1 text-gray-400 hover:bg-[#3d4449] hover:text-red-400"
                        title="Remove"
                        onClick={(e) => { e.stopPropagation(); removeAttachment(attachment.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-md bg-blue-500/10 px-2.5 py-1.5">
                      <Paperclip className="h-4 w-4 shrink-0 text-blue-400" />
                      <span dir="auto" className="min-w-0 flex-1 truncate text-sm text-gray-200">{file.name}</span>
                      <span className="text-xs text-blue-300">Will be uploaded on save</span>
                      <button
                        type="button"
                        className="rounded p-1 text-gray-400 hover:bg-[#3d4449] hover:text-red-400"
                        title="Remove"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="border-none bg-[#1d2125] text-gray-300 hover:bg-[#3d4449]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="mr-1 h-4 w-4" />
                    Attach File
                  </Button>
                </div>
              </Field>
              {bug && (
                <Field label="Change History" wide>
                  <div className="space-y-2">
                    {bug.history.length === 0 ? (
                      <div className="text-xs text-gray-500">No history yet</div>
                    ) : (
                      bug.history.map((entry) => (
                        <div key={entry.id} className="text-sm text-gray-300">
                          <div dir="auto">• {entry.message}</div>
                          <div className="ps-3 text-xs text-blue-400">
                            {personName(entry.firstName, entry.lastName)}
                            {entry.createdAt ? ` · ${format(new Date(entry.createdAt), "MMM d, yyyy, hh:mm a")}` : ""}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Field>
              )}
            </div>
          </Section>
        </div>

        {error && (
          <div className="mx-4 mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="flex flex-row-reverse flex-wrap gap-2 border-t border-[#3d4449] bg-[#1d2125] px-4 py-3">
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" disabled={saving} onClick={handleSave}>
            {isEdit ? "Save Changes" : "Report Bug"}
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-400" onClick={onClose}>
            Cancel
          </Button>
        </div>
        <FilePreview
          file={bug?.attachments.find((a) => a.id === previewId) ?? null}
          onClose={() => setPreviewId(null)}
          onDelete={() => {
            if (previewId == null) return;
            removeAttachment(previewId);
            setPreviewId(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function BugResolutionDialog({ isOpen, onClose, onConfirm }: BugResolutionDialogProps) {
  const [resolution, setResolution] = useState<BugResolution | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setResolution(null);
      setError("");
    }
  }

  const confirm = async () => {
    if (!resolution) return;
    setSaving(true);
    const message = await onConfirm(resolution);
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-0 overflow-hidden p-0 bg-[#1d2125] border-[#3d4449] text-gray-200 sm:max-w-md [&>button]:hidden">
        <div className="border-b border-[#3d4449] px-4 py-3">
          <DialogTitle className="text-base font-semibold text-gray-200">Close with Resolution</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-gray-500">
            Choose why this bug is being closed without a fix.
          </DialogDescription>
        </div>
        <div className="max-h-[60dvh] space-y-2 overflow-y-auto p-4">
          {BUG_CLOSE_RESOLUTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                resolution === item ? "border-blue-500 bg-blue-500/10" : "border-[#3d4449] bg-[#22272b] hover:bg-[#2c3339]"
              }`}
              onClick={() => setResolution(item)}
            >
              <div className="text-sm font-medium text-gray-200">{item}</div>
              <div className="text-xs text-gray-400">{BUG_RESOLUTION_INFO[item].meaning}</div>
              <div className="mt-1 text-xs text-gray-500">{BUG_RESOLUTION_INFO[item].example}</div>
            </button>
          ))}
        </div>
        {error && (
          <div className="mx-4 mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div className="flex flex-row-reverse gap-2 border-t border-[#3d4449] px-4 py-3">
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" disabled={!resolution || saving} onClick={confirm}>
            Close Bug
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-400" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BugReasonDialog({ isOpen, onClose, onConfirm }: BugReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [wasOpen, setWasOpen] = useState(false);

  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setReason("");
      setError("");
    }
  }

  const confirm = async () => {
    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }
    setSaving(true);
    const message = await onConfirm(reason.trim());
    setSaving(false);
    if (message) setError(message);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-0 overflow-hidden p-0 bg-[#1d2125] border-[#3d4449] text-gray-200 sm:max-w-md [&>button]:hidden">
        <div className="border-b border-[#3d4449] px-4 py-3">
          <DialogTitle className="text-base font-semibold text-gray-200">Reopen Bug</DialogTitle>
          <DialogDescription className="mt-1 text-xs text-gray-500">
            Enter a reason for reopening the bug or rejecting the fix.
          </DialogDescription>
        </div>
        <div className="p-4">
          <Textarea
            dir="auto"
            autoFocus
            value={reason}
            onChange={(e) => { setReason(e.target.value); setError(""); }}
            placeholder="Reason"
            maxLength={1500}
            className={`${fieldClass} min-h-[96px]`}
          />
        </div>
        {error && (
          <div className="mx-4 mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
        <div className="flex flex-row-reverse gap-2 border-t border-[#3d4449] px-4 py-3">
          <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" disabled={saving} onClick={confirm}>
            Reopen Bug
          </Button>
          <Button size="sm" variant="ghost" className="text-gray-400" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
