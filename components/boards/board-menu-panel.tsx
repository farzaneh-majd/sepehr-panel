"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { isAxiosError } from "axios";
import { AlignLeft, Archive, ChevronLeft, ChevronRight, Loader2, Paperclip, Settings, Trash2, Users, X } from "lucide-react";
import axiosInstance from "@/lib/axios-config";
import { format } from "@/lib/date";
import { Input } from "@/components/ui/input";
import { normalizeSearchText, searchTokens, matchesTokens } from "@/lib/search";
import { useAvatar } from "@/context/AvatarContext";
import type { BoardList, Card } from "@/types/kanban";

export const BOARD_MENU_TRIGGER = "data-board-menu-trigger";

type PanelView = "menu" | "archived" | "trash";
type ItemTab = "cards" | "lists";

interface TrashCard {
  id: number;
  title: string | null;
  listId: number | null;
  listName: string | null;
  listDeleted: boolean;
  deletedAt: string | null;
}

interface TrashList {
  id: number;
  name: string | null;
  cardCount: number;
  deletedAt: string | null;
}

interface BoardMenuPanelProps {
  boardId: number;
  onClose: () => void;
  canEdit: boolean;
  onOpenSettings: () => void;
  onOpenMembers: () => void;
  archivedCards: Card[];
  archivedLists: BoardList[];
  onOpenCard: (card: Card) => void;
  onRestoreCard: (card: Card) => void;
  onDeleteCard?: (card: Card) => void;
  onRestoreList: (list: BoardList) => void;
  onDeleteList?: (list: BoardList) => void;
  onTrashRestored: () => void;
}

const VIEW_TITLES: Record<PanelView, string> = { menu: "Menu", archived: "Archived items", trash: "Deleted items" };

function isDialogOpen() {
  return !!document.querySelector('[role="dialog"], [role="alertdialog"]');
}

function errorMessage(error: unknown, fallback: string) {
  return (isAxiosError(error) && error.response?.data?.message) || fallback;
}

function deletedLabel(deletedAt: string | null) {
  return deletedAt ? `Deleted ${format(new Date(deletedAt), "MMM d, yyyy")}` : "Deleted";
}

