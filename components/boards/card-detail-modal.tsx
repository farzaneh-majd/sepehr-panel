"use client";

import { useState, useEffect, useRef, useMemo, useDeferredValue, ChangeEvent } from "react";
import { normalizeSearchText, searchTokens, matchesTokens } from "@/lib/search";
import { useFileBlob } from "@/context/FileBlobContext";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { LabelTooltip } from "./label-tooltip";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, parseServerDate } from "@/lib/date";
import {
  AlignLeft,
  CheckSquare,
  Calendar as CalendarIcon,
  Paperclip,
  MessageSquare,
  Trash2,
  Plus,
  X,
  ChevronDown,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Reply,
  Move,
  Sidebar,
  Pencil,
  Play,
  Clock,
  Download,
  Link2,
  Search,
} from "lucide-react";
import { MarkdownEditor, MarkdownView } from "./markdown-editor";
import { MemberAvatar } from "./member-avatar";
import { CardBugs } from "./card-bugs";
import { FilePreview } from "./file-preview";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axiosInstance from "@/lib/axios-config";
import type { Card, BoardLabel, Checklist, CardComment, CardActivity, BoardMember, CardMember, BoardList, CardAttachment, CardLink, CardSearchResult, CardBug } from "@/types/kanban";
import type { CardDetailModalProps } from "@/types/boards";

