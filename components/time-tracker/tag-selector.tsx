"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Tag, Plus, Search, Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Tag as TagType } from "@/lib/types"
import type { TagSelectorProps } from "@/types/time-tracker"

const TAG_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7",
  "#d946ef", "#ec4899", "#f43f5e", "#6b7280",
]

export function TagSelector({
  availableTags,
  selectedTagIds,
  onTagsChange,
  onCreateTag,
}: TagSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [newTagName, setNewTagName] = React.useState("")
  const [newTagColor, setNewTagColor] = React.useState("#3b82f6")
  const [isCreating, setIsCreating] = React.useState(false)

  const tagsArray = Array.isArray(availableTags) ? availableTags : []
  const selectedTags = tagsArray.filter(t => selectedTagIds.includes(t.id))

  const filteredTags = tagsArray.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleToggleTag = (tagId: number) => {
    if (selectedTagIds.includes(tagId)) {
      onTagsChange(selectedTagIds.filter(id => id !== tagId))
    } else {
      onTagsChange([...selectedTagIds, tagId])
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !onCreateTag) return

    setIsCreating(true)
    try {
      const newTag = await onCreateTag(newTagName.trim(), newTagColor)
      if (newTag) {
        onTagsChange([...selectedTagIds, newTag.id])
      }
      setCreateDialogOpen(false)
      setNewTagName("")
      setNewTagColor("#3b82f6")
    } catch (error) {
      console.error("Failed to create tag:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            selectedTags.length > 0 ? "text-cyan-500" : "text-muted-foreground"
          )}
          title={selectedTags.length > 0 ? selectedTags.map(t => t.name).join(", ") : "Add tags"}
        >
          <Tag className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="center">
        {/* Search */}
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8"
            />
          </div>
        </div>

        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="p-2 border-b flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs text-white"
                style={{ backgroundColor: tag.color || "#6b7280" }}
              >
                {tag.name}
                <button
                  onClick={() => handleToggleTag(tag.id)}
                  className="hover:opacity-80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Tags list */}
        <div className="max-h-48 overflow-auto py-1">
          {filteredTags.map(tag => {
            const isSelected = selectedTagIds.includes(tag.id)
            return (
              <button
                key={tag.id}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-sm",
                  isSelected && "bg-muted"
                )}
                onClick={() => handleToggleTag(tag.id)}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color || "#6b7280" }}
                />
                <span className="flex-1 truncate">{tag.name}</span>
                {isSelected && <Check className="h-4 w-4 text-cyan-500" />}
              </button>
            )
          })}
          {filteredTags.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground text-center">
              No tags found
            </div>
          )}
        </div>

        {/* Create tag */}
        {onCreateTag && (
          <div className="border-t p-1">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted text-left text-cyan-600 text-sm"
              onClick={() => {
                setNewTagName(search)
                setCreateDialogOpen(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Create new tag
            </button>
          </div>
        )}
      </PopoverContent>

      {/* Create Tag Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tag Name</label>
              <Input
                placeholder="Enter tag name..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-2">
                {TAG_COLORS.map(color => (
                  <button
                    key={color}
                    className={cn(
                      "w-7 h-7 rounded-full border-2 transition-all",
                      newTagColor === color ? "border-foreground scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewTagColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreating}
            >
              {isCreating ? "Creating..." : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Popover>
  )
}
