"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "@/lib/axios-config";
import { isAxiosError } from "axios";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  type CollisionDetection,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus, ArrowLeft, MoreHorizontal, Users, Settings, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KanbanList } from "./kanban-list";
import { KanbanCard } from "./kanban-card";
import { CardDetailModal } from "./card-detail-modal";
import { useAvatar } from "@/context/AvatarContext";
import { useUser } from "@/context/UserContext";
import { CardSearch } from "./card-search";
import { BoardMembersModal } from "./board-members-modal";
import { BoardEditModal } from "./board-edit-modal";
import { BoardMenuPanel, BOARD_MENU_TRIGGER } from "./board-menu-panel";
import { MemberProfilePopover } from "./member-profile-popover";
import { BoardBottomMenu, type BoardView } from "./board-bottom-menu";
import { BoardPlanner } from "./board-planner";
import { rememberRecentBoard } from "./recent-boards";
import { BoardSkeleton } from "./board-skeleton";
import { BoardFilter } from "./board-filter";
import { countActiveFilters, EMPTY_FILTERS, filterLists, type BoardFilters } from "./board-filter-utils";
import {
  loadBoardLists,
  loadBoardDetail,
  getCachedBoardLists,
  getCachedBoardDetail,
  setCachedBoardLists,
  setCachedBoardDetail,
  saveBoardMeta,
} from "./board-cache";
import type { Board, BoardList, Card, BoardMember, BoardLabel, CardCounts } from "@/types/kanban";
import type { KanbanBoardProps, UnlinkedTask } from "@/types/boards"

function mapBoardMembers(data: any): BoardMember[] {
  return (data?.members || []).map((m: any) => ({
    id: m.id,
    userId: m.userId,
    role: m.role,
    firstName: m.user?.firstName ?? null,
    lastName: m.user?.lastName ?? null,
    email: m.user?.email ?? "",
    username: m.user?.username ?? null,
    avatarUrl: m.user?.avatarUrl ?? null,
    avatarId: m.user?.avatarId ?? null,
  }));
}

type DeletedItem = { kind: "card" | "list"; id: number; name: string };

