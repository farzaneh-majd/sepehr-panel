"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lock, Trash2 } from "lucide-react";
import type { Board } from "@/types/kanban";
import type { BoardEditModalProps } from "@/types/boards"
import { BACKGROUND_COLORS } from "@/types/boards"

export function BoardEditModal({
  board,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  canDelete = true,
  canEdit = true,
}: BoardEditModalProps) {
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || "");
  const [background, setBackground] = useState(board.background);
  const [visibility, setVisibility] = useState(board.visibility);
  const [autoNumberCards, setAutoNumberCards] = useState(!!board.autoNumberCards);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setName(board.name);
    setDescription(board.description || "");
    setBackground(board.background);
    setVisibility(board.visibility);
    setAutoNumberCards(!!board.autoNumberCards);
    setError(null);
    setShowDeleteConfirm(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSave = async () => {
    if (!name.trim()) return;

    setIsSaving(true);
    setError(null);
    const failure = await onUpdate({
      name: name.trim(),
      description,
      background,
      visibility,
      autoNumberCards,
    });
    setIsSaving(false);
    if (failure) setError(failure);
    else onClose();
  };

  const handleDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#1d2125] border-[#3d4449] text-gray-200">
        <DialogHeader>
          <DialogTitle className="text-gray-200">{canEdit ? "Edit Board" : "Board Settings"}</DialogTitle>
        </DialogHeader>

        {!canEdit && (
          <div className="flex items-start gap-2 rounded-md border border-[#3d4449] bg-white/5 p-3 text-sm text-gray-300">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            Only the board owner or admins can change these settings.
          </div>
        )}

        <div className="space-y-4 pt-4">
          {/* Board Preview */}
          <div
            className="h-24 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: background }}
          >
            <span className="text-white font-medium">
              {name || "Board Name"}
            </span>
          </div>

          {/* Board Name */}
          <div>
            <Label htmlFor="edit-board-name" className="text-gray-300">Board Name</Label>
            <Input
              id="edit-board-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter board name"
              className="mt-1 bg-[#22272b] border-[#3d4449] text-gray-200"
              disabled={!canEdit}
              autoFocus={canEdit}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="edit-board-description" className="text-gray-300">Description</Label>
            <textarea
              id="edit-board-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={canEdit ? "Add a description..." : "No description"}
              disabled={!canEdit}
              className="w-full mt-1 p-2 border rounded-md resize-none min-h-[80px] bg-[#22272b] border-[#3d4449] text-gray-200 placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {/* Background Colors */}
          <div>
            <Label className="text-gray-300">Background</Label>
            <div className="flex gap-2 mt-2">
              {BACKGROUND_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  disabled={!canEdit}
                  aria-label={color}
                  className={`w-8 h-8 rounded-md transition-transform disabled:cursor-not-allowed ${!canEdit && background !== color ? "opacity-40" : ""} ${
                    background === color ? "ring-2 ring-offset-2 ring-offset-[#1d2125] ring-blue-500 scale-110" : ""
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setBackground(color)}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <Label className="text-gray-300">Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility} disabled={!canEdit}>
              <SelectTrigger className="mt-1 bg-[#22272b] border-[#3d4449] text-gray-200">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent className="bg-[#22272b] border-[#3d4449]">
                <SelectItem value="private" className="text-gray-200 focus:bg-white/10">Private</SelectItem>
                <SelectItem value="workspace" className="text-gray-200 focus:bg-white/10">Workspace</SelectItem>
                <SelectItem value="public" className="text-gray-200 focus:bg-white/10">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-md border border-[#3d4449] bg-[#22272b] p-3">
            <div>
              <Label htmlFor="edit-board-auto-number" className="text-gray-300">Auto-number new cards</Label>
              <p className="mt-1 text-xs text-gray-500">
                New cards get the next number at the start of their title, e.g. &quot;58. Card title&quot;, continuing from the highest number on this board.
              </p>
            </div>
            <Switch
              id="edit-board-auto-number"
              checked={autoNumberCards}
              onCheckedChange={setAutoNumberCards}
              disabled={!canEdit}
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {canEdit ? (
              <>
                <Button
                  onClick={handleSave}
                  disabled={!name.trim() || isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:text-gray-200 hover:bg-white/10"
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                className="ms-auto text-gray-300 hover:text-gray-100 hover:bg-white/10"
                onClick={onClose}
              >
                Close
              </Button>
            )}
          </div>

          {/* Delete Section */}
          {canDelete && (
          <div className="pt-4 border-t border-[#3d4449]">
            {showDeleteConfirm ? (
              <div className="space-y-2">
                <p className="text-sm text-red-400">
                  Are you sure you want to delete this board? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                  >
                    Yes, Delete Board
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-gray-200 hover:bg-white/10"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Board
              </Button>
            )}
          </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
