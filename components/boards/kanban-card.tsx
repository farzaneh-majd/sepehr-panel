"use client";

import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { 
  Clock, 
  MessageSquare, 
  CheckSquare, 
  Paperclip, 
  AlignLeft, 
  Eye,
  ExternalLink,
  Archive,
  ArchiveRestore,
  AtSign,
  Link2,
  Bug
} from "lucide-react";
import type { Card } from "@/types/kanban";
import type { KanbanCardProps } from "@/types/boards"
import { useAvatar } from "@/context/AvatarContext"
import { format, parseServerDate } from "@/lib/date"
import { useEffect } from "react"
import { LabelTooltip } from "./label-tooltip"

export function KanbanCard({ card, isDragging = false, dragDisabled = false, onClick, onArchive, onUnarchive }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id, disabled: dragDisabled });

  const { getAvatarUrl, preloadAvatar } = useAvatar();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasLabels = card.labels && card.labels.length > 0;
  const hasDueDate = !!card.dueDate;
  const commentCount = card.commentCount ?? card.comments?.length ?? 0;
  const attachmentCount = card.attachmentCount ?? card.attachments?.length ?? 0;
  const mentionCount = card.mentionCount ?? 0;
  const linkedCardCount = card.linkedCardCount ?? 0;
  const bugCount = card.bugCount ?? 0;
  const openBugCount = card.openBugCount ?? 0;
  const hasComments = commentCount > 0;
  const hasAttachments = attachmentCount > 0;
  const hasMentions = mentionCount > 0;
  const hasLinkedCards = linkedCardCount > 0;
  const hasBugs = bugCount > 0;
  const hasDescription = !!card.description;
  const hasMembers = (card.members && card.members.length > 0) || (card.assignees && card.assignees.length > 0);

  // Get all members including both members and assignees
  const allMembers = [
    ...(card.members || []),
    ...(card.assignees || []).filter(a => !(card.members || []).some(m => m.id === a.id))
  ];

  // Helper function to get avatar URL from cache only (never raw file paths)
  const getMemberAvatarUrl = (member: any) => {
    if (member.avatarId) {
      return getAvatarUrl(member.avatarId);
    }
    // Don't use member.avatarUrl directly - it's a server file path, not a valid URL
    return null;
  };

  const memberAvatarIds = allMembers.map((m) => m.avatarId).filter(Boolean).join(",");

  useEffect(() => {
    if (!memberAvatarIds) return;
    memberAvatarIds.split(",").forEach((id) => preloadAvatar(id));
  }, [memberAvatarIds, preloadAvatar]);

  // Calculate checklist progress
  let checklistTotal = card.checklistItemCount ?? 0;
  let checklistComplete = card.checklistItemCheckedCount ?? 0;
  if (card.checklistItemCount === undefined && card.checklists) {
    card.checklists.forEach((cl) => {
      checklistTotal += cl.items?.length || 0;
      checklistComplete += cl.items?.filter((i) => i.isChecked).length || 0;
    });
  }
  const hasChecklists = checklistTotal > 0;

  // Format due date with enhanced styling
  const formatDueDate = (date: string) => {
    const d = parseServerDate(date);
    const now = new Date();
    const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const formatted = format(d, "MMM d");
    
    let status: "overdue" | "near" | "complete" | "normal" = "normal";
    if (card.dueComplete) {
      status = "complete";
    } else if (diffDays < 0) {
      status = "overdue";
    } else if (diffDays <= 1) {
      status = "near";
    }
    
    return { formatted, status };
  };

  const getDueDateStyles = (status: string) => {
    switch (status) {
      case "complete":
        return "bg-green-600 text-white";
      case "overdue":
        return "bg-red-600 text-white";
      case "near":
        return "bg-[#fff7d6] text-[#7f5f01]";
      default:
        return "bg-[#f1f2f4] text-[#44546f]";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative cursor-pointer rounded-md border border-[#dfe1e6] bg-white shadow-[0_1px_2px_rgba(9,30,66,0.18)]
        hover:border-[#85b8ff] hover:shadow-[0_2px_6px_rgba(9,30,66,0.22)]
        transition-all duration-200 ${
        isDragging || isSortableDragging 
          ? "opacity-60 rotate-2 shadow-xl scale-105" 
          : ""
      }`}
      onClick={onClick}
    >
      {/* Cover Color/Image */}
      {card.coverColor && (
        <div
          className="h-8 rounded-t-lg transition-all"
          style={{ backgroundColor: card.coverColor }}
        />
      )}
      {card.coverImage && (
        <div className="h-32 rounded-t-lg overflow-hidden">
          <Image
            src={card.coverImage}
            alt=""
            width={280}
            height={128}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-3 space-y-2">
        {/* Labels row - with dueComplete tick if applicable */}
        {(hasLabels || card.dueComplete) && (
          <div className="flex flex-wrap items-center gap-1">
            {/* DueComplete tick badge - green circle with checkmark */}
            {card.dueComplete && (
              <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {card.labels!?.map((label) => (
              <LabelTooltip key={label.id} name={label.name}>
                <div
                  className="h-2 min-w-[40px] rounded-full"
                  style={{ backgroundColor: label.color }}
                />
              </LabelTooltip>
            ))}
          </div>
        )}

        {/* Title */}
        <p dir="auto" className="text-base font-medium leading-relaxed text-[#172b4d]">
          {card.sequenceNumber != null && (
            <span className="mr-1.5 font-mono text-xs font-semibold text-[#0c66e4]">#{card.sequenceNumber}</span>
          )}
          {card.title}
        </p>

        {/* Badges Row */}
        {(hasDueDate || hasComments || hasChecklists || hasAttachments || hasMentions || hasLinkedCards || hasBugs || hasDescription || hasMembers) && (
          <div className="flex items-center flex-wrap gap-2 text-xs">
            {/* Watching indicator (optional) */}
            {card.isArchived && (
              <div className="flex items-center gap-1 text-[#626f86]">
                <Eye className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Due Date */}
            {hasDueDate && (() => {
              const { formatted, status } = formatDueDate(card.dueDate!);
              return (
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${getDueDateStyles(status)}`}
                >
                  <Clock className="w-3 h-3" />
                  <span>{formatted}</span>
                </div>
              );
            })()}

            {/* Description indicator */}
            {hasDescription && (
              <div className="flex items-center text-[#626f86]" title="This card has a description">
                <AlignLeft className="w-3.5 h-3.5" />
              </div>
            )}

            {/* Comments */}
            {hasComments && (
              <div className="flex items-center gap-1 text-[#626f86]" title="Comments">
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{commentCount}</span>
              </div>
            )}

            {hasMentions && (
              <div className="flex items-center gap-0.5 rounded bg-[#e9f2ff] px-1 py-0.5 text-[#0c66e4]" title="You were mentioned">
                <AtSign className="w-3.5 h-3.5" />
                <span>{mentionCount}</span>
              </div>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <div className="flex items-center gap-1 text-[#626f86]" title="Attachments">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{attachmentCount}</span>
              </div>
            )}

            {hasLinkedCards && (
              <div className="flex items-center gap-1 text-[#626f86]" title="Attached cards">
                <Link2 className="w-3.5 h-3.5" />
                <span>{linkedCardCount}</span>
              </div>
            )}

            {hasBugs && (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  openBugCount > 0 ? "bg-[#ffebe6] text-[#c9372c]" : "bg-[#1f845a] text-white"
                }`}
                title={`${openBugCount} open of ${bugCount} bugs`}
              >
                <Bug className="w-3.5 h-3.5" />
                <span>{openBugCount}/{bugCount}</span>
              </div>
            )}

            {/* Checklists */}
            {hasChecklists && (
              <div
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
                  checklistComplete === checklistTotal
                    ? "bg-green-600 text-white"
                    : "text-[#626f86]"
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>
                  {checklistComplete}/{checklistTotal}
                </span>
              </div>
            )}

            {/* Members */}
            {hasMembers && (
              <div className="flex items-center gap-1 ml-auto">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {allMembers.slice(0, 3).map((member: any) => {
                    const avatarUrl = getMemberAvatarUrl(member);
                    return (
                      <div
                        key={member.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-purple-600 text-[10px] font-medium text-white shadow-sm transition-transform hover:z-10 hover:scale-110"
                        title={`${member.firstName} ${member.lastName}`}
                      >
                        {avatarUrl ? (
                          <Image
                            src={avatarUrl}
                            alt=""
                            width={28}
                            height={28}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (member.firstName?.[0] || "") + (member.lastName?.[0] || "")
                        )}
                      </div>
                    );
                  })}
                  {allMembers.length > 3 && (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#626f86] text-[10px] font-medium text-white">
                      +{allMembers.length - 3}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover buttons - top right, expand next to archive */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-all">
        <button
          className="rounded bg-white p-1 shadow-sm transition-colors hover:bg-[#091e4224]"
          onClick={(e) => { e.stopPropagation(); onClick?.(); }}
          title="Open card"
        >
          <ExternalLink className="h-3 w-3 text-[#44546f]" />
        </button>
        <button
          className="rounded bg-white p-1 shadow-sm transition-colors hover:bg-[#091e4224]"
          onClick={(e) => { e.stopPropagation(); card.isArchived ? onUnarchive?.(card) : onArchive?.(card); }}
          title={card.isArchived ? "بازگردانی از آرشیو" : "آرشیو کردن"}
        >
          {card.isArchived ? <ArchiveRestore className="h-3 w-3 text-[#974f0c]" /> : <Archive className="h-3 w-3 text-[#44546f]" />}
        </button>
      </div>
    </div>
  );
}
