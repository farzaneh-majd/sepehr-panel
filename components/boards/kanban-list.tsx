"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, MoreHorizontal, Pencil, Trash2, Copy, Link, Clock, Search, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { KanbanCard } from "./kanban-card";
import type { BoardList, Card } from "@/types/kanban";
import { normalizeSearchText, searchTokens, matchesTokens } from "@/lib/search";

interface UnlinkedTask {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  createdAt: string;
}

interface KanbanListProps {
  list: BoardList;
  onUpdateList: (listId: number, updates: Partial<BoardList>) => void;
  onDeleteList?: (listId: number) => void;
  onArchiveList?: (listId: number) => void;
  onAddCard: (listId: number, title: string, existingTaskId?: number) => Promise<{ error?: string; duplicate?: boolean } | void>;
  onCardClick: (card: Card) => void;
  onArchiveCard?: (card: Card) => void;
  onUnarchiveCard?: (card: Card) => void;
  unlinkedTasks?: UnlinkedTask[];
  currentUserId?: number | null;
  cardDragDisabled?: boolean;
}

export function KanbanList({
  list,
  onUpdateList,
  onDeleteList,
  onArchiveList,
  onAddCard,
  onCardClick,
  onArchiveCard,
  onUnarchiveCard,
  unlinkedTasks = [],
  currentUserId,
  cardDragDisabled = false,
}: KanbanListProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(list.name);
  const editFromMenuRef = useRef(false);
  const skipSaveRef = useRef(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `list-${list.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const startEditing = () => {
    skipSaveRef.current = false;
    setEditName(list.name);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    skipSaveRef.current = true;
    setEditName(list.name);
    setIsEditing(false);
  };

  const handleSaveName = () => {
    if (skipSaveRef.current) return;
    skipSaveRef.current = true;
    const name = editName.trim();
    if (name && name !== list.name) {
      onUpdateList(list.id, { name });
    } else {
      setEditName(list.name);
    }
    setIsEditing(false);
  };

  const handleAddCard = async () => {
    if (newCardTitle.trim()) {
      setError(null);
      setIsSubmitting(true);
      try {
        const result = await onAddCard(list.id, newCardTitle, selectedTaskId || undefined);
        if (result?.error) {
          setError(result.error);
        } else {
          setNewCardTitle("");
          setSelectedTaskId(null);
          setIsAddingCard(false);
        }
      } catch (err) {
        setError("Error creating card");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSelectTask = (task: UnlinkedTask) => {
    setSelectedTaskId(task.id);
    setNewCardTitle(task.name);
    setError(null);
  };

  const handleClearTaskSelection = () => {
    setSelectedTaskId(null);
    setNewCardTitle("");
    setError(null);
  };

  const cardCount = list.cards?.length || 0;
  const myCardCount = currentUserId == null ? 0 : list.cards.filter(
    (card) =>
      (card.assignees || []).some((a) => a.id === currentUserId) ||
      (card.members || []).some((m) => m.id === currentUserId)
  ).length;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex max-h-full w-[85vw] max-w-[320px] flex-shrink-0 snap-center flex-col rounded-lg border border-[#dfe1e6] bg-[#f1f2f4] shadow-sm sm:w-72"
    >
      {/* List Header - Drag Handle */}
      <div 
        className={isEditing ? "px-2 py-1.5 flex items-center justify-between gap-1" : "px-2 py-1.5 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing"}
        {...(isEditing ? {} : attributes)}
        {...(isEditing ? {} : listeners)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isEditing ? (
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleSaveName}
              onFocus={(e) => e.currentTarget.select()}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                if (e.key === "Escape") cancelEditing();
              }}
              autoFocus
              dir="auto"
              maxLength={100}
              className="h-8 min-w-0 border-[#8590a2] bg-white text-base font-semibold text-[#172b4d] focus-visible:ring-2 focus-visible:ring-[#0c66e4]"
            />
          ) : (
            <h3
              dir="auto"
              className="min-w-0 flex-1 cursor-pointer truncate rounded px-2 py-1 text-sm font-semibold uppercase tracking-wide text-[#44546f] hover:bg-[#091e420f]"
              onClick={startEditing}
            >
              {list.name}
            </h3>
          )}
          {/* Card Count Badge */}
          {myCardCount > 0 ? (
            <span
              className="shrink-0 whitespace-nowrap rounded bg-[#e9f2ff] px-2 py-0.5 text-sm text-[#0c66e4]"
              title={`You're on ${myCardCount} of ${cardCount} cards`}
            >
              {myCardCount} / {cardCount}
            </span>
          ) : (
            <span className="shrink-0 rounded bg-[#dfe1e6] px-2 py-0.5 text-sm text-[#626f86]">
              {cardCount}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-[#626f86] hover:bg-[#091e4224] hover:text-[#172b4d]">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="border-[#dfe1e6] bg-white text-[#172b4d] shadow-lg"
            onCloseAutoFocus={(e) => {
              if (editFromMenuRef.current) {
                e.preventDefault();
                editFromMenuRef.current = false;
              }
            }}
          >
            <DropdownMenuItem 
              onClick={() => {
                editFromMenuRef.current = true;
                startEditing();
              }}
              className="text-[#172b4d] focus:bg-[#091e420f]"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Name
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[#172b4d] focus:bg-[#091e420f]">
              <Copy className="w-4 h-4 mr-2" />
              Copy List
            </DropdownMenuItem>
            {onArchiveList && (
              <DropdownMenuItem
                onClick={() => onArchiveList(list.id)}
                className="text-[#172b4d] focus:bg-[#091e420f]"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive List
              </DropdownMenuItem>
            )}
            {onDeleteList && (
              <>
                <DropdownMenuSeparator className="bg-[#dfe1e6]" />
                <DropdownMenuItem
                  onClick={() => onDeleteList(list.id)}
                  className="text-[#c9372c] focus:bg-[#ffebe6]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete List
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="flex-1 min-h-[48px] space-y-2 overflow-y-auto px-2 pb-2 pt-1 scrollbar-thin scrollbar-thumb-[#b7bdc8] scrollbar-track-transparent">
        <SortableContext
          items={list.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {list.cards.map((card) => (
            <KanbanCard
              key={card.id}
              card={card}
              dragDisabled={cardDragDisabled}
              onClick={() => onCardClick(card)}
              onArchive={onArchiveCard}
              onUnarchive={onUnarchiveCard}
            />
          ))}
        </SortableContext>
      </div>

      {/* Add Card */}
      <div className="border-t border-[#dfe1e6] p-1.5">
        {isAddingCard ? (
          <div className="space-y-2">
            {/* انتخاب تسک موجود */}
            {unlinkedTasks.length > 0 && (
              <div className="mb-2">
                {selectedTaskId ? (
                  <div className="flex items-center gap-2 rounded-md border border-[#85b8ff] bg-[#e9f2ff] p-2">
                    <Clock className="h-4 w-4 text-[#0c66e4]" />
                    <span className="flex-1 text-sm text-[#0c66e4]">Task selected</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearTaskSelection}
                      className="h-6 px-2 text-xs text-[#44546f] hover:bg-[#091e4224] hover:text-[#172b4d]"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full border-[#8590a2] bg-white text-sm text-[#44546f] hover:bg-[#091e420f] hover:text-[#172b4d]"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Select existing task
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-72 max-w-[calc(100vw-2rem)] border-[#dfe1e6] bg-white p-0 text-[#172b4d] shadow-lg"
                      align="start"
                    >
                      <UnlinkedTaskPicker tasks={unlinkedTasks} onSelect={handleSelectTask} />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            )}

            <textarea
              value={newCardTitle}
              dir="auto"
              onChange={(e) => {
                setNewCardTitle(e.target.value);
                setError(null);
              }}
              placeholder="Enter a title for this card..."
              className="w-full resize-none rounded-md border border-[#8590a2] bg-white p-2 text-[15px] text-[#172b4d] placeholder:text-[#626f86] focus:outline-none focus:ring-2 focus:ring-[#0c66e4]"
              rows={3}
              autoFocus={!selectedTaskId}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddCard();
                }
                if (e.key === "Escape") {
                  setIsAddingCard(false);
                  setSelectedTaskId(null);
                  setNewCardTitle("");
                  setError(null);
                }
              }}
            />

            {/* نمایش خطا */}
            {error && (
              <div className="rounded-md bg-[#ffebe6] p-2 text-sm text-[#c9372c]">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleAddCard} 
                disabled={isSubmitting || !newCardTitle.trim()}
                className="bg-[#0c66e4] text-white hover:bg-[#0055cc] disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Add Card"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setIsAddingCard(false);
                  setSelectedTaskId(null);
                  setNewCardTitle("");
                  setError(null);
                }}
                className="text-[#44546f] hover:bg-[#091e4224] hover:text-[#172b4d]"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[15px] text-[#44546f] transition-colors hover:bg-[#091e4224] hover:text-[#172b4d]"
            onClick={() => setIsAddingCard(true)}
          >
            <Plus className="w-4 h-4" />
            <span>Add a card</span>
          </button>
        )}
      </div>
    </div>
  );
}

const MAX_TASK_RESULTS = 50;

function UnlinkedTaskPicker({
  tasks,
  onSelect,
}: {
  tasks: UnlinkedTask[];
  onSelect: (task: UnlinkedTask) => void;
}) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const index = useMemo(
    () => tasks.map((task) => ({ task, id: String(task.id), name: normalizeSearchText(task.name) })),
    [tasks]
  );

  const { results, totalCount } = useMemo(() => {
    const tokens = searchTokens(deferredQuery);
    const idQuery = tokens.length === 1 ? tokens[0].replace(/^#/, "") : "";
    const matched = tokens.length === 0
      ? index
      : index.filter((item) => item.id === idQuery || matchesTokens(item.name, tokens));
    return { results: matched.slice(0, MAX_TASK_RESULTS), totalCount: matched.length };
  }, [index, deferredQuery]);

  return (
    <>
      <div className="space-y-2 border-b border-[#dfe1e6] p-2">
        <div className="flex items-center justify-between text-sm text-[#44546f]">
          <span>Unlinked tasks</span>
          <span className="text-xs text-[#626f86]">{totalCount}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#626f86]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            dir="auto"
            autoFocus
            className="h-8 border-[#8590a2] bg-white pl-8 text-sm text-[#172b4d] placeholder:text-[#626f86]"
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto overscroll-contain">
        {results.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs text-[#626f86]">No tasks found</div>
        ) : (
          results.map(({ task }) => (
            <button
              key={task.id}
              className="flex w-full items-center gap-2 p-2 text-sm text-[#172b4d] hover:bg-[#091e420f]"
              onClick={() => onSelect(task)}
            >
              <Clock className="h-4 w-4 flex-shrink-0 text-[#626f86]" />
              <span dir="auto" className="truncate flex-1 text-start">{task.name}</span>
            </button>
          ))
        )}
        {totalCount > results.length && (
          <div className="border-t border-[#dfe1e6] px-2 py-2 text-center text-xs text-[#626f86]">
            Showing {results.length} of {totalCount}. Refine your search to see more.
          </div>
        )}
      </div>
    </>
  );
}