export function BoardMenuPanel({
  boardId,
  onClose,
  canEdit,
  onOpenSettings,
  onOpenMembers,
  archivedCards,
  archivedLists,
  onOpenCard,
  onRestoreCard,
  onDeleteCard,
  onRestoreList,
  onDeleteList,
  onTrashRestored,
}: BoardMenuPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<PanelView>("menu");
  const [tab, setTab] = useState<ItemTab>("cards");
  const [query, setQuery] = useState("");
  const [trash, setTrash] = useState<{ cards: TrashCard[]; lists: TrashList[] } | null>(null);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashError, setTrashError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (panelRef.current?.contains(target) || target.closest?.(`[${BOARD_MENU_TRIGGER}]`) || isDialogOpen()) return;
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDialogOpen()) onClose();
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const tokens = useMemo(() => searchTokens(query), [query]);
  const matches = (text: string | null) => !tokens.length || matchesTokens(normalizeSearchText(text), tokens);
  const filteredCards = archivedCards.filter((c) => matches(c.title));
  const filteredLists = archivedLists.filter((l) => matches(l.name));
  const filteredTrashCards = (trash?.cards ?? []).filter((c) => matches(c.title));
  const filteredTrashLists = (trash?.lists ?? []).filter((l) => matches(l.name));

  const archivedCount = archivedCards.length + archivedLists.length;

  const openView = (next: PanelView) => {
    setView(next);
    setTab("cards");
    setQuery("");
    setActionError(null);
    if (next === "trash") loadTrash();
  };

  const loadTrash = async () => {
    setTrashLoading(true);
    setTrashError(null);
    try {
      const res = await axiosInstance.get(`/board/${boardId}/trash`);
      const data = res.data?.result ?? res.data;
      setTrash({ cards: data?.cards ?? [], lists: data?.lists ?? [] });
    } catch (error) {
      setTrashError(errorMessage(error, "Couldn't load deleted items."));
    } finally {
      setTrashLoading(false);
    }
  };

  const restoreFromTrash = async (kind: "card" | "list", id: number) => {
    setBusyKey(`${kind}-${id}`);
    setActionError(null);
    try {
      await axiosInstance.post(`/board/${boardId}/trash/${kind}s/${id}/restore`);
      setTrash((prev) => prev && ({
        cards: kind === "card" ? prev.cards.filter((c) => c.id !== id) : prev.cards.map((c) => (c.listId === id ? { ...c, listDeleted: false } : c)),
        lists: kind === "list" ? prev.lists.filter((l) => l.id !== id) : prev.lists,
      }));
      onTrashRestored();
    } catch (error) {
      setActionError(errorMessage(error, "Couldn't restore this item."));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div
      ref={panelRef}
      role="complementary"
      aria-label={VIEW_TITLES[view]}
      className="fixed top-14 right-2 sm:right-4 z-40 flex w-[min(340px,calc(100vw-1rem))] max-h-[calc(100dvh-4.5rem)] flex-col rounded-xl border border-[#3d4449] bg-[#282e33] text-gray-200 shadow-2xl"
    >
      <div className="relative flex h-12 shrink-0 items-center justify-center px-10">
        {view !== "menu" && (
          <button
            type="button"
            onClick={() => openView("menu")}
            className="absolute left-2 rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
        <h2 className="truncate text-sm font-semibold text-gray-300">{VIEW_TITLES[view]}</h2>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 rounded-md p-1.5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {view === "menu" ? (
        <div className="space-y-0.5 overflow-y-auto px-2 pb-3">
          <MenuItem
            icon={Settings}
            label="Settings"
            description={canEdit ? "Name, background and visibility" : "View only — owner or admins can edit"}
            onClick={() => { onClose(); onOpenSettings(); }}
          />
          <MenuItem icon={Users} label="Members" onClick={() => { onClose(); onOpenMembers(); }} />
          <div className="my-2 h-px bg-[#3d4449]" />
          <MenuItem
            icon={Archive}
            label="Archived items"
            trailing={archivedCount > 0 ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-gray-300">{archivedCount}</span> : <ChevronRight className="h-4 w-4 text-gray-500" />}
            onClick={() => openView("archived")}
          />
          <MenuItem
            icon={Trash2}
            label="Deleted items"
            description="Restore deleted cards and lists"
            trailing={<ChevronRight className="h-4 w-4 text-gray-500" />}
            onClick={() => openView("trash")}
          />
        </div>
      ) : (
        <>
          <div className="flex shrink-0 gap-2 px-3 pb-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={view === "trash" ? "Search deleted items..." : "Search archive..."}
              dir="auto"
              autoFocus
              className="h-9 flex-1 border-[#3d4449] bg-[#22272b] text-sm text-gray-200 placeholder:text-gray-500 focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => { setTab((t) => (t === "cards" ? "lists" : "cards")); setActionError(null); }}
              className="h-9 shrink-0 rounded-md bg-white/10 px-3 text-sm font-medium text-gray-200 hover:bg-white/15"
            >
              {tab === "cards" ? "Lists" : "Cards"}
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-1">
            {view === "archived" ? (
              tab === "cards" ? (
                filteredCards.length === 0 ? (
                  <EmptyState text={query ? "No archived cards match your search" : "No archived cards"} />
                ) : (
                  <div className="space-y-3">
                    {filteredCards.map((card) => (
                      <div key={card.id}>
                        <ArchivedCardPreview card={card} onOpen={() => onOpenCard(card)} />
                        <ItemActions onRestore={() => onRestoreCard(card)} onDelete={onDeleteCard && (() => onDeleteCard(card))} />
                      </div>
                    ))}
                  </div>
                )
              ) : filteredLists.length === 0 ? (
                <EmptyState text={query ? "No archived lists match your search" : "No archived lists"} />
              ) : (
                <div className="space-y-3">
                  {filteredLists.map((list) => (
                    <div key={list.id}>
                      <div className="rounded-lg bg-[#22272b] p-3">
                        <p dir="auto" className="truncate text-sm font-medium text-gray-200">{list.name}</p>
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                          <Archive className="h-3.5 w-3.5" />
                          <span>Archived</span>
                          <span className="ms-auto">{list.cards.length} cards</span>
                        </div>
                      </div>
                      <ItemActions onRestore={() => onRestoreList(list)} onDelete={onDeleteList && (() => onDeleteList(list))} />
                    </div>
                  ))}
                </div>
              )
            ) : trashLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : trashError ? (
              <div className="py-8 text-center text-sm text-red-400">
                {trashError}
                <button type="button" onClick={loadTrash} className="mt-2 block w-full text-xs text-gray-400 hover:text-gray-200 hover:underline">
                  Retry
                </button>
              </div>
            ) : (
              <>
                <p className="mb-3 rounded-md bg-white/5 px-3 py-2 text-xs text-gray-400">
                  Deleted cards and lists are kept here and can be restored at any time.
                </p>
                {actionError && <p className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{actionError}</p>}
                {tab === "cards" ? (
                  filteredTrashCards.length === 0 ? (
                    <EmptyState icon={Trash2} text={query ? "No deleted cards match your search" : "No deleted cards"} />
                  ) : (
                    <div className="space-y-3">
                      {filteredTrashCards.map((card) => (
                        <div key={card.id} className={busyKey === `card-${card.id}` ? "pointer-events-none opacity-50" : undefined}>
                          <div className="rounded-lg bg-[#22272b] p-3">
                            <p dir="auto" className="text-sm leading-relaxed text-gray-200">{card.title || "Untitled card"}</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Trash2 className="h-3.5 w-3.5" />
                                {deletedLabel(card.deletedAt)}
                              </span>
                              {card.listName && (
                                <span dir="auto" className="truncate">
                                  in {card.listName}{card.listDeleted && " (list deleted)"}
                                </span>
                              )}
                            </div>
                          </div>
                          <ItemActions onRestore={() => restoreFromTrash("card", card.id)} />
                        </div>
                      ))}
                    </div>
                  )
                ) : filteredTrashLists.length === 0 ? (
                  <EmptyState icon={Trash2} text={query ? "No deleted lists match your search" : "No deleted lists"} />
                ) : (
                  <div className="space-y-3">
                    {filteredTrashLists.map((list) => (
                      <div key={list.id} className={busyKey === `list-${list.id}` ? "pointer-events-none opacity-50" : undefined}>
                        <div className="rounded-lg bg-[#22272b] p-3">
                          <p dir="auto" className="truncate text-sm font-medium text-gray-200">{list.name || "Untitled list"}</p>
                          <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-400">
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>{deletedLabel(list.deletedAt)}</span>
                            <span className="ms-auto">{list.cardCount} cards</span>
                          </div>
                        </div>
                        <ItemActions onRestore={() => restoreFromTrash("list", list.id)} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  description,
  trailing,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-white/10"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-gray-200">{label}</span>
        {description && <span className="block truncate text-xs text-gray-500">{description}</span>}
      </span>
      {trailing}
    </button>
  );
}

function EmptyState({ text, icon: Icon = Archive }: { text: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-gray-500">
      <Icon className="h-8 w-8 text-gray-600" />
      {text}
    </div>
  );
}

function ItemActions({ onRestore, onDelete }: { onRestore: () => void; onDelete?: () => void }) {
  return (
    <div className="mt-1 flex items-center gap-1.5 px-1 text-xs text-gray-400">
      <button type="button" onClick={onRestore} className="hover:text-gray-200 hover:underline">
        Restore
      </button>
      {onDelete && (
        <>
          <span aria-hidden>•</span>
          <button type="button" onClick={onDelete} className="hover:text-red-400 hover:underline">
            Delete
          </button>
        </>
      )}
    </div>
  );
}

function ArchivedCardPreview({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const { getAvatarUrl } = useAvatar();
  const members = [
    ...(card.members || []),
    ...(card.assignees || []).filter((a) => !(card.members || []).some((m) => m.id === a.id)),
  ];
  const attachmentCount = card.attachmentCount ?? card.attachments?.length ?? 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="block w-full overflow-hidden rounded-lg bg-[#22272b] text-start shadow-sm hover:bg-[#2c3339] hover:ring-2 hover:ring-blue-500/50"
    >
      {card.coverColor && <div className="h-6" style={{ backgroundColor: card.coverColor }} />}
      <div className="space-y-2 p-3">
        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.map((label) => (
              <span key={label.id} className="h-2 min-w-[40px] rounded-full" style={{ backgroundColor: label.color }} />
            ))}
          </div>
        )}
        <p dir="auto" className="text-sm leading-relaxed text-gray-200">{card.title}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {card.description && <AlignLeft className="h-3.5 w-3.5" />}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3.5 w-3.5" />
              {attachmentCount}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Archive className="h-3.5 w-3.5" />
            Archived
          </span>
          {members.length > 0 && (
            <span className="ms-auto flex -space-x-2">
              {members.slice(0, 3).map((member) => {
                const avatarUrl = member.avatarId ? getAvatarUrl(member.avatarId) : null;
                return (
                  <span
                    key={member.id}
                    title={`${member.firstName ?? ""} ${member.lastName ?? ""}`.trim()}
                    className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-[#22272b] bg-gradient-to-br from-blue-500 to-purple-600 text-[9px] font-medium text-white"
                  >
                    {avatarUrl ? (
                      <Image src={avatarUrl} alt="" width={24} height={24} className="h-full w-full object-cover" />
                    ) : (
                      (member.firstName?.[0] || "") + (member.lastName?.[0] || "")
                    )}
                  </span>
                );
              })}
              {members.length > 3 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#22272b] bg-gray-600 text-[9px] text-white">
                  +{members.length - 3}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
