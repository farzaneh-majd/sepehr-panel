"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, X, MoreHorizontal, Shield, User as UserIcon, Eye, Crown } from "lucide-react";
import axiosInstance from "@/lib/axios-config";
import type { BoardMember } from "@/types/kanban";
import type { User, BoardMembersModalProps } from "@/types/boards"

export function BoardMembersModal({
  boardId,
  members,
  ownerId,
  isOpen,
  onClose,
  onMembersChange,
}: BoardMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await axiosInstance.get(`/board/${boardId}/members/search?q=${encodeURIComponent(query)}`);
      const users = res.data?.result ?? res.data;    
      const memberIds = members.map(m => m.userId);
      const filtered = users.filter((u: User) => !memberIds.includes(u.id) && u.id !== ownerId);
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // اضافه کردن عضو جدید
  const addMember = async (user: User, role: string = "member") => {
    setLoading(true);
    try {
      const res = await axiosInstance.post(`/board/${boardId}/members`, { userId: user.id, role });
      const newMember = res.data?.result ?? res.data;
      onMembersChange([...members, newMember]);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error adding member:", error);
    } finally {
      setLoading(false);
    }
  };

  // تغییر نقش عضو
  const updateMemberRole = async (memberId: number, role: string) => {
    try {
      await axiosInstance.put(`/board/${boardId}/members/${memberId}`, { role });
      onMembersChange(members.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch (error) {
      console.error("Error updating member role:", error);
    }
  };

  // حذف عضو
  const removeMember = async (memberId: number) => {
    try {
      await axiosInstance.delete(`/board/${boardId}/members/${memberId}`);
      onMembersChange(members.filter((m) => m.id !== memberId));
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="w-4 h-4 text-yellow-500" />;
      case "admin":
        return <Shield className="w-4 h-4 text-blue-500" />;
      case "observer":
        return <Eye className="w-4 h-4 text-gray-500" />;
      default:
        return <UserIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "owner":
        return "Owner";
      case "admin":
        return "Admin";
      case "observer":
        return "Observer";
      default:
        return "Member";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col bg-[#1d2125] border-[#3d4449] text-gray-200">
        <DialogHeader>
          <DialogTitle>Board Members</DialogTitle>
          <DialogDescription>Manage board members and permissions</DialogDescription>
        </DialogHeader>

        {/* Search Users */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search user by name or email..."
            className="pl-9 bg-[#22272b] border-[#3d4449] text-gray-200 placeholder:text-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="shrink-0 bg-[#22272b] rounded-lg border border-[#3d4449] max-h-40 overflow-y-auto">
            {searchResults.map((user) => (
              <button
                key={user.id}
                onClick={() => addMember(user)}
                disabled={loading}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback className="bg-[#3d4449] text-gray-200">
                    {(user.firstName?.[0] || "") + (user.lastName?.[0] || "")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-sm truncate">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="text-center text-gray-500 py-2">Searching...</div>
        )}

        {/* Members List */}
        <div className="flex flex-col min-h-0 flex-1 mt-2">
          <div className="text-sm text-gray-500 mb-2">Board Members ({members.length})</div>
          <div className="space-y-2 overflow-y-auto min-h-0 pr-1">
          {members.map((member, index) => (
            <div
              key={`member-${member.userId || member.id}-${index}`}
              className="flex items-center gap-3 p-3 bg-[#22272b] rounded-lg"
            >
              <Avatar className="w-10 h-10 shrink-0">
                <AvatarImage src={member.avatarUrl || ""} />
                <AvatarFallback className="bg-[#3d4449] text-gray-200">
                  {(member.firstName?.[0] || "") + (member.lastName?.[0] || "")}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate">
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="shrink-0">{getRoleIcon(member.role)}</span>
                </div>
                <div className="text-xs text-gray-500 truncate">{member.email}</div>
              </div>

              {member.role !== "owner" && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-gray-400 hover:text-gray-200"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-[#22272b] border-[#3d4449]">
                    <DropdownMenuItem
                      onClick={() => updateMemberRole(member.id, "admin")}
                      className="text-gray-200 focus:bg-white/10"
                    >
                      <Shield className="w-4 h-4 mr-2 text-blue-500" />
                      Make Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateMemberRole(member.id, "member")}
                      className="text-gray-200 focus:bg-white/10"
                    >
                      <UserIcon className="w-4 h-4 mr-2" />
                      Make Member
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => updateMemberRole(member.id, "observer")}
                      className="text-gray-200 focus:bg-white/10"
                    >
                      <Eye className="w-4 h-4 mr-2 text-gray-500" />
                      Make Observer
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => removeMember(member.id)}
                      className="text-red-500 focus:bg-red-500/10"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Remove from Board
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {member.role === "owner" && (
                <span className="shrink-0 text-xs text-yellow-500 px-2 py-1 bg-yellow-500/10 rounded">
                  {getRoleLabel(member.role)}
                </span>
              )}
            </div>
          ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
