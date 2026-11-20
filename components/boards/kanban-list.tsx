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
      className="w-[85vw] max-w-[320px] sm:w-72 flex-shrink-0 snap-center rounded-xl flex flex-col max-h-full bg-[#101204]"
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
              className="h-7 min-w-0 text-sm font-semibold bg-[#22272b] border-[#3d4449] text-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          ) : (
            <h3
              dir="auto"
              className="text-sm font-semibold text-gray-200 cursor-pointer hover:bg-white/10 px-2 py-1 rounded flex-1 min-w-0 truncate"
              onClick={startEditing}
            >
              {list.name}
            </h3>
          )}
          {/* Card Count Badge */}
          {myCardCount > 0 ? (
            <span
              className="shrink-0 whitespace-nowrap text-xs rounded px-2 py-0.5 bg-blue-500/15 text-blue-300"
              title={`You're on ${myCardCount} of ${cardCount} cards`}
            >
              {myCardCount} / {cardCount}
            </span>
          ) : (
            <span className="shrink-0 text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">
              {cardCount}
            </span>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-200 hover:bg-white/10">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="bg-[#22272b] border-[#3d4449]"
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
              className="text-gray-200 focus:bg-white/10"
            >
              <Pencil className="w-4 h-4 mr-2" />
              Edit Name
            </DropdownMenuItem>
            <DropdownMenuItem className="text-gray-200 focus:bg-white/10">
              <Copy className="w-4 h-4 mr-2" />
              Copy List
            </DropdownMenuItem>
            {onArchiveList && (
              <DropdownMenuItem
                onClick={() => onArchiveList(list.id)}
                className="text-gray-200 focus:bg-white/10"
              >
                <Archive className="w-4 h-4 mr-2" />
                Archive List
              </DropdownMenuItem>
            )}
            {onDeleteList && (
              <>
                <DropdownMenuSeparator className="bg-[#3d4449]" />
                <DropdownMenuItem
                  onClick={() => onDeleteList(list.id)}
                  className="text-red-400 focus:bg-red-500/10"
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
      <div className="flex-1 min-h-[48px] overflow-y-auto px-2 pt-1 pb-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
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
      <div className="p-1.5 border-t border-[#3d4449]/50">
        {isAddingCard ? (
          <div className="space-y-2">
            {/* انتخاب تسک موجود */}
            {unlinkedTasks.length > 0 && (
              <div className="mb-2">
                {selectedTaskId ? (
                  <div className="flex items-center gap-2 p-2 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400 flex-1">Task selected</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleClearTaskSelection}
                      className="h-6 text-xs text-gray-400 hover:text-gray-200 hover:bg-white/10 px-2"
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
                        className="w-full text-sm bg-transparent border-[#3d4449] text-gray-400 hover:text-gray-200 hover:bg-white/5"
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Select existing task
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent 
                      className="w-72 max-w-[calc(100vw-2rem)] p-0 bg-[#22272b] border-[#3d4449]" 
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
              className="w-full p-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#22272b] border border-[#3d4449] text-gray-200 placeholder:text-gray-500"
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
              <div className="text-sm text-red-400 bg-red-500/10 p-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={handleAddCard} 
                disabled={isSubmitting || !newCardTitle.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
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
                className="text-gray-400 hover:text-gray-200 hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-gray-400 hover:bg-white/10 hover:text-gray-200 rounded-lg transition-colors"
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
      <div className="p-2 border-b border-[#3d4449] space-y-2">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Unlinked tasks</span>
          <span className="text-xs text-gray-500">{totalCount}</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks..."
            dir="auto"
            autoFocus
            className="h-8 pl-8 text-sm bg-[#1d2125] border-[#3d4449] text-gray-200 placeholder:text-gray-500"
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto overscroll-contain">
        {results.length === 0 ? (
          <div className="px-2 py-3 text-center text-xs text-gray-500">No tasks found</div>
        ) : (
          results.map(({ task }) => (
            <button
              key={task.id}
              className="w-full p-2 text-sm text-gray-200 hover:bg-white/10 flex items-center gap-2"
              onClick={() => onSelect(task)}
            >
              <Clock className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span dir="auto" className="truncate flex-1 text-start">{task.name}</span>
            </button>
          ))
        )}
        {totalCount > results.length && (
          <div className="px-2 py-2 text-center text-xs text-gray-500 border-t border-[#3d4449]">
            Showing {results.length} of {totalCount}. Refine your search to see more.
          </div>
        )}
      </div>
    </>
  );
}
