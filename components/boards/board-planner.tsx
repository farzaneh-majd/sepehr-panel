"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  isBefore,
  parseISO,
  parseServerDate,
} from "@/lib/date";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Clock, 
  Tag, 
  Filter,
  AlertCircle,
  CalendarX,
  Plus,
  X,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { BoardList, Card } from "@/types/kanban";
import type { BoardPlannerProps, ViewMode } from "@/types/boards"

// Draggable Card Component
function DraggableCard({ 
  card, 
  listName, 
  isOverdue, 
  onClick 
}: { 
  card: Card & { listName: string }; 
  listName: string; 
  isOverdue: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${card.id}`,
    data: { card },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={cn(
        "w-full text-left p-2 rounded bg-[#2d3338] hover:bg-[#3d4348] transition-colors group cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
        isOverdue && "ring-1 ring-red-500/50"
      )}
    >
      {/* Card Labels */}
      {card.labels && card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {card.labels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="h-1.5 w-6 rounded-full"
              style={{ backgroundColor: label.color }}
            />
          ))}
        </div>
      )}
      
      {/* Card Title */}
      <p className="text-xs text-gray-200 line-clamp-2 group-hover:text-white">
        {card.title}
      </p>
      
      {/* Card Meta */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">
          {listName}
        </span>
        {isOverdue && (
          <span className="text-[10px] text-red-400 flex items-center gap-0.5">
            <AlertCircle className="w-3 h-3" />
            Overdue
          </span>
        )}
      </div>
    </button>
  );
}

// Droppable Day Component
function DroppableDay({ 
  day, 
  children, 
  isCurrentMonth, 
  isCurrentDay, 
  viewMode,
  onAddCard,
}: { 
  day: Date; 
  children: React.ReactNode; 
  isCurrentMonth: boolean; 
  isCurrentDay: boolean;
  viewMode: ViewMode;
  onAddCard: (day: Date) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${day.toISOString()}`,
    data: { day },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border transition-colors group",
        viewMode === "week" ? "min-h-[400px]" : "min-h-[120px]",
        isCurrentMonth
          ? "bg-[#22272b] border-[#3d4449]"
          : "bg-[#1d2125] border-[#2d3439]",
        isCurrentDay && "ring-2 ring-blue-500",
        isOver && "ring-2 ring-green-500 bg-green-900/20"
      )}
    >
      {/* Day Header */}
      <div className={cn(
        "p-2 border-b flex items-center justify-between",
        isCurrentMonth ? "border-[#3d4449]" : "border-[#2d3439]"
      )}>
        <span
          className={cn(
            "text-sm font-medium",
            isCurrentDay
              ? "text-blue-400"
              : isCurrentMonth
              ? "text-gray-300"
              : "text-gray-600"
          )}
        >
          {format(day, viewMode === "week" ? "EEE d" : "d")}
        </span>
        <button
          onClick={() => onAddCard(day)}
          className="opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-opacity"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Cards */}
      <div className="p-1 space-y-1 overflow-y-auto max-h-[350px]">
        {children}
      </div>
    </div>
  );
}

