"use client"

import * as React from "react"
import axiosInstance from "@/lib/axios-config"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { 
  LayoutGrid, 
  Plus, 
  Check, 
  ExternalLink,
  Unlink
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/lib/types"
import type { BoardList, CardLinkSelectorProps } from "@/types/time-tracker"

export function CardLinkSelector({
  task,
  projectId,
  onLinkToCard,
  onLinkToNewCard,
  onUnlink,
}: CardLinkSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [lists, setLists] = React.useState<BoardList[]>([])
  const [boardId, setBoardId] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [linking, setLinking] = React.useState(false)
  const [showNewCardDialog, setShowNewCardDialog] = React.useState(false)
  const [selectedListId, setSelectedListId] = React.useState<number | null>(null)

  // Fetch lists when popover opens
  React.useEffect(() => {
    if (open && projectId) {
      setLoading(true)
      axiosInstance.get(`/project/${projectId}/lists`)
        .then(res => {
          const data = res.data?.result ?? res.data;
          if (data.lists) {
            setLists(data.lists)
            setBoardId(data.boardId)
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [open, projectId])

  const handleLinkToCard = async (cardId: number) => {
    setLinking(true)
    try {
      await onLinkToCard(task.id, cardId)
      setOpen(false)
    } catch (error) {
      console.error("Failed to link:", error)
    } finally {
      setLinking(false)
    }
  }

  const handleCreateCardInList = async () => {
    if (!selectedListId) return
    setLinking(true)
    try {
      await onLinkToNewCard(task.id, selectedListId)
      setOpen(false)
      setShowNewCardDialog(false)
    } catch (error) {
      console.error("Failed to create card:", error)
    } finally {
      setLinking(false)
    }
  }

  const handleUnlink = async () => {
    setLinking(true)
    try {
      await onUnlink(task.id)
      setOpen(false)
    } catch (error) {
      console.error("Failed to unlink:", error)
    } finally {
      setLinking(false)
    }
  }

  const isLinked = task.cardId !== null && task.cardId !== undefined

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isLinked ? "text-blue-500" : "text-muted-foreground"
            )}
            title={isLinked ? "Linked to Kanban card" : "Link to Kanban card"}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Link to Kanban Board</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {isLinked 
                ? "This task is linked to a Kanban card" 
                : "Add this task as a card on the Kanban board"
              }
            </p>
          </div>

          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : lists.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No board linked to this project
            </div>
          ) : (
            <div className="max-h-64 overflow-auto py-1">
              {/* If linked, show unlink option */}
              {isLinked && (
                <div className="border-b pb-2 mb-2">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm"
                    onClick={() => boardId && window.open(`/dashboard/boards/${boardId}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open in Kanban Board
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-destructive/10 text-left text-sm text-destructive"
                    onClick={handleUnlink}
                    disabled={linking}
                  >
                    <Unlink className="h-4 w-4" />
                    Unlink from card
                  </button>
                </div>
              )}

              {/* Lists and cards */}
              {lists.map((list) => (
                <div key={list.id} className="py-1">
                  <div className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase">
                    {list.name}
                  </div>
                  
                  {/* Existing cards */}
                  {list.cards.filter(c => !c.taskId || c.taskId === task.cardId).map((card) => {
                    const isLinkedToThis = card.id === task.cardId
                    return (
                      <button
                        key={card.id}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm",
                          isLinkedToThis && "bg-muted"
                        )}
                        onClick={() => !isLinkedToThis && handleLinkToCard(card.id)}
                        disabled={linking || isLinkedToThis}
                      >
                        <span className="flex-1 truncate">{card.title}</span>
                        {isLinkedToThis && <Check className="h-4 w-4 text-blue-500" />}
                      </button>
                    )
                  })}

                  {/* Add new card button */}
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm text-blue-600"
                    onClick={() => {
                      setSelectedListId(list.id)
                      setShowNewCardDialog(true)
                    }}
                    disabled={linking}
                  >
                    <Plus className="h-4 w-4" />
                    Create new card in {list.name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Create Card Dialog */}
      <Dialog open={showNewCardDialog} onOpenChange={setShowNewCardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Card from Task</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              This will create a new card with the title <strong>&quot;{task.name}&quot;</strong> and link it to this task.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewCardDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCardInList} disabled={linking}>
              {linking ? "Creating..." : "Create Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
