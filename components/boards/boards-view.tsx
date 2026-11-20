"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Star, Clock, Search, Users, Archive, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axiosInstance from "@/lib/axios-config";
import { cn } from "@/lib/utils";
import { useUser } from "@/context/UserContext";
import type { Board } from "@/types/kanban";
import type { Project } from "@/lib/types";
import { BACKGROUND_COLORS } from "@/types/boards"
import { getRecentBoardIds } from "./recent-boards";
import { prefetchBoard, saveBoardsMeta } from "./board-cache";

export function BoardsView() {
  const router = useRouter();
  const { user } = useUser();
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardBackground, setNewBoardBackground] = useState(BACKGROUND_COLORS[0]);
  const [newBoardProject, setNewBoardProject] = useState("new");
  const [boardlessProjects, setBoardlessProjects] = useState<Project[]>([]);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [showClosed, setShowClosed] = useState(false);
  const [recentIds, setRecentIds] = useState<number[]>([]);
  const canCreate = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    fetchBoards();
    setRecentIds(getRecentBoardIds());
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await axiosInstance.get("/board");
      const data = res.data?.result ?? res.data;
      const list: Board[] = Array.isArray(data) ? data : [];
      setBoards(list);
      saveBoardsMeta(list.map(b => ({ id: b.id, name: b.name, background: b.background })));
    } catch (error) {
      console.error("Error fetching boards:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isCreateOpen) return;
    axiosInstance.get("/project")
      .then((res) => {
        const data = res.data?.result ?? res.data;
        const list: Project[] = Array.isArray(data) ? data : [];
        setBoardlessProjects(list.filter(p => !p.boardId && !p.isArchived));
      })
      .catch((error) => console.error("Error fetching projects:", error));
  }, [isCreateOpen]);

  const handleProjectChange = (value: string) => {
    const prev = boardlessProjects.find(p => p.id.toString() === newBoardProject);
    const next = boardlessProjects.find(p => p.id.toString() === value);
    setNewBoardProject(value);
    if (next && (!newBoardName.trim() || newBoardName === prev?.name)) setNewBoardName(next.name);
    if (!next && prev && newBoardName === prev.name) setNewBoardName("");
  };

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      setNewBoardName("");
      setNewBoardProject("new");
    }
  };

  const createBoard = async () => {
    if (!newBoardName.trim() || creating) return;

    const linkedProjectId = newBoardProject !== "new" && newBoardProject !== "none" ? Number(newBoardProject) : undefined;

    setCreating(true);
    try {
      const res = await axiosInstance.post("/board", {
        name: newBoardName,
        background: newBoardBackground,
        createProject: newBoardProject === "new",
        projectId: linkedProjectId,
      });

      const newBoard = res.data?.result ?? res.data;
      if (newBoard) {
        setBoards([...boards, newBoard]);
        handleCreateOpenChange(false);
        router.push(`/dashboard/boards/${newBoard.id}`);
      }
    } catch (error) {
      console.error("Error creating board:", error);
    } finally {
      setCreating(false);
    }
  };

  const toggleStar = async (e: React.MouseEvent, boardId: number, isStarred: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await axiosInstance.patch(`/board/${boardId}`, { isStarred: !isStarred });

      setBoards(boards.map(b =>
        b.id === boardId ? { ...b, isStarred: !isStarred } : b
      ));
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const { recentBoards, starredBoards, ownBoards, sharedBoards, closedBoards } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = boards.filter(b => !q || b.name.toLowerCase().includes(q));
    const open = visible.filter(b => !b.isClosed);
    const byId = new Map(open.map(b => [b.id, b]));
    const isOwn = (b: Board) => user?.id == null || b.userId === user.id;
    return {
      recentBoards: recentIds.map(id => byId.get(id)).filter((b): b is Board => !!b),
      starredBoards: open.filter(b => b.isStarred),
      ownBoards: open.filter(isOwn),
      sharedBoards: open.filter(b => !isOwn(b)),
      closedBoards: visible.filter(b => b.isClosed),
    };
  }, [boards, query, recentIds, user?.id]);

  const renderGrid = (items: Board[], withCreate = false) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {items.map((board) => (
        <BoardTile
          key={board.id}
          board={board}
          onToggleStar={(e) => toggleStar(e, board.id, board.isStarred)}
        />
      ))}
      {withCreate && (
        <button
          onClick={() => setIsCreateOpen(true)}
          className="min-h-[104px] rounded-lg bg-muted hover:bg-muted/70 border border-transparent hover:border-border transition-colors flex flex-col items-center justify-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-5 h-5" />
          <span>Create new board</span>
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-8 sm:space-y-10" aria-busy="true">
        <div className="h-9 rounded-md bg-muted animate-pulse" />
        {[0, 1].map((section) => (
          <div key={section}>
            <div className="h-5 w-40 mb-4 rounded bg-muted animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {Array.from({ length: section === 0 ? 4 : 3 }).map((_, i) => (
                <div key={i} className="rounded-lg overflow-hidden border bg-card">
                  <div className="h-16 sm:h-20 bg-muted animate-pulse" />
                  <div className="px-2.5 py-3">
                    <div className="h-3 w-2/3 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const hasResults = recentBoards.length + ownBoards.length + sharedBoards.length + closedBoards.length > 0;

  return (
    <div className="space-y-8 sm:space-y-10">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search boards"
            className="pl-9"
          />
        </div>
        {canCreate && (
          <Button onClick={() => setIsCreateOpen(true)} className="shrink-0">
            <Plus className="w-4 h-4 sm:mr-1" />
            <span className="hidden sm:inline">Create</span>
          </Button>
        )}
      </div>

      {!query && recentBoards.length > 0 && (
        <BoardSection icon={<Clock className="w-5 h-5" />} title="Recently viewed">
          {renderGrid(recentBoards)}
        </BoardSection>
      )}

      {starredBoards.length > 0 && (
        <BoardSection icon={<Star className="w-5 h-5" />} title="Starred boards">
          {renderGrid(starredBoards)}
        </BoardSection>
      )}

      {(ownBoards.length > 0 || (canCreate && !query)) && (
        <BoardSection
          badge={<WorkspaceBadge letter="Y" className="bg-gradient-to-br from-violet-500 to-fuchsia-500" />}
          title="Your boards"
          count={ownBoards.length}
          caps
        >
          {renderGrid(ownBoards, canCreate && !query)}
        </BoardSection>
      )}

      {sharedBoards.length > 0 && (
        <BoardSection
          badge={<WorkspaceBadge icon={<Users className="w-4 h-4" />} className="bg-gradient-to-br from-sky-500 to-blue-600" />}
          title="Shared with you"
          count={sharedBoards.length}
          caps
        >
          {renderGrid(sharedBoards)}
        </BoardSection>
      )}

      {query && !hasResults && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No boards match &quot;{query}&quot;
        </div>
      )}

      {closedBoards.length > 0 && (
        <div className="space-y-4">
          <Button variant="outline" size="sm" onClick={() => setShowClosed(v => !v)}>
            <Archive className="w-4 h-4 mr-2" />
            {showClosed ? "Hide closed boards" : `View all closed boards (${closedBoards.length})`}
          </Button>
          {showClosed && renderGrid(closedBoards)}
        </div>
      )}

      {boards.length === 0 && (
        <div className="text-center py-12">
          <LayoutGrid className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            You don&apos;t have any boards yet
          </h3>
          <p className="text-muted-foreground mb-4">
            {canCreate
              ? "Create your first board and start managing your tasks"
              : "Boards you are added to will appear here"}
          </p>
        </div>
      )}

      <Dialog open={canCreate && isCreateOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Board</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="rounded-lg overflow-hidden border">
              <div className="h-20" style={{ background: newBoardBackground }} />
              <div className="px-3 py-2 text-sm font-medium truncate" dir="auto">
                {newBoardName || "Board Name"}
              </div>
            </div>

            <div>
              <Label>Background</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded-md transition-transform ${
                      newBoardBackground === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewBoardBackground(color)}
                  />
                ))}
              </div>
            </div>

            <div>
              <Label>Project</Label>
              <Select value={newBoardProject} onValueChange={handleProjectChange}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  <SelectItem value="new">Create new project</SelectItem>
                  <SelectItem value="none">No project</SelectItem>
                  {boardlessProjects.length > 0 && <SelectSeparator />}
                  {boardlessProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || "#3b82f6" }}
                      />
                      <span dir="auto" className="truncate">{project.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="board-name">Board Name</Label>
              <Input
                id="board-name"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createBoard(); }}
                placeholder="Enter board name"
                className="mt-1"
                autoFocus
              />
            </div>

            <Button
              onClick={createBoard}
              disabled={!newBoardName.trim() || creating}
              className="w-full"
            >
              Create Board
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BoardSection({
  icon,
  badge,
  title,
  count,
  caps,
  children,
}: {
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  title: string;
  count?: number;
  caps?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-3 sm:mb-4">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {badge}
        <h2 className={cn("font-semibold", caps ? "text-sm uppercase tracking-wide text-muted-foreground" : "text-base")}>
          {title}
        </h2>
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function WorkspaceBadge({ letter, icon, className }: { letter?: string; icon?: React.ReactNode; className?: string }) {
  return (
    <span className={cn("w-8 h-8 rounded-md flex items-center justify-center text-white font-bold text-sm shrink-0", className)}>
      {icon ?? letter}
    </span>
  );
}

function BoardTile({
  board,
  onToggleStar,
}: {
  board: Board;
  onToggleStar: (e: React.MouseEvent) => void;
}) {
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelHover = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
  };

  return (
    <Link
      href={`/dashboard/boards/${board.id}`}
      onMouseEnter={() => {
        cancelHover();
        hoverTimer.current = setTimeout(() => prefetchBoard(board.id), 150);
      }}
      onMouseLeave={cancelHover}
      onFocus={() => prefetchBoard(board.id)}
      onTouchStart={() => prefetchBoard(board.id)}
      className={cn(
        "group flex flex-col rounded-lg overflow-hidden bg-card border shadow-sm hover:shadow-md transition-shadow",
        board.isClosed && "opacity-60"
      )}
    >
      <div className="relative h-16 sm:h-20" style={{ background: board.background }}>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors" />
      </div>
      <div className="flex items-center gap-1 pl-2.5 pr-1.5 py-1.5 min-h-10">
        <span dir="auto" className="flex-1 min-w-0 truncate text-sm font-medium">{board.name}</span>
        <button
          className={cn(
            "p-1 rounded shrink-0 transition-opacity hover:bg-muted",
            board.isStarred ? "opacity-100" : "opacity-0 group-hover:opacity-100 pointer-coarse:opacity-100"
          )}
          onClick={onToggleStar}
          title={board.isStarred ? "Unstar" : "Star"}
        >
          <Star
            className={cn(
              "w-4 h-4 transition-colors",
              board.isStarred ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground hover:text-yellow-400"
            )}
          />
        </button>
      </div>
    </Link>
  );
}