export function BoardPlanner({ 
  lists, 
  onCardClick, 
  onUpdateCardDueDate,
  onCreateCard 
}: BoardPlannerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [activeCard, setActiveCard] = useState<(Card & { listName: string }) | null>(null);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [showUnscheduled, setShowUnscheduled] = useState(false);
  const [addingCardDay, setAddingCardDay] = useState<Date | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [selectedListForNewCard, setSelectedListForNewCard] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Get all cards
  const allCards = useMemo(() => {
    const cards: (Card & { listName: string })[] = [];
    lists.forEach((list) => {
      if (selectedLists.length === 0 || selectedLists.includes(list.id)) {
        list.cards.forEach((card) => {
          cards.push({ ...card, listName: list.name });
        });
      }
    });
    return cards;
  }, [lists, selectedLists]);

  // Cards with due dates
  const cardsWithDueDate = useMemo(() => {
    return allCards.filter(card => card.dueDate);
  }, [allCards]);

  // Cards without due dates (unscheduled)
  const unscheduledCards = useMemo(() => {
    return allCards.filter(card => !card.dueDate);
  }, [allCards]);

  // Overdue cards count
  const overdueCount = useMemo(() => {
    const now = new Date();
    return cardsWithDueDate.filter(card => {
      const dueDate = typeof card.dueDate === "string" ? parseServerDate(card.dueDate) : card.dueDate;
      return dueDate && isBefore(dueDate, now) && !card.dueComplete;
    }).length;
  }, [cardsWithDueDate]);

  // Get days based on view mode
  const days = useMemo(() => {
    if (viewMode === "week") {
      const start = startOfWeek(currentDate, { weekStartsOn: 6 });
      const end = endOfWeek(currentDate, { weekStartsOn: 6 });
      return eachDayOfInterval({ start, end });
    } else {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      const monthDays = eachDayOfInterval({ start, end });
      
      const firstDayOfMonth = startOfMonth(currentDate);
      const startOfFirstWeek = startOfWeek(firstDayOfMonth, { weekStartsOn: 6 });
      const prefixDays = eachDayOfInterval({ start: startOfFirstWeek, end: firstDayOfMonth }).slice(0, -1);
      
      const lastDayOfMonth = endOfMonth(currentDate);
      const endOfLastWeek = endOfWeek(lastDayOfMonth, { weekStartsOn: 6 });
      const suffixDays = eachDayOfInterval({ start: lastDayOfMonth, end: endOfLastWeek }).slice(1);
      
      return [...prefixDays, ...monthDays, ...suffixDays];
    }
  }, [currentDate, viewMode]);

  // Get cards for a specific day
  const getCardsForDay = (day: Date) => {
    return cardsWithDueDate.filter((card) => {
      const dueDate = typeof card.dueDate === "string" ? parseServerDate(card.dueDate) : card.dueDate;
      return dueDate && isSameDay(dueDate, day);
    });
  };

  // Check if card is overdue
  const isCardOverdue = (card: Card) => {
    if (!card.dueDate || card.dueComplete) return false;
    const dueDate = typeof card.dueDate === "string" ? parseServerDate(card.dueDate) : card.dueDate;
    return dueDate && isBefore(dueDate, new Date());
  };

  // Navigation
  const goToPrevious = () => {
    if (viewMode === "week") {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const goToNext = () => {
    if (viewMode === "week") {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const card = active.data.current?.card;
    if (card) {
      setActiveCard(card);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = parseInt(active.id.toString().replace("card-", ""));
    const targetDayStr = over.id.toString().replace("day-", "");
    
    if (targetDayStr.startsWith("unscheduled")) {
      // Dropped on unscheduled sidebar
      onUpdateCardDueDate(cardId, null);
    } else {
      const targetDay = parseISO(targetDayStr);
      onUpdateCardDueDate(cardId, targetDay.toISOString());
    }
  };

  // Add card handler
  const handleAddCard = (day: Date) => {
    setAddingCardDay(day);
    setNewCardTitle("");
    setSelectedListForNewCard(lists[0]?.id || null);
  };

  const handleCreateCard = () => {
    if (newCardTitle.trim() && selectedListForNewCard && addingCardDay) {
      onCreateCard(selectedListForNewCard, newCardTitle, addingCardDay.toISOString());
      setAddingCardDay(null);
      setNewCardTitle("");
    }
  };

  // Toggle list filter
  const toggleListFilter = (listId: number) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  const dayNames = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative flex h-full gap-4">
        {/* Main Calendar */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#1d2125] rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 sm:p-4 border-b border-[#3d4449]">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <h2 className="hidden sm:flex text-xl font-semibold text-white items-center gap-2">
                <Calendar className="w-5 h-5" />
                Planner
              </h2>
              <div className="flex items-center gap-1 bg-[#22272b] rounded-lg p-1">
                <Button
                  size="sm"
                  variant={viewMode === "week" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("week")}
                  className={cn(
                    "text-sm",
                    viewMode === "week"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  Week
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === "month" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("month")}
                  className={cn(
                    "text-sm",
                    viewMode === "month"
                      ? "bg-blue-600 text-white hover:bg-blue-700"
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                  )}
                >
                  Month
                </Button>
              </div>

              {/* Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "text-gray-400 hover:text-white hover:bg-white/10",
                      selectedLists.length > 0 && "text-blue-400"
                    )}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                    {selectedLists.length > 0 && (
                      <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 rounded-full">
                        {selectedLists.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-56 bg-[#22272b] border-[#3d4449] p-2">
                  <div className="text-sm text-gray-400 mb-2">Filter by List</div>
                  {lists.map((list) => (
                    <label
                      key={list.id}
                      className="flex items-center gap-2 p-2 hover:bg-white/10 rounded cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedLists.includes(list.id)}
                        onCheckedChange={() => toggleListFilter(list.id)}
                      />
                      <span className="text-sm text-gray-200">{list.name}</span>
                      <span className="ml-auto text-xs text-gray-500">
                        {list.cards.length}
                      </span>
                    </label>
                  ))}
                  {selectedLists.length > 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-2 text-gray-400"
                      onClick={() => setSelectedLists([])}
                    >
                      Clear filters
                    </Button>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {/* Overdue indicator */}
              {overdueCount > 0 && (
                <div className="flex items-center gap-1 text-red-400 text-sm bg-red-500/10 px-2 py-1 rounded">
                  <AlertCircle className="w-4 h-4" />
                  {overdueCount} overdue
                </div>
              )}

              {/* Unscheduled toggle */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowUnscheduled(!showUnscheduled)}
                className={cn(
                  "text-gray-400 hover:text-white hover:bg-white/10",
                  showUnscheduled && "bg-white/10 text-white"
                )}
              >
                <CalendarX className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Unscheduled</span>
                <span className="ml-1 text-xs text-gray-500">
                  ({unscheduledCards.length})
                </span>
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={goToToday}
                className="text-gray-400 hover:text-white hover:bg-white/10"
              >
                Today
              </Button>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={goToPrevious}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-white text-sm sm:text-base font-medium sm:min-w-[140px] text-center">
                  {viewMode === "week"
                    ? `${format(days[0], "MMM d")} - ${format(days[days.length - 1], "MMM d, yyyy")}`
                    : format(currentDate, "MMMM yyyy")}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={goToNext}
                  className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto p-2 sm:p-4">
            <div className="min-w-[640px]">
            {/* Day Names Header */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {dayNames.map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-medium text-gray-500 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-2">
              {days.map((day) => {
                const dayCards = getCardsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);

                return (
                  <DroppableDay
                    key={day.toISOString()}
                    day={day}
                    isCurrentMonth={isCurrentMonth}
                    isCurrentDay={isCurrentDay}
                    viewMode={viewMode}
                    onAddCard={handleAddCard}
                  >
                    {dayCards.map((card) => (
                      <DraggableCard
                        key={card.id}
                        card={card}
                        listName={card.listName}
                        isOverdue={isCardOverdue(card)}
                        onClick={() => onCardClick(card)}
                      />
                    ))}

                    {dayCards.length === 0 && viewMode === "week" && (
                      <div className="text-center py-4 text-gray-600 text-xs">
                        No cards
                      </div>
                    )}
                  </DroppableDay>
                );
              })}
            </div>
            </div>
          </div>

          {/* Stats Footer */}
          <div className="p-3 sm:p-4 border-t border-[#3d4449] flex flex-wrap items-center gap-x-6 gap-y-1">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              <span>{cardsWithDueDate.length} cards with due dates</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Tag className="w-4 h-4" />
              <span>{allCards.length} total cards</span>
            </div>
          </div>
        </div>

        {/* Unscheduled Sidebar */}
        {showUnscheduled && (
          <div className="absolute inset-y-0 right-0 z-20 w-72 max-w-[85%] shadow-2xl md:static md:max-w-none md:shadow-none bg-[#1d2125] rounded-xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#3d4449] flex items-center justify-between">
              <h3 className="text-white font-medium flex items-center gap-2">
                <CalendarX className="w-4 h-4" />
                Unscheduled
              </h3>
              <Button
                size="icon"
                variant="ghost"
                className="text-gray-400 hover:text-white"
                onClick={() => setShowUnscheduled(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div 
              className="flex-1 overflow-y-auto p-2 space-y-2"
            >
              {unscheduledCards.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  All cards are scheduled
                </div>
              ) : (
                unscheduledCards.map((card) => (
                  <DraggableCard
                    key={card.id}
                    card={card}
                    listName={card.listName}
                    isOverdue={false}
                    onClick={() => onCardClick(card)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Add Card Modal */}
      {addingCardDay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#22272b] rounded-xl p-4 w-full max-w-96 border border-[#3d4449]">
            <h3 className="text-white font-medium mb-4">
              Add card for {format(addingCardDay, "EEEE, MMMM d")}
            </h3>
            <Input
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              placeholder="Card title..."
              className="mb-3 bg-[#1d2125] border-[#3d4449] text-white"
              autoFocus
            />
            <div className="mb-4">
              <label className="text-sm text-gray-400 mb-2 block">Select list</label>
              <div className="space-y-1">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    onClick={() => setSelectedListForNewCard(list.id)}
                    className={cn(
                      "w-full p-2 rounded text-left text-sm transition-colors",
                      selectedListForNewCard === list.id
                        ? "bg-blue-600 text-white"
                        : "bg-[#1d2125] text-gray-300 hover:bg-white/10"
                    )}
                  >
                    {list.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateCard}
                disabled={!newCardTitle.trim() || !selectedListForNewCard}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <Check className="w-4 h-4 mr-2" />
                Create
              </Button>
              <Button
                variant="ghost"
                onClick={() => setAddingCardDay(null)}
                className="text-gray-400"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      <DragOverlay>
        {activeCard && (
          <div className="w-48 p-2 rounded bg-[#2d3338] shadow-lg border border-blue-500">
            <p className="text-xs text-gray-200 line-clamp-2">{activeCard.title}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