export function KanbanBoard({ boardId }: KanbanBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user: currentUser } = useUser();
  const { getAvatarUrl, preloadAvatar } = useAvatar();
  const [board, setBoard] = useState<Board | null>(() => getCachedBoardDetail(boardId));
  const [lists, setLists] = useState<BoardList[]>(() => getCachedBoardLists(boardId) ?? []);
  const [loading, setLoading] = useState(() => !(getCachedBoardDetail(boardId) && getCachedBoardLists(boardId)));
  const [addingList, setAddingList] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [activeList, setActiveList] = useState<BoardList | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const closeMenu = useCallback(() => setShowMenu(false), []);
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const boardRowRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [isPanning, setIsPanning] = useState(false);

  const startPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    if (e.target !== e.currentTarget && e.target !== boardRowRef.current) return;
    panStart.current = { x: e.clientX, scrollLeft: e.currentTarget.scrollLeft };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsPanning(true);
    e.preventDefault();
  };

  const movePan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    e.currentTarget.scrollLeft = panStart.current.scrollLeft - (e.clientX - panStart.current.x);
  };

  const endPan = () => {
    if (!panStart.current) return;
    panStart.current = null;
    setIsPanning(false);
  };

  const [lastDeleted, setLastDeleted] = useState<DeletedItem | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(() => mapBoardMembers(getCachedBoardDetail(boardId)));
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [unlinkedTasks, setUnlinkedTasks] = useState<UnlinkedTask[]>([]);
  const [activeView, setActiveView] = useState<BoardView>("board");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);

  // Helper function to get avatar URL from cache or avatarUrl
  const getMemberAvatarUrl = (member: any) => {
    if (member.avatarId) {
      return getAvatarUrl(member.avatarId);
    }
    return member.avatarUrl || null;
  };

  // Get non-archived lists (keep list structure but filter cards)
  const activeLists = lists
    .filter(list => !list.isArchived)
    .map(list => ({ ...list, cards: list.cards.filter(card => !card.isArchived) }));

  const archivedLists = lists.filter(list => list.isArchived);

  const filtersActive = countActiveFilters(filters) > 0;
  const visibleLists = filterLists(activeLists, filters, currentUserId);
  const totalCardCount = activeLists.reduce((total, list) => total + list.cards.length, 0);
  const visibleCardCount = visibleLists.reduce((total, list) => total + list.cards.length, 0);

  const memberCardCount = (userId: number) =>
    activeLists.reduce(
      (total, list) =>
        total + list.cards.filter(card =>
          (card.assignees || []).some(a => a.id === userId) || (card.members || []).some(m => m.id === userId)
        ).length,
      0
    );

  // Get all archived cards
  const archivedCards = lists.flatMap(list => list.cards.filter(card => card.isArchived));

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const listsBeforeDrag = useRef<BoardList[] | null>(null);

  const isListId = (id: UniqueIdentifier) => typeof id === "string" && id.startsWith("list-");

  const collisionDetection: CollisionDetection = useCallback((args) => {
    if (isListId(args.active.id)) {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => isListId(c.id)),
      });
    }

    const pointerCollisions = pointerWithin(args);
    const collisions = pointerCollisions.length > 0 ? pointerCollisions : rectIntersection(args);
    let overId = getFirstCollision(collisions, "id");

    if (overId != null) {
      if (isListId(overId)) {
        const listId = parseInt(String(overId).replace("list-", ""));
        const list = lists.find((l) => l.id === listId);
        const cardIds = new Set((list?.cards || []).map((c) => c.id));
        if (cardIds.size > 0) {
          const closestCard = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((c) => cardIds.has(c.id as number)),
          })[0];
          if (closestCard) overId = closestCard.id;
        }
      }
      lastOverId.current = overId;
      return [{ id: overId }];
    }

    return lastOverId.current != null ? [{ id: lastOverId.current }] : [];
  }, [lists]);

  useEffect(() => {
    Promise.allSettled([fetchBoard(), fetchBoardDetails()]).then(() => setLoading(false));
    fetchUnlinkedTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(() => {
    if (!loading) setCachedBoardLists(boardId, lists);
  }, [boardId, lists, loading]);

  useEffect(() => {
    if (board) setCachedBoardDetail(boardId, board);
  }, [boardId, board]);

  useEffect(() => {
    if (board?.name) document.title = `${board.name} | Awan`;
  }, [board?.name]);

  useEffect(() => {
    if (board?.id) rememberRecentBoard(board.id);
  }, [board?.id]);

  const fetchBoard = async (force = false) => {
    try {
      const listsWithAssignees = await loadBoardLists(boardId, { force });

      setLists(listsWithAssignees);

      listsWithAssignees.forEach((list: BoardList) => {
        list.cards.forEach((card: Card) => {
          (card.assignees || []).forEach((assignee: any) => {
            if (assignee.avatarId) {
              preloadAvatar(assignee.avatarId);
            }
          });
        });
      });
    } catch (error) {
      console.error("Error fetching board:", error);
    }
  };

  const fetchBoardDetails = async (force = false) => {
    try {
      const data = await loadBoardDetail(boardId, { force });
      setBoard(data);
      
      const transformedMembers = mapBoardMembers(data);
      setBoardMembers(transformedMembers);
      
      // Preload avatars for board members
      transformedMembers.forEach((member: any) => {
        if (member.avatarId) {
          preloadAvatar(member.avatarId);
        }
      });
    } catch (error) {
      console.error("Error fetching board details:", error);
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    setCurrentUserId(currentUser.id);
    setCurrentUserName([currentUser.firstName ?? currentUser.first_name, currentUser.lastName ?? currentUser.last_name].filter(Boolean).join(" "));
  }, [currentUser]);

  const fetchUnlinkedTasks = async () => {
    try {
      const res = await axiosInstance.get(`/board/${boardId}/unlinked-tasks`);
      const data = res.data?.result ?? res.data;
      setUnlinkedTasks(data);
    } catch (error) {
      console.error("Error fetching unlinked tasks:", error);
    }
  };

  // Check if current user is admin or owner
  const isAdmin = () => {
    if (!currentUserId || !board) return false;
    // Owner is always admin
    if (board.userId === currentUserId) return true;
    // Check if user is admin in board members
    const member = boardMembers.find((m) => m.userId === currentUserId);
    return member?.role === "admin" || member?.role === "owner";
  };

  const canDelete = isAdmin();

  const updateBoard = async (updates: Partial<Board>): Promise<string | null> => {
    if (!board) return "Board not loaded";

    try {
      const res = await axiosInstance.put(`/board/${boardId}`, updates);
      const updatedBoard = res.data?.result ?? res.data;
      setBoard(prev => (prev ? { ...prev, ...updatedBoard } : prev));
      saveBoardMeta(boardId, {
        name: updatedBoard?.name ?? updates.name ?? board.name,
        background: updatedBoard?.background ?? updates.background ?? board.background,
      });
      return null;
    } catch (error) {
      console.error("Error updating board:", error);
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403 || status === 404) return "Only the board owner or admins can change these settings.";
      return (isAxiosError(error) && error.response?.data?.message) || "Failed to save changes. Please try again.";
    }
  };

  const deleteBoard = async () => {
    if (!board) return;
    
    try {
      await axiosInstance.delete(`/board/${boardId}`);
      router.push("/dashboard/boards");
    } catch (error) {
      console.error("Error deleting board:", error);
    }
  };

  const addList = async () => {
    if (!newListName.trim()) return;

    try {
      const res = await axiosInstance.post(`/board/${boardId}/lists`, { name: newListName });
      const newList = res.data?.result ?? res.data;
      setLists([...lists, newList]);
      setNewListName("");
      setAddingList(false);
    } catch (error) {
      console.error("Error adding list:", error);
    }
  };

  const updateList = async (listId: number, updates: Partial<BoardList>) => {
    try {
      await axiosInstance.put(`/lists/${listId}`, updates);
      setLists(prev => prev.map(l => (l.id === listId ? { ...l, ...updates } : l)));
    } catch (error) {
      console.error("Error updating list:", error);
    }
  };

  const setListArchived = (listId: number, isArchived: boolean) => updateList(listId, { isArchived });

  const deleteList = async (listId: number) => {
    const list = lists.find(l => l.id === listId);
    try {
      await axiosInstance.delete(`/lists/${listId}`);
      setLists(prev => prev.filter(l => l.id !== listId));
      showUndo({ kind: "list", id: listId, name: list?.name || "List" });
    } catch (error) {
      console.error("Error deleting list:", error);
    }
  };

  const showUndo = (item: DeletedItem) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastDeleted(item);
    undoTimer.current = setTimeout(() => setLastDeleted(null), 8000);
  };

  const undoDelete = async () => {
    const item = lastDeleted;
    if (!item) return;
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setLastDeleted(null);
    try {
      await axiosInstance.post(`/board/${boardId}/trash/${item.kind}s/${item.id}/restore`);
      await fetchBoard(true);
    } catch (error) {
      console.error("Error restoring item:", error);
    }
  };

  const addCard = async (listId: number, title: string, existingTaskId?: number): Promise<{ error?: string; duplicate?: boolean } | void> => {
    try {
      const res = await axiosInstance.post("/card", { 
        title, 
        listId, 
        existingTaskId,
        createTask: !existingTaskId 
      });

      const data = res.data?.result ?? res.data;
      
      // Fetch assignees for the new card
      let assignees = [];
      try {
        const assigneesRes = await axiosInstance.get(`/card/${data.id}/members`);
        assignees = assigneesRes.data?.result ?? assigneesRes.data ?? [];
      } catch (error) {
        console.error("Error fetching assignees for new card:", error);
      }

      setLists(lists.map(l =>
        l.id === listId ? { ...l, cards: [...l.cards, { ...data, assignees }] } : l
      ));
      
      fetchUnlinkedTasks();
    } catch (error) {
      console.error("Error adding card:", error);
      return { error: "خطا در ایجاد کارت" };
    }
  };

  useEffect(() => {
    const cardParam = searchParams.get("card");
    if (!cardParam || lists.length === 0) return;
    const target = lists.flatMap((l) => l.cards).find((c) => c.id === Number(cardParam));
    if (target) setSelectedCard(target);
    router.replace(`/dashboard/boards/${boardId}`);
  }, [searchParams, lists, boardId, router]);

  const updateCardCounts = (cardId: number, counts: CardCounts) => {
    setLists(prev => prev.map(l => ({
      ...l,
      cards: l.cards.map(c => (c.id === cardId ? { ...c, ...counts } : c)),
    })));
  };

  const openCard = (cardId: number, targetBoardId: number | null) => {
    if (targetBoardId == null || targetBoardId === boardId) {
      const target = lists.flatMap((l) => l.cards).find((c) => c.id === cardId);
      if (target) {
        setSelectedCard(target);
        return;
      }
    }
    router.push(`/dashboard/boards/${targetBoardId ?? boardId}?card=${cardId}`);
  };

  const updateCard = async (cardId: number, updates: Partial<Card>): Promise<boolean> => {
    try {
      const payload = updates.dueDate === null ? { ...updates, clearDueDate: true } : updates;
      const res = await axiosInstance.put(`/card/${cardId}`, payload);
      const { labels: _labels, members: _members, ...updatedCard } = (res.data?.result ?? res.data) as Card;
      
      // Fetch assignees after update to get the latest list
      let assignees = [];
      try {
        const assigneesRes = await axiosInstance.get(`/card/${cardId}/members`);
        assignees = assigneesRes.data?.result ?? assigneesRes.data ?? [];
      } catch (error) {
        console.error("Error fetching assignees:", error);
      }
      
      setLists(prev => prev.map(l => ({
        ...l,
        cards: l.cards.map(c => (c.id === cardId ? { ...c, ...updatedCard, assignees } : c)),
      })));
      return true;
    } catch (error) {
      console.error("Error updating card:", error);
      return false;
    }
  };

  // Update card due date (for planner drag & drop)
  const updateCardDueDate = async (cardId: number, dueDate: string | null) => {
    await updateCard(cardId, { dueDate });
  };

  // Archive a card
  const archiveCard = async (card: Card) => {
    await updateCard(card.id, { isArchived: true });
  };

  // Unarchive a card
  const unarchiveCard = async (card: Card) => {
    await updateCard(card.id, { isArchived: false });
  };

  // Create card with due date (for planner)
  const createCardWithDueDate = async (listId: number, title: string, dueDate: string) => {
    try {
      const res = await axiosInstance.post("/card", { title, listId, dueDate });
      const newCard = res.data?.result ?? res.data;
      
      // Fetch assignees for the new card
      let assignees = [];
      try {
        const assigneesRes = await axiosInstance.get(`/card/${newCard.id}/members`);
        assignees = assigneesRes.data?.result ?? assigneesRes.data ?? [];
      } catch (error) {
        console.error("Error fetching assignees for new card:", error);
      }
      
      setLists(lists.map(l =>
        l.id === listId ? { ...l, cards: [...l.cards, { ...newCard, assignees }] } : l
      ));
      fetchUnlinkedTasks();
    } catch (error) {
      console.error("Error creating card:", error);
    }
  };

  const deleteCard = async (cardId: number, listId: number) => {
    const card = lists.find(l => l.id === listId)?.cards.find(c => c.id === cardId);
    try {
      await axiosInstance.delete(`/card/${cardId}`);
      setLists(prev => prev.map(l =>
        l.id === listId ? { ...l, cards: l.cards.filter(c => c.id !== cardId) } : l
      ));
      showUndo({ kind: "card", id: cardId, name: card?.title || "Card" });
    } catch (error) {
      console.error("Error deleting card:", error);
    }
  };

  const moveCard = async (cardId: number, targetListId: number, position: number) => {
    try {
      // Find the card and its current list
      let movedCard: Card | null = null;
      let sourceListId: number | null = null;
      
      for (const list of lists) {
        const card = list.cards.find(c => c.id === cardId);
        if (card) {
          movedCard = card;
          sourceListId = list.id;
          break;
        }
      }
      
      if (!movedCard || sourceListId === null) return;
            
      await axiosInstance.post(`/card/${cardId}/move`, { listId: targetListId, position });
      
      // Update local state
      setLists(prevLists => {
        return prevLists.map(list => {
          if (list.id === sourceListId) {
            // Remove card from source list
            return {
              ...list,
              cards: list.cards.filter(c => c.id !== cardId),
            };
          }
          if (list.id === targetListId) {
            // Add card to target list at the specified position
            const updatedCard = { ...movedCard!, listId: targetListId };
            const newCards = [...list.cards.filter(c => c.id !== cardId)];
            newCards.splice(position - 1, 0, updatedCard);
            return {
              ...list,
              cards: newCards,
            };
          }
          return list;
        });
      });
      
      // Update selected card if it's the one being moved
      if (selectedCard && selectedCard.id === cardId) {
        setSelectedCard({ ...selectedCard, listId: targetListId });
      }
    } catch (error) {
      console.error("Error moving card:", error);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    listsBeforeDrag.current = lists;
    lastOverId.current = null;
    const activeId = active.id;

    // Check if dragging a list
    if (typeof activeId === "string" && activeId.startsWith("list-")) {
      const listId = parseInt(activeId.replace("list-", ""));
      const list = lists.find(l => l.id === listId);
      if (list) {
        setActiveList(list);
        setActiveCard(null);
      }
      return;
    }

    // Dragging a card
    const cardId = activeId as number;
    for (const list of lists) {
      const card = list.cards.find(c => c.id === cardId);
      if (card) {
        setActiveCard(card);
        setActiveList(null);
        break;
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Skip if dragging a list
    if (typeof activeId === "string" && activeId.startsWith("list-")) {
      return;
    }

    // Find source list and card
    let sourceList: BoardList | undefined;
    let sourceCard: Card | undefined;
    for (const list of lists) {
      const card = list.cards.find(c => c.id === activeId);
      if (card) {
        sourceList = list;
        sourceCard = card;
        break;
      }
    }

    if (!sourceList || !sourceCard) return;

    // Check if over a list or card
    let targetList: BoardList | undefined;
    let overIndex = -1;

    if (typeof overId === "string" && overId.startsWith("list-")) {
      const listId = parseInt(overId.replace("list-", ""));
      targetList = lists.find(l => l.id === listId);
      overIndex = targetList?.cards.length || 0;
    } else {
      for (const list of lists) {
        const idx = list.cards.findIndex(c => c.id === overId);
        if (idx !== -1) {
          targetList = list;
          overIndex = idx;
          break;
        }
      }
    }

    if (!targetList) return;

    // Same list reordering
    if (sourceList.id === targetList.id) {
      const sourceIndex = sourceList.cards.findIndex(c => c.id === activeId);
      if (sourceIndex === overIndex || overIndex === -1) return;

      setLists(lists.map(list => {
        if (list.id === sourceList!.id) {
          const newCards = arrayMove(list.cards, sourceIndex, overIndex);
          return { ...list, cards: newCards };
        }
        return list;
      }));
    } else {
      // Cross-list movement
      setLists(lists.map(list => {
        if (list.id === sourceList!.id) {
          return {
            ...list,
            cards: list.cards.filter(c => c.id !== activeId),
          };
        }
        if (list.id === targetList!.id) {
          const newCards = [...list.cards];
          const insertIndex = overIndex === -1 ? newCards.length : overIndex;
          newCards.splice(insertIndex, 0, { ...sourceCard!, listId: targetList!.id });
          return { ...list, cards: newCards };
        }
        return list;
      }));
    }
  };

  const handleDragCancel = () => {
    setActiveCard(null);
    setActiveList(null);
    if (listsBeforeDrag.current) setLists(listsBeforeDrag.current);
    listsBeforeDrag.current = null;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);
    setActiveList(null);
    const snapshot = listsBeforeDrag.current;
    listsBeforeDrag.current = null;

    if (!over) {
      if (snapshot) setLists(snapshot);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Handle list reordering
    if (typeof activeId === "string" && activeId.startsWith("list-")) {
      if (typeof overId === "string" && overId.startsWith("list-")) {
        const activeListId = parseInt(activeId.replace("list-", ""));
        const overListId = parseInt(overId.replace("list-", ""));

        if (activeListId !== overListId) {
          const oldIndex = lists.findIndex(l => l.id === activeListId);
          const newIndex = lists.findIndex(l => l.id === overListId);

          const newLists = arrayMove(lists, oldIndex, newIndex);
          setLists(newLists);

          // Update list positions in database
          try {
            await Promise.all(
              newLists.map((list, index) =>
                axiosInstance.put(`/lists/${list.id}`, { position: index })
              )
            );
          } catch (error) {
            console.error("Error reordering lists:", error);
            fetchBoard(true);
          }
        }
      }
      return;
    }

    // Handle card movement
    const cardId = activeId as number;

    // Find the card and its current list
    let currentList: BoardList | undefined;
    let newPosition = 0;

    for (const list of lists) {
      const cardIndex = list.cards.findIndex(c => c.id === cardId);
      if (cardIndex !== -1) {
        currentList = list;
        newPosition = cardIndex;
        break;
      }
    }

    if (!currentList) return;

    const originalList = snapshot?.find(l => l.cards.some(c => c.id === cardId));
    const originalIndex = originalList?.cards.findIndex(c => c.id === cardId) ?? -1;
    if (originalList?.id === currentList.id && originalIndex === newPosition) return;

    try {
      await axiosInstance.post(`/card/${cardId}/move`, {
        listId: currentList.id,
        position: newPosition + 1,
      });
    } catch (error) {
      console.error("Error moving card:", error);
      fetchBoard(true);
    }
  };

  if (loading) {
    return <BoardSkeleton background={board?.background} name={board?.name} />;
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full bg-[#1d2125] text-gray-300">
        <p>Board not found</p>
        <Button variant="secondary" onClick={() => router.push("/dashboard/boards")}>Back to boards</Button>
      </div>
    );
  }

  return (
    <div
      className="h-dvh flex flex-col w-full overflow-hidden"
      style={{ backgroundColor: board.background }}
    >
      {/* Board Header */}
      <div className="flex items-center justify-between gap-2 px-2 sm:px-4 py-2 sm:py-3 bg-black/20 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
        <div className="flex items-center gap-1 sm:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 shrink-0"
            onClick={() => router.push("/dashboard/boards")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 dir="auto" className="text-base sm:text-lg font-bold text-white truncate">{board.name}</h1>
        </div>
        {/* Card Search */}
        <div className="hidden md:block">
          <CardSearch
            lists={lists}
            onCardSelect={(card) => setSelectedCard(card)}
            inputClassName="w-56 lg:w-72 xl:w-96"
          />
        </div>
        <div className="flex items-center justify-end gap-0.5 sm:gap-3 shrink-0 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/20"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            {mobileSearchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </Button>

          <BoardFilter
            filters={filters}
            onChange={setFilters}
            labels={board.labels || []}
            members={boardMembers}
            matchCount={visibleCardCount}
            totalCount={totalCardCount}
          />

          {/* Members Display */}
          <div className="flex items-center">
            <div className="hidden sm:flex -space-x-2">
              {boardMembers.slice(0, 4).map((member, index) => {
                const avatarUrl = getMemberAvatarUrl(member);
                return (
                  <MemberProfilePopover
                    key={`member-${member.userId || member.id}-${index}`}
                    member={member}
                    avatarUrl={avatarUrl}
                    boardId={boardId}
                    cardCount={memberCardCount(member.userId)}
                    onOpenCard={(cardId) => openCard(cardId, boardId)}
                  >
                    <button
                      type="button"
                      className="relative rounded-full hover:z-10 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 data-[state=open]:z-10 data-[state=open]:ring-2 data-[state=open]:ring-white/70"
                      title={`${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()}
                    >
                      <Avatar className="w-8 h-8 border-2 border-white/20">
                        <AvatarImage src={avatarUrl || ""} />
                        <AvatarFallback className="bg-blue-600 text-white text-xs">
                          {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </MemberProfilePopover>
                );
              })}
              {boardMembers.length > 4 && (
                <button
                  type="button"
                  onClick={() => setShowMembersModal(true)}
                  className="w-8 h-8 rounded-full bg-gray-600 border-2 border-white/20 flex items-center justify-center text-xs text-white hover:z-10 hover:bg-gray-500"
                  title="All members"
                >
                  +{boardMembers.length - 4}
                </button>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 sm:ml-2 px-2 xl:px-3"
              onClick={() => setShowMembersModal(true)}
              title="Members"
            >
              <Users className="w-4 h-4 xl:mr-2" />
              <span className="hidden xl:inline">Members</span>
            </Button>
          </div>

          {/* Edit Button */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 px-2 xl:px-3"
            onClick={() => setShowEditModal(true)}
            title="Settings"
          >
            <Settings className="w-4 h-4 xl:mr-2" />
            <span className="hidden xl:inline">Settings</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn("text-white hover:bg-white/20", showMenu && "bg-white/20")}
            onClick={() => setShowMenu(v => !v)}
            title="Menu"
            aria-expanded={showMenu}
            {...{ [BOARD_MENU_TRIGGER]: "" }}
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden px-3 py-2 bg-black/20 border-t border-white/10">
          <CardSearch
            lists={lists}
            autoFocus
            inputClassName="w-full"
            onCardSelect={(card) => {
              setSelectedCard(card);
              setMobileSearchOpen(false);
            }}
          />
        </div>
      )}

      {/* Board Content - Based on Active View */}
      {activeView === "board" && (
        <div
          ref={boardScrollRef}
          onPointerDown={startPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onLostPointerCapture={endPan}
          className={cn(
            "flex-1 min-h-0 overflow-x-auto overflow-y-hidden px-3 pt-3 pb-20 sm:p-4 sm:pb-24 scroll-px-3 sm:scroll-px-0",
            !activeCard && !activeList && !isPanning && "snap-x snap-mandatory sm:snap-none",
            isPanning && "cursor-grabbing select-none"
          )}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <SortableContext
              items={activeLists.map(l => `list-${l.id}`)}
              strategy={horizontalListSortingStrategy}
            >
              <div ref={boardRowRef} className="flex items-start gap-3 sm:gap-4 h-full w-max">
                {visibleLists.map((list) => (
                  <KanbanList
                    key={list.id}
                    list={list}
                    cardDragDisabled={filtersActive}
                    onUpdateList={updateList}
                    onDeleteList={canDelete ? deleteList : undefined}
                    onArchiveList={(listId) => setListArchived(listId, true)}
                    onAddCard={addCard}
                    onCardClick={setSelectedCard}
                    onArchiveCard={archiveCard}
                    onUnarchiveCard={unarchiveCard}
                    unlinkedTasks={unlinkedTasks}
                    currentUserId={currentUserId}
                  />
                ))}
                {/* Add List */}
              <div className="w-[85vw] max-w-[320px] sm:w-72 flex-shrink-0 snap-center">
                {addingList ? (
                  <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: "#101204" }}>
                    <Input
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="Enter list name"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addList();
                        if (e.key === "Escape") setAddingList(false);
                      }}
                      className="bg-[#22272b] border-[#3d4449] text-gray-200 placeholder:text-gray-500"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={addList}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:text-gray-200 hover:bg-white/10"
                        onClick={() => setAddingList(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="w-full bg-white/20 hover:bg-white/30 text-white rounded-xl p-3 flex items-center gap-2 transition-colors"
                    onClick={() => setAddingList(true)}
                  >
                    <Plus className="w-5 h-5" />
                    <span>Add a list</span>
                  </button>
                )}
              </div>
            </div>
            </SortableContext>

            <DragOverlay>
              {activeCard && (
                <KanbanCard 
                  card={activeCard} 
                  isDragging 
                  onArchive={archiveCard}
                  onUnarchive={unarchiveCard}
                />
              )}
              {activeList && (
                <div 
                  className="w-72 rounded-xl p-3 opacity-80"
                  style={{ backgroundColor: "#101204" }}
                >
                  <h3 className="font-semibold text-gray-200">{activeList.name}</h3>
                </div>
              )}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Planner View */}
      {activeView === "planner" && (
        <div className="flex-1 min-h-0 overflow-hidden p-2 pb-20 sm:p-4 sm:pb-24">
          <BoardPlanner
            lists={visibleLists}
            onCardClick={setSelectedCard}
            onUpdateCardDueDate={updateCardDueDate}
            onCreateCard={createCardWithDueDate}
          />
        </div>
      )}

      {/* Switch Boards View - Placeholder */}
      {activeView === "switch" && (
        <div className="flex-1 flex items-center justify-center p-4 pb-24">
          <div className="text-center text-gray-400">
            <div className="text-6xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-white mb-2">Switch Boards</h3>
            <p>Quickly switch between your boards</p>
            <Button
              className="mt-4"
              onClick={() => router.push("/dashboard/boards")}
            >
              View All Boards
            </Button>
          </div>
        </div>
      )}

      {lastDeleted && (
        <div
          role="status"
          className="fixed bottom-20 sm:bottom-24 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 items-center gap-3 rounded-lg border border-[#3d4449] bg-[#282e33] px-4 py-2.5 text-sm text-gray-200 shadow-2xl"
        >
          <span className="min-w-0 truncate">
            {lastDeleted.kind === "card" ? "Card" : "List"} <span dir="auto" className="font-medium">&ldquo;{lastDeleted.name}&rdquo;</span> moved to Deleted items
          </span>
          <button type="button" onClick={undoDelete} className="shrink-0 font-semibold text-blue-400 hover:text-blue-300">
            Undo
          </button>
          <button type="button" onClick={() => setLastDeleted(null)} className="shrink-0 text-gray-500 hover:text-gray-300" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom Menu */}
      <BoardBottomMenu activeView={activeView} onViewChange={setActiveView} />

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          key={selectedCard.id}
          card={selectedCard}
          onCountsChange={updateCardCounts}
          onOpenCard={openCard}
          mentionName={currentUserName ? `@${currentUserName}` : undefined}
          boardId={boardId}
          boardLabels={board!.labels || []}
          boardMembers={boardMembers}
          lists={lists}
          listName={lists.find(l => l.id === selectedCard.listId)?.name || "List"}
          isOpen={!!selectedCard}
          onClose={() => setSelectedCard(null)}
          onUpdate={async (updates) => {
            const cardId = selectedCard.id;
            setSelectedCard(prev => (prev && prev.id === cardId ? { ...prev, ...updates } : prev));
            if ('labels' in updates) {
              setLists(prev => prev.map(l => ({
                ...l,
                cards: l.cards.map(c => c.id === cardId ? { ...c, labels: updates.labels } : c),
              })));
              const { labels: _, ...rest } = updates;
              return Object.keys(rest).length > 0 ? updateCard(cardId, rest) : true;
            }
            return updateCard(cardId, updates);
          }}
          onDelete={canDelete ? () => {
            deleteCard(selectedCard.id, selectedCard.listId);
            setSelectedCard(null);
          } : undefined}
          onMoveCard={moveCard}
          onStartTimer={(card) => {
            // Navigate to time tracker with card info in query params
            const params = new URLSearchParams({
              cardId: card.id.toString(),
              cardTitle: card.title,
              projectId: board?.projectId?.toString() || "",
              taskId: card.taskId?.toString() || "",
            });
            router.push(`/dashboard/tracker?${params.toString()}`);
          }}
          onBoardLabelsChange={(change) => {
            const mapLabels = (labels: BoardLabel[] = []) =>
              change.type === "deleted"
                ? labels.filter(l => l.id !== change.labelId)
                : labels.map(l => (l.id === change.label.id ? { ...l, ...change.label } : l));
            setBoard(prev => {
              if (!prev) return prev;
              const labels = change.type === "created"
                ? [...(prev.labels || []), change.label]
                : mapLabels(prev.labels);
              return { ...prev, labels };
            });
            if (change.type === "created") return;
            setLists(prev => prev.map(l => ({
              ...l,
              cards: l.cards.map(c => (c.labels ? { ...c, labels: mapLabels(c.labels) } : c)),
            })));
            setSelectedCard(prev => (prev?.labels ? { ...prev, labels: mapLabels(prev.labels) } : prev));
          }}
        />
      )}

      {/* Board Members Modal */}
      <BoardMembersModal
        boardId={boardId}
        members={boardMembers}
        ownerId={board.userId}
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        onMembersChange={(newMembers) => {
          setBoardMembers(newMembers)
          // Also refresh board details to pick up new member in lists
          fetchBoardDetails(true)
        }}
      />

      {/* Board Edit Modal (Admin only) */}
      {board && (
        <BoardEditModal
          board={board}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={updateBoard}
          onDelete={deleteBoard}
          canDelete={!!currentUserId && board.userId === currentUserId}
          canEdit={isAdmin()}
        />
      )}

      {showMenu && (
      <BoardMenuPanel
        boardId={boardId}
        onTrashRestored={() => fetchBoard(true)}
        onClose={closeMenu}
        canEdit={isAdmin()}
        onOpenSettings={() => setShowEditModal(true)}
        onOpenMembers={() => setShowMembersModal(true)}
        archivedCards={archivedCards}
        archivedLists={archivedLists}
        onOpenCard={setSelectedCard}
        onRestoreCard={unarchiveCard}
        onDeleteCard={canDelete ? (card) => deleteCard(card.id, card.listId) : undefined}
        onRestoreList={(list) => setListArchived(list.id, false)}
        onDeleteList={canDelete ? (list) => deleteList(list.id) : undefined}
      />
      )}
    </div>
  );
}