function LinkedCardPreview({
  link,
  onOpen,
  onRemove,
}: {
  link: CardLink;
  onOpen: () => void;
  onRemove: () => void;
}) {
  const checklistTotal = link.checklistItemCount ?? 0;
  const checklistDone = link.checklistItemCheckedCount ?? 0;
  const members = link.members ?? [];

  return (
    <div className="w-full max-w-[280px]">
      <div
        className="cursor-pointer rounded-lg border border-[#3d4449] bg-[#22272b] p-2.5 transition-colors hover:border-gray-500"
        onClick={onOpen}
      >
        <div className="mb-2 inline-flex max-w-full items-center gap-1.5 rounded bg-white/5 px-1.5 py-1">
          <span className="h-5 w-5 shrink-0 rounded" style={{ backgroundColor: link.boardBackground || "#0079bf" }} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-semibold text-gray-300">{link.boardName}</div>
            <div className="truncate text-[10px] text-gray-500">{link.listName}</div>
          </div>
        </div>
        {link.labels.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1">
            {link.labels.map((label) => (
              <LabelTooltip key={label.id} name={label.name}>
                <span className="h-2 w-10 rounded-full" style={{ backgroundColor: label.color }} />
              </LabelTooltip>
            ))}
          </div>
        )}
        <div dir="auto" className={`text-sm text-gray-200 line-clamp-3 ${link.isArchived ? "opacity-60" : ""}`}>
          {link.title}
        </div>
        <div className="mt-2 flex items-center gap-2.5 text-xs text-gray-400">
          {link.hasDescription && <AlignLeft className="h-3.5 w-3.5" />}
          {(link.commentCount ?? 0) > 0 && (
            <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{link.commentCount}</span>
          )}
          {(link.attachmentCount ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" />{link.attachmentCount}</span>
          )}
          {(link.linkedCardCount ?? 0) > 0 && (
            <span className="flex items-center gap-1"><Link2 className="h-3.5 w-3.5" />{link.linkedCardCount}</span>
          )}
          {checklistTotal > 0 && (
            <span className={`flex items-center gap-1 rounded px-1 py-0.5 ${checklistDone === checklistTotal ? "bg-green-600 text-white" : ""}`}>
              <CheckSquare className="h-3.5 w-3.5" />{checklistDone}/{checklistTotal}
            </span>
          )}
          {link.dueDate && (
            <span className={`flex items-center gap-1 rounded px-1 py-0.5 ${link.dueComplete ? "bg-green-600 text-white" : ""}`}>
              <Clock className="h-3.5 w-3.5" />{format(parseServerDate(link.dueDate), "MMM d")}
            </span>
          )}
          {members.length > 0 && (
            <div className="ms-auto flex -space-x-1.5">
              {members.slice(0, 3).map((member) => (
                <MemberAvatar
                  key={member.id}
                  member={member}
                  className="h-6 w-6 border-2 border-[#22272b]"
                  fallbackClassName="bg-gradient-to-br from-blue-500 to-purple-500 text-[10px] text-white"
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="mt-1.5 rounded bg-[#22272b] p-1.5 text-gray-400 hover:bg-[#3d4449] hover:text-gray-200">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="bg-[#22272b] border-[#3d4449]">
          <DropdownMenuItem onClick={onOpen} className="text-gray-200 focus:bg-white/10">
            Open card
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onRemove} className="text-red-400 focus:bg-red-500/10">
            Remove attachment
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function CardDetailModal({
  card,
  boardLabels,
  boardId,
  boardMembers = [],
  lists = [],
  listName = "List",
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onMoveCard,
  onStartTimer,
  onBoardLabelsChange,
  onCountsChange,
  onOpenCard,
  mentionName,
}: CardDetailModalProps) {
  const { getContentType, preloadFile } = useFileBlob();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [savedDescription, setSavedDescription] = useState(card.description || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [descriptionError, setDescriptionError] = useState("");
  const isEditingDescriptionRef = useRef(false);
  isEditingDescriptionRef.current = isEditingDescription;
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [comments, setComments] = useState<CardComment[]>([]);
  const [activities, setActivities] = useState<CardActivity[]>([]);
  const [showActivities, setShowActivities] = useState(true);
  const [attachments, setAttachments] = useState<CardAttachment[]>([]);
  const [cardLinks, setCardLinks] = useState<CardLink[]>([]);
  const [cardBugs, setCardBugs] = useState<CardBug[] | null>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [detailsLoaded, setDetailsLoaded] = useState(false);
  const onCountsChangeRef = useRef(onCountsChange);
  onCountsChangeRef.current = onCountsChange;
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<CardComment | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const commentInputRef = useRef<HTMLInputElement>(null);
  const [showLabels, setShowLabels] = useState(false); // Deprecated state, kept for safety but replaced by Popover
  const [showMembers, setShowMembers] = useState(false); // Deprecated state
  const [cardMembers, setCardMembers] = useState<CardMember[]>(card.members || []);
  const [newChecklistName, setNewChecklistName] = useState("Checklist");
  const [addingChecklist, setAddingChecklist] = useState(false);
  const [copyFromChecklistId, setCopyFromChecklistId] = useState("none");
  const [boardChecklists, setBoardChecklists] = useState<{ id: number; name: string | null; cardId: number | null; cardTitle: string | null; itemCount: number }[]>([]);
  const [loadingBoardChecklists, setLoadingBoardChecklists] = useState(false);
  const [savingChecklist, setSavingChecklist] = useState(false);
  const [cardLabels, setCardLabels] = useState<BoardLabel[]>(card.labels || []);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState(card.listId.toString());
  const [selectedPosition, setSelectedPosition] = useState("1");
  const [showActivity, setShowActivity] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Label Management State
  const [availableLabels, setAvailableLabels] = useState<BoardLabel[]>(boardLabels);
  const [isLabelEditMode, setIsLabelEditMode] = useState(false);
  const [editingLabel, setEditingLabel] = useState<BoardLabel | null>(null);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#61bd4f");
  const [labelSearch, setLabelSearch] = useState("");
  const [labelError, setLabelError] = useState<string | null>(null);
  const [savingLabel, setSavingLabel] = useState(false);
  const isValidLabelColor = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(newLabelColor.trim());
  const [previewAttachment, setPreviewAttachment] = useState<CardAttachment | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isImageFile = (filename: string, url?: string | null, fileId?: number | null) => {
    // Check by extension first
    const nameToCheck = filename.includes('.') ? filename : (url || filename);
    const ext = nameToCheck.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return true;
    // Fallback: check content-type from blob cache
    if (fileId) {
      const ct = getContentType(fileId);
      if (ct && ct.startsWith('image/')) return true;
    }
    return false;
  };

  const getFileIcon = (filename: string, url?: string | null) => {
    const nameToCheck = filename.includes('.') ? filename : (url || filename);
    const ext = nameToCheck.split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return '📕';
    if (['doc', 'docx'].includes(ext)) return '📘';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return '📗';
    if (['ppt', 'pptx'].includes(ext)) return '📙';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    if (['mp4', 'avi', 'mov', 'mkv'].includes(ext)) return '🎬';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
    if (['js', 'ts', 'tsx', 'jsx', 'py', 'cs', 'java', 'html', 'css'].includes(ext)) return '💻';
    if (['json', 'xml', 'yaml', 'yml'].includes(ext)) return '📋';
    if (['txt', 'md'].includes(ext)) return '📄';
    return '📎';
  };

  const getFileExtLabel = (filename: string, url?: string | null) => {
    // Try to get extension from filename first
    if (filename.includes('.')) {
      const ext = filename.split('.').pop() || '';
      if (ext.length <= 5) return ext.toUpperCase(); // valid short extension
    }
    // Try from URL
    if (url) {
      // Remove query params first
      const cleanUrl = url.split('?')[0];
      const ext = cleanUrl.split('.').pop() || '';
      if (ext.length <= 5) return ext.toUpperCase();
    }
    return 'FILE';
  };

  const getDisplayName = (att: CardAttachment) => {
    // If name has no extension, try to add it from URL
    if (att.name.includes('.')) return att.name;
    if (att.url) {
      const ext = att.url.split('.').pop();
      if (ext) return `${att.name}.${ext}`;
    }
    return att.name;
  };

  const getFileUrl = (att: CardAttachment) => {
    // Always use the API endpoint with fileId (same pattern as AvatarContext)
    if (att.fileId) {
      return `/files/${att.fileId}`;
    }
    // Fallback for legacy data without fileId
    return att.url;
  };

  const fetchFileBlob = async (att: CardAttachment): Promise<string | null> => {
    if (!att.fileId) return null;
    try {
      const res = await axiosInstance.get(`/files/${att.fileId}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] as string });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Failed to fetch file:", error);
      return null;
    }
  };

  const handleDownloadAttachment = async (att: CardAttachment) => {
    try {
      const blobUrl = await fetchFileBlob(att);
      if (blobUrl) {
        const link = document.createElement('a');
        link.href = blobUrl;
        const ext = att.url?.split('.').pop() || '';
        link.download = att.name.includes('.') ? att.name : (ext ? `${att.name}.${ext}` : att.name);
        link.click();
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDeleteAttachment = async (attId: number) => {
    try {
      await axiosInstance.delete(`/card/${card.id}/attachments/${attId}`);
      setAttachments(prev => prev.filter(a => a.id !== attId));
    } catch (error) {
      console.error("Delete attachment failed:", error);
    }
  };

  useEffect(() => {
    setAvailableLabels(boardLabels);
  }, [boardLabels]);

  const fetchCardDetails = async () => {
    setDetailsLoaded(false);
    try {
      const [checklistsRes, commentsRes, labelsRes, membersRes, attachmentsRes, cardDetailRes] = await Promise.all([
        axiosInstance.get(`/card/${card.id}/checklists`),
        axiosInstance.get(`/card/${card.id}/comments`),
        axiosInstance.get(`/card/${card.id}/labels`),
        axiosInstance.get(`/card/${card.id}/members`),
        axiosInstance.get(`/card/${card.id}/attachments`),
        axiosInstance.get(`/card/${card.id}`),
      ]);

      setChecklists(checklistsRes.data?.result ?? checklistsRes.data);
      setComments(commentsRes.data?.result ?? commentsRes.data);
      setCardLabels(labelsRes.data?.result ?? labelsRes.data);
      setCardMembers(membersRes.data?.result ?? membersRes.data);
      setAttachments(attachmentsRes.data?.result ?? attachmentsRes.data);
      // Preload ALL attachment blobs so content-type is cached for image detection
      const atts: CardAttachment[] = attachmentsRes.data?.result ?? attachmentsRes.data ?? [];
      atts.forEach(a => { if (a.fileId) preloadFile(a.fileId); });
      
      // Activities come from card detail response
      const cardData = cardDetailRes.data?.result ?? cardDetailRes.data;
      if (cardData?.activities) setActivities(cardData.activities);
      if (cardData) {
        setSavedDescription(cardData.description || "");
        if (!isEditingDescriptionRef.current) setDescription(cardData.description || "");
      }

      try {
        const linksRes = await axiosInstance.get(`/card/${card.id}/links`);
        const linksData = linksRes.data?.result ?? linksRes.data;
        setCardLinks(Array.isArray(linksData) ? linksData : []);
      } catch {
        setCardLinks([]);
      }
      setDetailsLoaded(true);
    } catch (error) {
      console.error("Error fetching card details:", error);
    }
  };

  useEffect(() => {
    if (!detailsLoaded) return;
    const items = checklists.flatMap((cl) => cl.items || []);
    onCountsChangeRef.current?.(card.id, {
      commentCount: comments.length,
      attachmentCount: attachments.length,
      checklistItemCount: items.length,
      checklistItemCheckedCount: items.filter((i) => i.isChecked).length,
      linkedCardCount: cardLinks.length,
      ...(mentionName ? { mentionCount: comments.filter((c) => c.content?.includes(mentionName)).length } : {}),
    });
  }, [detailsLoaded, checklists, comments, attachments, cardLinks, card.id, mentionName]);

  useEffect(() => {
    if (cardBugs === null) return;
    onCountsChangeRef.current?.(card.id, {
      bugCount: cardBugs.length,
      openBugCount: cardBugs.filter((b) => b.status !== "Closed").length,
    });
  }, [cardBugs, card.id]);

  const refreshActivities = async () => {
    try {
      const res = await axiosInstance.get(`/card/${card.id}`);
      const cardData = res.data?.result ?? res.data;
      if (cardData?.activities) setActivities(cardData.activities);
    } catch (error) {
      console.error("Error refreshing activity:", error);
    }
  };

  const linkCandidates = useMemo(
    () =>
      lists.flatMap((list) =>
        list.cards
          .filter((c) => c.id !== card.id && !c.isArchived)
          .map((c) => ({
            result: { id: c.id, title: c.title, boardId: boardId ?? null, boardName: null, listName: list.name } as CardSearchResult,
            id: String(c.id),
            title: normalizeSearchText(c.title),
          }))
      ),
    [lists, card.id, boardId]
  );

  const deferredLinkSearch = useDeferredValue(linkSearch);
  const linkResults = useMemo(() => {
    if (!linkPickerOpen) return [];
    const linkedIds = new Set(cardLinks.map((l) => l.linkedCardId));
    const tokens = searchTokens(deferredLinkSearch);
    const idQuery = tokens.length === 1 ? tokens[0].replace(/^#/, "") : "";
    const matched = linkCandidates.filter(
      (item) => !linkedIds.has(item.result.id) && (tokens.length === 0 || item.id === idQuery || matchesTokens(item.title, tokens))
    );
    return matched.slice(0, 50).map((item) => item.result);
  }, [linkPickerOpen, linkCandidates, cardLinks, deferredLinkSearch]);

  const attachCard = async (target: CardSearchResult) => {
    try {
      const res = await axiosInstance.post(`/card/${card.id}/links`, { linkedCardId: target.id });
      const link = res.data?.result ?? res.data;
      if (link) setCardLinks((prev) => [...prev, link]);
      setLinkPickerOpen(false);
      setLinkSearch("");
    } catch (error) {
      console.error("Error attaching card:", error);
    }
  };

  const detachCard = async (linkId: number) => {
    try {
      await axiosInstance.delete(`/card/${card.id}/links/${linkId}`);
      setCardLinks((prev) => prev.filter((l) => l.id !== linkId));
    } catch (error) {
      console.error("Error removing attached card:", error);
    }
  };

  const memberName = (m: { firstName?: string | null; lastName?: string | null }) =>
    [m.firstName, m.lastName].filter(Boolean).join(" ");

  const mentionCandidates = boardMembers.filter((m) => {
    const name = memberName(m).toLowerCase();
    return name && (!mentionQuery || name.includes(mentionQuery));
  });

  const insertMention = (m: BoardMember) => {
    const lastAt = newComment.lastIndexOf("@");
    const before = newComment.slice(0, lastAt);
    setNewComment(`${before}@${memberName(m)} `);
    setShowMentions(false);
    commentInputRef.current?.focus();
  };

  const mentionPattern = (() => {
    const names = boardMembers
      .map(memberName)
      .filter(Boolean)
      .sort((a, b) => b.length - a.length)
      .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    return names.length ? new RegExp(`(@(?:${names.join("|")}))`, "g") : null;
  })();

  const renderCommentContent = (content: string) =>
    mentionPattern
      ? content.split(mentionPattern).map((part, i) =>
          i % 2 === 1 ? (
            <span key={i} className="text-blue-400 font-medium">{part}</span>
          ) : (
            <span key={i}>{part}</span>
          )
        )
      : content;

  useEffect(() => {
    fetchCardDetails();
    setSelectedListId(card.listId.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const handleTitleSave = () => {
    if (title.trim() && title !== card.title) {
      onUpdate({ title });
    }
    setIsEditingTitle(false);
  };

  const handleDescriptionSave = async () => {
    if (description === savedDescription) {
      setIsEditingDescription(false);
      return;
    }
    setSavingDescription(true);
    setDescriptionError("");
    const ok = await onUpdate({ description });
    setSavingDescription(false);
    if (ok) {
      setSavedDescription(description);
      setIsEditingDescription(false);
    } else {
      setDescriptionError("Failed to save description. Please try again.");
    }
  };

  const handleDescriptionCancel = () => {
    setDescription(savedDescription);
    setDescriptionError("");
    setIsEditingDescription(false);
  };

  const toggleLabel = async (labelId: number) => {
    try {
      const res = await axiosInstance.post(`/card/${card.id}/labels`, { labelId });
      const data = res.data?.result ?? res.data;
      let updatedLabels: BoardLabel[];
      if (data.added) {
        const label = availableLabels.find((l) => l.id === labelId);
        updatedLabels = label ? [...cardLabels, label] : cardLabels;
      } else {
        updatedLabels = cardLabels.filter((l) => l.id !== labelId);
      }
      setCardLabels(updatedLabels);
      onUpdate({ labels: updatedLabels });
    } catch (error) {
      console.error("Error toggling label:", error);
    }
  };

  const toggleMember = async (userId: number) => {
    try {
      const res = await axiosInstance.post(`/card/${card.id}/members`, userId);
      const data = res.data?.result ?? res.data;
      if (data.added) {
        const member = boardMembers.find((m) => m.userId === userId);
        if (member) {
          const newMember = {
            id: member.userId,
            firstName: member.firstName,
            lastName: member.lastName,
            email: member.email,
            avatarUrl: member.avatarUrl,
            avatarId: member.avatarId,
          };
          setCardMembers([...cardMembers, newMember]);
          // Update card in parent to reflect changes on the board
          onUpdate({ members: [...(card.members || []), newMember] });
        }
      } else {
        setCardMembers(cardMembers.filter((m) => m.id !== userId));
        // Update card in parent to reflect changes on the board
        onUpdate({ members: (card.members || []).filter((m) => m.id !== userId) });
      }
    } catch (error) {
      console.error("Error toggling member:", error);
    }
  };

  const renderBoardMembersPicker = () => (
    <>
      <div className="text-xs text-gray-500 mb-2 px-2">Board Members ({boardMembers.length})</div>
      <div className="max-h-[min(20rem,calc(var(--radix-popover-content-available-height)-3rem))] overflow-y-auto overscroll-contain">
        {boardMembers.map((member) => (
          <button
            key={member.userId}
            className="w-full flex items-center gap-2 p-2 hover:bg-[#3d4449] rounded"
            onClick={() => toggleMember(member.userId)}
          >
            <MemberAvatar
              member={member}
              className="w-7 h-7 shrink-0"
              fallbackClassName="bg-blue-600 text-white text-xs"
            />
            <span className="flex-1 min-w-0 truncate text-left text-sm text-gray-300">
              {member.firstName} {member.lastName}
            </span>
            {cardMembers.find((m) => m.id === member.userId) && (
              <span className="text-green-500">✓</span>
            )}
          </button>
        ))}
      </div>
    </>
  );

  const handleChecklistPopoverChange = async (open: boolean) => {
    setAddingChecklist(open);
    if (!open) return;
    setNewChecklistName("Checklist");
    setCopyFromChecklistId("none");
    if (!boardId) return;
    setLoadingBoardChecklists(true);
    try {
      const res = await axiosInstance.get(`/board/${boardId}/checklists`);
      const data = res.data?.result ?? res.data;
      setBoardChecklists(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching board checklists:", error);
      setBoardChecklists([]);
    } finally {
      setLoadingBoardChecklists(false);
    }
  };

  const boardChecklistGroups = boardChecklists.reduce<{ cardId: number | null; cardTitle: string | null; checklists: typeof boardChecklists }[]>((groups, checklist) => {
    const group = groups.find(g => g.cardId === checklist.cardId);
    if (group) group.checklists.push(checklist);
    else groups.push({ cardId: checklist.cardId, cardTitle: checklist.cardTitle, checklists: [checklist] });
    return groups;
  }, []);

  const addChecklist = async () => {
    if (!newChecklistName.trim() || savingChecklist) return;

    setSavingChecklist(true);
    try {
      const res = await axiosInstance.post(`/card/${card.id}/checklists`, {
        name: newChecklistName.trim(),
        copyFromChecklistId: copyFromChecklistId !== "none" ? Number(copyFromChecklistId) : null,
      });
      const newChecklist = res.data?.result ?? res.data;
      setChecklists([...checklists, { ...newChecklist, items: newChecklist.items ?? [] }]);
      setAddingChecklist(false);
    } catch (error) {
      console.error("Error adding checklist:", error);
    } finally {
      setSavingChecklist(false);
    }
  };

  const addChecklistItem = async (checklistId: number, name: string) => {
    try {
      const res = await axiosInstance.post(`/checklist/${checklistId}/items`, { name });
      const newItem = res.data?.result ?? res.data;
      setChecklists(
        checklists.map((cl) =>
          cl.id === checklistId
            ? { ...cl, items: [...cl.items, newItem] }
            : cl
        )
      );
    } catch (error) {
      console.error("Error adding checklist item:", error);
    }
  };

  const toggleChecklistItem = async (itemId: number, isChecked: boolean) => {
    try {
      await axiosInstance.put(`/checklist/items/${itemId}`, { isChecked: !isChecked });
      setChecklists(
        checklists.map((cl) => ({
          ...cl,
          items: cl.items.map((item) =>
            item.id === itemId ? { ...item, isChecked: !isChecked } : item
          ),
        }))
      );
    } catch (error) {
      console.error("Error toggling checklist item:", error);
    }
  };

  const deleteChecklist = async (checklistId: number) => {
    try {
      await axiosInstance.delete(`/checklist/${checklistId}`);
      setChecklists(checklists.filter((cl) => cl.id !== checklistId));
    } catch (error) {
      console.error("Error deleting checklist:", error);
    }
  };

  const deleteChecklistItem = async (itemId: number) => {
    try {
      await axiosInstance.delete(`/checklist/items/${itemId}`);
      setChecklists(prev => prev.map(cl => ({
        ...cl,
        items: cl.items.filter(item => item.id !== itemId)
      })));
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const deleteComment = async (commentId: number) => {
    try {
      await axiosInstance.delete(`/card/${card.id}/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const handleArchiveCard = () => {
    onUpdate({ isArchived: !card.isArchived });
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    const content = replyingTo
      ? `@${memberName(replyingTo)}: ${newComment.trim()}`
      : newComment.trim();

    try {
      const res = await axiosInstance.post(`/card/${card.id}/comments`, { content });
      const comment = res.data?.result ?? res.data;
      setComments([...comments, comment]);
      setNewComment("");
      setReplyingTo(null);
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const getLabelErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.message || error?.response?.data?.title || fallback;

  const handleCreateLabel = async () => {
    const name = newLabelName.trim();
    if (!boardId || !name || !isValidLabelColor || savingLabel) return;
    setSavingLabel(true);
    setLabelError(null);
    try {
      const res = await axiosInstance.post(`/board/${boardId}/labels`, { name, color: newLabelColor.trim() });
      const newLabel = res.data?.result ?? res.data;
      setAvailableLabels(prev => [...prev, newLabel]);
      onBoardLabelsChange?.({ type: "created", label: newLabel });
      setNewLabelName("");
      setIsLabelEditMode(false);
    } catch (error) {
      console.error("Error creating label:", error);
      setLabelError(getLabelErrorMessage(error, "Could not create the label. Please try again."));
    } finally {
      setSavingLabel(false);
    }
  };

  const handleUpdateLabel = async () => {
    const name = newLabelName.trim();
    if (!editingLabel || !name || !isValidLabelColor || savingLabel) return;
    setSavingLabel(true);
    setLabelError(null);
    try {
      const res = await axiosInstance.put(`/labels/${editingLabel.id}`, { name, color: newLabelColor.trim() });
      const updatedLabel = res.data?.result ?? res.data;
      setAvailableLabels(prev => prev.map(l => l.id === updatedLabel.id ? updatedLabel : l));
      setCardLabels(prev => prev.map(l => l.id === updatedLabel.id ? updatedLabel : l));
      onBoardLabelsChange?.({ type: "updated", label: updatedLabel });
      setEditingLabel(null);
      setIsLabelEditMode(false);
      setNewLabelName("");
    } catch (error) {
      console.error("Error updating label:", error);
      setLabelError(getLabelErrorMessage(error, "Could not save the label. Please try again."));
    } finally {
      setSavingLabel(false);
    }
  };

  const handleDeleteLabel = async (labelId: number) => {
    try {
      await axiosInstance.delete(`/labels/${labelId}`);
      setAvailableLabels(availableLabels.filter(l => l.id !== labelId));
      setCardLabels(cardLabels.filter(l => l.id !== labelId));
      onBoardLabelsChange?.({ type: "deleted", labelId });
      if (editingLabel?.id === labelId) {
        setEditingLabel(null);
        setIsLabelEditMode(false);
      }
    } catch (error) {
      console.error("Error deleting label:", error);
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await axiosInstance.post(`/card/${card.id}/attachments`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const newAttachment = res.data?.result ?? res.data;
        setAttachments([...attachments, newAttachment]);
      } catch (error) {
        console.error("Error uploading file:", error);
      }
      // Reset input so same file can be uploaded again
      e.target.value = "";
    }
  };

  const handleMoveCard = () => {
    if (onMoveCard) {
      onMoveCard(card.id, parseInt(selectedListId), parseInt(selectedPosition));
    }
    setShowMoveModal(false);
  };

  const getPositionsForList = (listId: string) => {
    const list = lists.find(l => l.id.toString() === listId);
    if (!list) return [1];
    const count = list.cards?.length || 0;
    return Array.from({ length: count + 1 }, (_, i) => i + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`flex flex-col gap-0 w-full max-w-full h-dvh max-h-dvh rounded-none border-0 overflow-hidden p-0 bg-[#1d2125] border-[#3d4449] shadow-2xl [&>button]:hidden ${
        isFullscreen
          ? "sm:w-screen sm:max-w-none sm:h-dvh sm:max-h-dvh sm:rounded-none sm:border-0"
          : "sm:w-[98vw] sm:max-w-[1000px] sm:h-auto sm:min-h-[85dvh] sm:max-h-[92dvh] sm:rounded-lg sm:border"
      }`}>
        <VisuallyHidden.Root>
          <DialogTitle>Card Details</DialogTitle>
        </VisuallyHidden.Root>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 border-b border-[#3d4449]">
          <button 
            className="flex items-center gap-1 min-w-0 px-2 py-1 text-sm bg-[#22272b] hover:bg-[#3d4449] text-gray-200 rounded-md transition-colors"
            onClick={() => setShowMoveModal(true)}
          >
            <span className="truncate">{listName}</span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>
          <div className="flex items-center gap-0.5">
            <button
              className="p-1.5 hover:bg-[#3d4449] rounded-md transition-colors"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4 text-gray-400" /> : <Maximize2 className="w-4 h-4 text-gray-400" />}
            </button>
            <button 
              className={`p-1.5 hover:bg-[#3d4449] rounded-md transition-colors ${showActivity ? "bg-[#3d4449]" : ""}`}
              onClick={() => setShowActivity(!showActivity)}
              title={showActivity ? "Hide activity" : "Show activity"}
            >
              <Sidebar className={`w-4 h-4 ${showActivity ? "text-blue-400" : "text-gray-400"}`} />
            </button>
            <button 
              className="p-1.5 hover:bg-[#3d4449] rounded-md transition-colors"
              onClick={onClose}
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Move Card Modal */}
        {showMoveModal && (
          <div className="absolute top-12 left-3 sm:left-4 z-50 w-72 max-w-[calc(100%-1.5rem)] p-3 bg-[#22272b] rounded-lg shadow-xl border border-[#3d4449] text-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="flex-1 text-center text-sm font-medium text-gray-300">Move card</span>
              <button
                className="text-gray-400 hover:text-gray-200"
                onClick={() => setShowMoveModal(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex gap-1 p-1 bg-[#1d2125] rounded-md">
                <button className="flex-1 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-gray-200 rounded transition-colors">
                  Inbox
                </button>
                <button className="flex-1 py-1.5 text-sm bg-blue-500/20 text-blue-400 rounded">
                  Board
                </button>
              </div>

              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Select destination
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-400">List</label>
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger className="w-full h-9 bg-[#1d2125] border-[#3d4449] text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-[#22272b] border-[#3d4449] text-gray-200">
                      {lists.map((list) => (
                        <SelectItem key={list.id} value={list.id.toString()} className="focus:bg-white/10 focus:text-gray-100">
                          <span dir="auto" className="truncate">{list.name}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-0">
                  <label className="text-xs font-medium text-gray-400">Position</label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger className="w-full h-9 bg-[#1d2125] border-[#3d4449] text-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 bg-[#22272b] border-[#3d4449] text-gray-200">
                      {getPositionsForList(selectedListId).map((pos) => (
                        <SelectItem key={pos} value={pos.toString()} className="focus:bg-white/10 focus:text-gray-100">
                          {pos}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                size="sm"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleMoveCard}
              >
                <Move className="w-4 h-4 mr-1" />
                Move
              </Button>
            </div>
          </div>
        )}



        {/* Main Content - Two Columns */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
          {/* Left Column - Details */}
          <div className="shrink-0 md:shrink md:flex-1 min-w-0 px-4 sm:px-6 md:px-8 pb-6 md:overflow-y-auto">
            {/* Title */}
            <div className="py-4 flex items-start gap-3">
              <div className="mt-1">
                <Checkbox 
                  className="w-5 h-5 rounded-full border-gray-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-none" 
                  checked={card.dueComplete}
                  onCheckedChange={(checked) => onUpdate({ dueComplete: !!checked })}
                />
              </div>
              <div className="flex-1">
                {isEditingTitle ? (
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onBlur={handleTitleSave}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSave();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    dir="auto"
                    className="text-xl font-semibold bg-[#22272b] border-[#3d4449] text-gray-200"
                  />
                ) : (
                  <h1
                    dir="auto"
                    className="text-xl font-semibold text-gray-100 cursor-pointer hover:bg-[#22272b] px-2 py-1 -mx-2 -my-1 rounded"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {title}
                  </h1>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  <span>Created by {card.createdByName || "Unknown"}</span>
                  {card.updatedByName && (
                    <span className="ml-2">/ Last modified by {card.updatedByName}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pb-6 flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Popover modal>
                  <PopoverTrigger asChild>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2 bg-[#22272b] border-[#3d4449] z-50" align="start">
                    {renderBoardMembersPicker()}
                  </PopoverContent>
                </Popover>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="secondary" size="sm" className="bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none">
                    <CalendarIcon className="w-4 h-4 mr-1" />
                    {card.dueDate ? format(parseServerDate(card.dueDate), "MMM d") : "Dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-[#22272b] border-[#3d4449] z-50" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={card.dueDate ? parseServerDate(card.dueDate) : undefined}
                    onSelect={(date: Date | undefined) => onUpdate({ dueDate: date ? date.toISOString() : null })}
                    initialFocus
                    className="text-gray-300 bg-[#1d2125]"
                  />
                  {card.dueDate && (
                    <div className="p-2 border-t border-[#3d4449] bg-[#1d2125]">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full bg-[#22272b] hover:bg-red-500/20 text-red-400 border-none"
                        onClick={() => onUpdate({ dueDate: null })}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove date
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Popover modal open={addingChecklist} onOpenChange={handleChecklistPopoverChange}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none"
                  >
                    <CheckSquare className="w-4 h-4 mr-1" />
                    Checklist
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 bg-[#22272b] border-[#3d4449] text-gray-200" align="start">
                  <div className="flex items-center justify-between mb-3">
                    <span className="flex-1 text-center text-sm font-medium text-gray-300">Add checklist</span>
                    <button className="text-gray-400 hover:text-gray-200" onClick={() => setAddingChecklist(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400">Title</label>
                      <Input
                        value={newChecklistName}
                        onChange={(e) => setNewChecklistName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") addChecklist(); }}
                        onFocus={(e) => e.target.select()}
                        dir="auto"
                        className="h-9 bg-[#1d2125] border-[#3d4449] text-gray-200"
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-400">Copy items from...</label>
                      <Select value={copyFromChecklistId} onValueChange={setCopyFromChecklistId} disabled={loadingBoardChecklists}>
                        <SelectTrigger className="w-full h-9 bg-[#1d2125] border-[#3d4449] text-gray-200">
                          <SelectValue placeholder="(none)" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72 bg-[#22272b] border-[#3d4449] text-gray-200">
                          <SelectItem value="none" className="focus:bg-white/10 focus:text-gray-100">(none)</SelectItem>
                          {boardChecklistGroups.map((group) => (
                            <SelectGroup key={group.cardId ?? "no-card"}>
                              <SelectLabel dir="auto" className="max-w-64 truncate text-xs text-gray-500">{group.cardTitle || "Untitled card"}</SelectLabel>
                              {group.checklists.map((checklist) => (
                                <SelectItem key={checklist.id} value={String(checklist.id)} className="focus:bg-white/10 focus:text-gray-100">
                                  <span dir="auto" className="truncate">{checklist.name || "Checklist"}</span>
                                  <span className="ml-1 text-xs text-gray-500">({checklist.itemCount})</span>
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" size="sm" onClick={addChecklist} disabled={!newChecklistName.trim() || savingChecklist}>
                      {savingChecklist ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button 
                variant="secondary" 
                size="sm" 
                className="bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="w-4 h-4 mr-1" />
                Attachment
              </Button>

              <Popover modal open={linkPickerOpen} onOpenChange={(open) => { setLinkPickerOpen(open); if (!open) setLinkSearch(""); }}>
                <PopoverTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none"
                  >
                    <Link2 className="w-4 h-4 mr-1" />
                    Card
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-2 bg-[#22272b] border-[#3d4449] text-gray-200" align="start">
                  <div className="text-xs font-medium text-gray-400 mb-2 px-1">Attach a card</div>
                  <div className="relative mb-2">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      value={linkSearch}
                      onChange={(e) => setLinkSearch(e.target.value)}
                      placeholder="Search cards on this board..."
                      dir="auto"
                      className="h-9 pl-8 bg-[#1d2125] border-[#3d4449] text-gray-200"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-[min(18rem,calc(var(--radix-popover-content-available-height)-5rem))] overflow-y-auto overscroll-contain space-y-1">
                    {linkResults.length === 0 ? (
                      <div className="px-2 py-3 text-center text-xs text-gray-500">No cards found on this board</div>
                    ) : (
                      linkResults
                        .map((result) => (
                          <button
                            key={result.id}
                            className="w-full rounded px-2 py-1.5 text-left hover:bg-[#3d4449]"
                            onClick={() => attachCard(result)}
                          >
                            <div dir="auto" className="truncate text-sm text-gray-200">{result.title}</div>
                            <div dir="auto" className="truncate text-xs text-gray-500">{result.listName}</div>
                          </button>
                        ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              {/* Start Timer Button */}
              {onStartTimer && card.taskId && (
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border-none"
                  onClick={() => onStartTimer(card)}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start Timer
                </Button>
              )}

              {/* Archive Card */}
              <Button 
                variant="secondary" 
                size="sm" 
                className={card.isArchived ? "bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border-none" : "bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none"}
                onClick={handleArchiveCard}
              >
                {card.isArchived ? "Unarchive" : "Archive"}
              </Button>

              {onDelete && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-red-600/20 hover:bg-red-600/30 text-red-400 border-none"
                  onClick={onDelete}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-8">
            {/* Members */}
            {cardMembers.length > 0 && (
              <div className="mb-6">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Members</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {cardMembers.map((member) => (
                    <MemberAvatar
                      key={member.id}
                      member={member}
                      className="w-8 h-8 border-2 border-[#1d2125] shadow-sm"
                      fallbackClassName="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs"
                    />
                  ))}
                  <Popover modal>
                    <PopoverTrigger asChild>
                      <button 
                        className="w-8 h-8 rounded-full border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-gray-400 hover:bg-[#22272b] transition-colors"
                      >
                        <Plus className="w-4 h-4 text-gray-500" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-[#1d2125] border-[#3d4449] text-gray-200" align="start">
                      {renderBoardMembersPicker()}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {/* Labels */}
            <div className="mb-6">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Labels</div>
              <div className="flex items-center gap-2 flex-wrap">
                {cardLabels.map((label) => (
                  <LabelTooltip key={label.id} name={label.name}>
                    <span
                      className="px-3 py-1 rounded text-sm font-medium text-white cursor-pointer hover:opacity-80"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name || ""}
                    </span>
                  </LabelTooltip>
                ))}
                <Popover modal onOpenChange={(open) => { if (!open) { setIsLabelEditMode(false); setEditingLabel(null); setNewLabelName(""); setNewLabelColor("#61bd4f"); setLabelSearch(""); setLabelError(null); } }}>
                  <PopoverTrigger asChild>
                    <button className="w-8 h-6 rounded border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-gray-400 hover:bg-[#22272b] transition-colors">
                      <Plus className="w-3 h-3 text-gray-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-0 bg-[#1d2125] border-[#3d4449] text-gray-200" align="start">
                    {isLabelEditMode ? (
                      /* ── Create / Edit Label ── */
                      <div className="p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <button onClick={() => { setIsLabelEditMode(false); setEditingLabel(null); setNewLabelName(""); setLabelError(null); }} className="text-gray-400 hover:text-gray-200">
                            <ChevronDown className="rotate-90 w-4 h-4" />
                          </button>
                          <span className="text-sm font-medium">{editingLabel ? "Edit label" : "Create label"}</span>
                          <span className="w-4" />
                        </div>
                        {/* Color preview */}
                        <div className="h-8 rounded flex items-center px-3" style={{ backgroundColor: newLabelColor }}>
                          <span className="text-white font-semibold text-sm">{newLabelName || "Label preview"}</span>
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-1">Title</div>
                          <Input
                            value={newLabelName}
                            onChange={(e) => { setNewLabelName(e.target.value); setLabelError(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editingLabel ? handleUpdateLabel() : handleCreateLabel(); } }}
                            dir="auto"
                            maxLength={50}
                            autoFocus
                            className="bg-[#22272b] border-[#3d4449] h-8 text-gray-200 text-sm"
                            placeholder="Label name..."
                          />
                        </div>
                        <div>
                          <div className="text-xs text-gray-400 mb-2">Color</div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {['#61bd4f','#f2d600','#ff9f1a','#eb5a46','#c377e0','#0079bf','#00c2e0','#51e898','#ff78cb','#344563','#b3bac5','#dfe1e6'].map(color => (
                              <button key={color} className={`h-8 rounded hover:opacity-80 transition-all ${newLabelColor === color ? 'ring-2 ring-white ring-offset-1 ring-offset-[#1d2125]' : ''}`} style={{ backgroundColor: color }} onClick={() => setNewLabelColor(color)} />
                            ))}
                          </div>
                          {/* Custom color */}
                          <div className="flex items-center gap-2 mt-2">
                            <div className="w-8 h-8 rounded border border-[#3d4449] overflow-hidden flex-shrink-0" style={{ backgroundColor: newLabelColor }} />
                            <Input value={newLabelColor} onChange={(e) => { setNewLabelColor(e.target.value); setLabelError(null); }} className={`bg-[#22272b] h-8 text-gray-200 text-xs font-mono ${isValidLabelColor ? "border-[#3d4449]" : "border-red-500"}`} placeholder="#color" />
                          </div>
                          {!isValidLabelColor && (
                            <div className="text-xs text-red-400 mt-1">Enter a valid hex color, e.g. #61bd4f</div>
                          )}
                        </div>
                        {labelError && (
                          <div className="text-xs text-red-400 bg-red-500/10 rounded px-2 py-1.5">{labelError}</div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          {editingLabel && (
                            <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleDeleteLabel(editingLabel.id)}>Delete</Button>
                          )}
                          <Button
                            size="sm"
                            className="h-7 text-xs ml-auto"
                            disabled={!newLabelName.trim() || !isValidLabelColor || savingLabel}
                            onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}
                          >
                            {savingLabel ? "Saving..." : editingLabel ? "Save" : "Create"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      /* ── Label List ── */
                      <div className="p-2 space-y-2">
                        <div className="text-sm font-medium text-center text-gray-300 py-1">Labels</div>
                        {/* Search */}
                        <div className="relative">
                          <Input
                            value={labelSearch}
                            onChange={(e) => setLabelSearch(e.target.value)}
                            placeholder="Search labels..."
                            className="bg-[#22272b] border-[#3d4449] h-8 text-gray-200 text-sm pl-3"
                          />
                        </div>
                        <div className="text-xs text-gray-500 font-medium px-1">Labels</div>
                        {/* Label list with checkboxes */}
                        <div className="space-y-1 max-h-60 overflow-y-auto">
                          {availableLabels
                            .filter(l => !labelSearch || (l.name || "").toLowerCase().includes(labelSearch.toLowerCase()))
                            .map((label) => {
                              const isChecked = !!cardLabels.find(l => l.id === label.id);
                              return (
                                <div key={label.id} className="flex items-center gap-2 group">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleLabel(label.id)}
                                    className="w-4 h-4 rounded accent-blue-500 cursor-pointer flex-shrink-0"
                                  />
                                  <button
                                    className="flex-1 h-8 rounded flex items-center px-3 text-white font-medium text-sm hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: label.color || "#6b7280" }}
                                    onClick={() => toggleLabel(label.id)}
                                  >
                                    {label.name || ""}
                                  </button>
                                  <button
                                    className="p-1 text-gray-400 hover:text-gray-200 hover:bg-[#3d4449] rounded opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 transition-all flex-shrink-0"
                                    onClick={(e) => { e.stopPropagation(); setEditingLabel(label); setNewLabelName(label.name || ""); setNewLabelColor(label.color); setIsLabelEditMode(true); }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                          })}
                          {availableLabels.filter(l => !labelSearch || (l.name || "").toLowerCase().includes(labelSearch.toLowerCase())).length === 0 && (
                            <div className="text-center text-gray-500 text-xs py-3">No labels found</div>
                          )}
                        </div>
                        <div className="border-t border-[#3d4449] pt-2 space-y-1">
                          <Button variant="ghost" className="w-full h-8 text-xs text-gray-300 hover:bg-[#3d4449] justify-center" onClick={() => { setEditingLabel(null); setNewLabelName(""); setNewLabelColor("#61bd4f"); setIsLabelEditMode(true); }}>
                            Create a new label
                          </Button>
                        </div>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            </div>

            <FilePreview
              file={previewAttachment ? { ...previewAttachment, name: getDisplayName(previewAttachment), fileId: previewAttachment.fileId ?? null } : null}
              onClose={() => setPreviewAttachment(null)}
              onDelete={() => {
                if (!previewAttachment) return;
                handleDeleteAttachment(previewAttachment.id);
                setPreviewAttachment(null);
              }}
            />

            {/* Description */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <AlignLeft className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-300">Description</span>
                </div>
                {description && !isEditingDescription && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="bg-[#22272b] hover:bg-[#3d4449] text-gray-300 border-none"
                    onClick={() => setIsEditingDescription(true)}
                  >
                    Edit
                  </Button>
                )}
              </div>
              {isEditingDescription ? (
                <div className="space-y-2">
                  <MarkdownEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Add a more detailed description..."
                    onSubmit={handleDescriptionSave}
                    autoFocus
                  />
                  {descriptionError && (
                    <div className="text-xs text-red-400">{descriptionError}</div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDescriptionSave} disabled={savingDescription}>
                      {savingDescription ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400"
                      onClick={handleDescriptionCancel}
                      disabled={savingDescription}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : description ? (
                <div className="relative">
                  <div className={!showFullDescription ? "max-h-72 overflow-hidden" : ""}>
                    <MarkdownView value={description} />
                  </div>
                  {description.length > 300 && (
                    <button
                      className="flex items-center gap-1 mt-2 text-sm text-gray-500 hover:text-gray-400"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform ${showFullDescription ? "rotate-180" : ""}`} />
                      {showFullDescription ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              ) : (
                <div
                  className="p-3 bg-[#22272b] rounded-lg cursor-pointer hover:bg-[#3d4449] text-gray-500 text-sm"
                  onClick={() => setIsEditingDescription(true)}
                >
                  Add a more detailed description...
                </div>
              )}
            </div>

            {(attachments.length > 0 || cardLinks.length > 0) && (
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <Paperclip className="w-5 h-5 text-gray-400" />
                        <h3 className="text-sm font-medium text-gray-300">Attachments</h3>
                    </div>
                    {cardLinks.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-500 mb-1.5">Cards</div>
                        <div className="flex flex-wrap gap-3">
                          {cardLinks.map((link) => (
                            <LinkedCardPreview
                              key={link.id}
                              link={link}
                              onOpen={() => onOpenCard?.(link.linkedCardId, link.boardId)}
                              onRemove={() => detachCard(link.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {attachments.length > 0 && cardLinks.length > 0 && (
                      <div className="text-xs font-medium text-gray-500 mb-1.5">Files</div>
                    )}
                    <div className="space-y-2">
                        {attachments.map((att) => (
                            <div 
                                key={att.id} 
                                className="flex items-center gap-3 p-2 bg-[#22272b] hover:bg-[#3d4449] rounded cursor-pointer group transition-colors"
                                onClick={() => setPreviewAttachment(att)}
                            >
                                {isImageFile(att.name, att.url, att.fileId) ? (
                                    <div className="h-10 w-16 rounded overflow-hidden border border-gray-700">
                                        <AttachmentThumbnail att={att} />
                                    </div>
                                ) : (
                                    <div className="h-10 w-16 bg-gray-700/50 rounded flex items-center justify-center border border-gray-700">
                                        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                                            {getFileExtLabel(att.name, att.url) || 'FILE'}
                                        </span>
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm text-gray-200 font-medium truncate">{getDisplayName(att)}</div>
                                    <div className="text-xs text-gray-500">
                                        Added {format(new Date(att.createdAt), "MMM d, yyyy")}
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDownloadAttachment(att); }} title="Download">
                                        <Download className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-400 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleDeleteAttachment(att.id); }} title="Delete">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <CardBugs
              cardId={card.id}
              boardMembers={boardMembers}
              onBugsChange={setCardBugs}
              onActivityChange={refreshActivities}
            />

            {/* Checklists */}
            {checklists.map((checklist) => (
              <ChecklistSection
                key={checklist.id}
                checklist={checklist}
                onToggleItem={toggleChecklistItem}
                onAddItem={addChecklistItem}
                onDelete={() => deleteChecklist(checklist.id)}
                onDeleteItem={deleteChecklistItem}
              />
            ))}
          </div>

          {/* Right Column - Comments & Activity */}
          {showActivity && (
          <div className="w-full md:w-[420px] flex-shrink-0 border-t md:border-t-0 md:border-l border-[#3d4449] bg-[#161a1d] flex flex-col">
            <div className="px-4 py-3 border-b border-[#3d4449] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-300">Comments and activity</span>
              </div>
              <button 
                className="text-xs text-blue-400 hover:underline"
                onClick={() => setShowActivities(!showActivities)}
              >
                {showActivities ? "Hide details" : "Show details"}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* New Comment Input */}
              <div className="flex gap-2">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-blue-500 text-white text-xs">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  {/* Reply banner */}
                  {replyingTo && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-[#2c3347] rounded text-xs text-gray-400 border-l-2 border-blue-400">
                      <span>Replying to <span className="text-gray-200 font-medium">{replyingTo.firstName} {replyingTo.lastName}</span></span>
                      <button onClick={() => setReplyingTo(null)} className="ml-auto text-gray-500 hover:text-gray-200">✕</button>
                    </div>
                  )}
                  <div className="relative">
                    <textarea
                      ref={commentInputRef as any}
                      value={newComment}
                      dir="auto"
                      rows={2}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewComment(val);
                        const lastAt = val.lastIndexOf("@");
                        if (lastAt !== -1 && lastAt === val.length - 1) {
                          setShowMentions(true);
                          setMentionQuery("");
                        } else if (lastAt !== -1 && /^[\p{L}\p{N}_]+( [\p{L}\p{N}_]*)?$/u.test(val.slice(lastAt + 1))) {
                          setShowMentions(true);
                          setMentionQuery(val.slice(lastAt + 1).toLowerCase());
                        } else {
                          setShowMentions(false);
                        }
                      }}
                      placeholder={replyingTo ? `Reply to ${replyingTo.firstName}...` : "Write a comment... (@ to mention)"}
                      className="w-full bg-[#22272b] border border-[#3d4449] rounded-md text-gray-200 placeholder:text-gray-500 text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (showMentions && mentionCandidates.length > 0) {
                            insertMention(mentionCandidates[0]);
                          } else {
                            addComment();
                          }
                        }
                        if (e.key === "Escape") {
                          setReplyingTo(null);
                          setShowMentions(false);
                        }
                      }}
                    />
                    {/* Mention Dropdown */}
                    {showMentions && mentionCandidates.length > 0 && (
                      <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#22272b] border border-[#3d4449] rounded-lg shadow-lg z-50 max-h-40 overflow-auto">
                        {mentionCandidates
                          .map(m => (
                            <button
                              key={m.userId}
                              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#3d4449] text-left"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => insertMention(m)}
                            >
                              <Avatar className="w-6 h-6 flex-shrink-0">
                                <AvatarFallback className="text-[10px] bg-blue-600 text-white">
                                  {(m.firstName?.[0] || "") + (m.lastName?.[0] || "")}
                                </AvatarFallback>
                              </Avatar>
                              <span dir="auto" className="text-sm text-gray-200">{memberName(m)}</span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Merged Timeline: Comments + Activities */}
              {(() => {
                type TimelineItem = 
                  | { type: "comment"; data: CardComment; date: Date }
                  | { type: "activity"; data: CardActivity; date: Date };

                const timeline: TimelineItem[] = [
                  ...comments.map(c => ({
                    type: "comment" as const,
                    data: c,
                    date: new Date(c.createdAt),
                  })),
                  ...(showActivities ? activities.map(a => ({
                    type: "activity" as const,
                    data: a,
                    date: new Date(a.createdAt),
                  })) : []),
                ].sort((a, b) => b.date.getTime() - a.date.getTime());

                if (timeline.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      No activity yet
                    </div>
                  );
                }

                return timeline.map((item) => {
                  if (item.type === "comment") {
                    const comment = item.data;
                    return (
                      <div key={`comment-${comment.id}`} className="flex gap-2">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-green-500 to-teal-500 text-white text-xs">
                            {(comment.firstName?.[0] || "") + (comment.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm text-gray-200">
                              {comment.firstName} {comment.lastName}
                            </span>
                            <span className="text-xs text-blue-400">
                              {format(new Date(comment.createdAt), "MMM d, yyyy, hh:mm a")}
                            </span>
                          </div>
                          <div dir="auto" className="mt-1 p-2 bg-[#22272b] rounded-lg border border-[#3d4449] text-sm text-gray-300" style={{ whiteSpace: "pre-wrap" }}>
                            {renderCommentContent(comment.content)}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400"
                              onClick={() => {
                                setReplyingTo(comment);
                                commentInputRef.current?.focus();
                              }}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                              Reply
                            </button>
                            <button className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400"
                              onClick={() => deleteComment(comment.id)}>
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const activity = item.data;
                    return (
                      <div key={`activity-${activity.id}`} className="flex gap-2">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-gray-600 to-gray-700 text-white text-xs">
                            {(activity.firstName?.[0] || "") + (activity.lastName?.[0] || "")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm">
                            <span className="font-medium text-gray-200">
                              {activity.firstName} {activity.lastName}
                            </span>{" "}
                            <span className="text-gray-400">{activity.action}</span>
                          </div>
                          <span className="text-xs text-blue-400">
                            {format(new Date(activity.createdAt), "MMM d, yyyy, hh:mm a")}
                          </span>
                        </div>
                      </div>
                    );
                  }
                });
              })()}
            </div>
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChecklistSection({
  checklist,
  onToggleItem,
  onAddItem,
  onDelete,
  onDeleteItem,
}: {
  checklist: Checklist;
  onToggleItem: (itemId: number, isChecked: boolean) => void;
  onAddItem: (checklistId: number, name: string) => void;
  onDelete: () => void;
  onDeleteItem: (itemId: number) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const completedCount = checklist.items.filter((i) => i.isChecked).length;
  const progress = checklist.items.length > 0
    ? Math.round((completedCount / checklist.items.length) * 100)
    : 0;

  const handleAdd = () => {
    if (newItemName.trim()) {
      onAddItem(checklist.id, newItemName);
      setNewItemName("");
      setIsAdding(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-gray-400" />
          <h3 dir="auto" className="font-medium text-gray-200">{checklist.name}</h3>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-400" onClick={onDelete}>
          Delete
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-gray-500 w-8">{progress}%</span>
        <div className="flex-1 h-2 bg-[#22272b] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              progress === 100 ? "bg-green-500" : "bg-blue-500"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 ml-6">
        {checklist.items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={item.isChecked}
              onCheckedChange={() => onToggleItem(item.id, item.isChecked)}
              className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 border-gray-500"
            />
            <span
              dir="auto"
              className={`flex-1 text-sm ${
                item.isChecked ? "line-through text-gray-500" : "text-gray-300"
              }`}
            >
              {item.name}
            </span>
            <button 
              className="opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100 p-1 hover:text-red-400 text-gray-500 transition-opacity"
              onClick={() => onDeleteItem(item.id)}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add Item */}
      {isAdding ? (
        <div className="mt-2 ml-6 space-y-2">
          <Input
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="Add an item"
            dir="auto"
            className="bg-[#22272b] border-[#3d4449] text-gray-200"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") setIsAdding(false);
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd}>
              Add
            </Button>
            <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 ml-6 text-gray-500"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add an item
        </Button>
      )}
    </div>
  );
}

function AttachmentThumbnail({ att }: { att: CardAttachment }) {
  const { getBlobUrl, preloadFile } = useFileBlob();
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!att.fileId) {
      console.warn("[Thumbnail] No fileId for attachment:", att.name);
      return;
    }
    const existing = getBlobUrl(att.fileId);
    console.log("[Thumbnail] fileId:", att.fileId, "cached?", !!existing, "name:", att.name);
    if (existing) return;
    preloadFile(att.fileId).then(() => {
      const url = getBlobUrl(att.fileId!);
      console.log("[Thumbnail] after preload, url:", url ? url.slice(0, 40) : "null");
      forceUpdate(n => n + 1);
    });
  }, [att.fileId]);

  const blobUrl = att.fileId ? getBlobUrl(att.fileId) : null;
  console.log("[Thumbnail render] fileId:", att.fileId, "blobUrl:", blobUrl ? blobUrl.slice(0, 40) : "null");

  if (blobUrl) {
    return <img src={blobUrl} alt={att.name} className="w-full h-full object-cover" onError={(e) => console.error("[Thumbnail] img onError:", e)} />;
  }
  return <div className="w-full h-full bg-gray-700/50 animate-pulse" title={`Loading: ${att.name}`} />;
}
