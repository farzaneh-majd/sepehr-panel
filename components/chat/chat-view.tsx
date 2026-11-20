"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useUser } from "@/context/UserContext";
import { format } from "@/lib/date";
import {
  Hash,
  Lock,
  MessageSquare,
  Send,
  Smile,
  MoreVertical,
  Edit2,
  Trash2,
  Reply,
  X,
  Plus,
  Settings,
  Users,
  ChevronDown,
  ChevronRight,
  AtSign,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import axiosInstance from "@/lib/axios-config";
import type { 
  ChannelWithDetails, 
  MessageWithUser, 
  ChannelMemberWithUser,
  UserForChat 
} from "@/types/chat";

// Emoji picker (simplified)
const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "👀", "💯", "🔥"];

interface DirectMessageItem {
  id: number;
  user1Id: number;
  user2Id: number;
  channelId: number;
  createdAt: string;
  otherUser: UserForChat;
  lastMessage?: { content: string; createdAt: string; userId: number } | null;
}

interface MessageReaction {
  emoji: string;
  userId: number;
}

interface ChatViewProps {
  initialChannelId?: number;
}

export function ChatView({ initialChannelId }: ChatViewProps) {
  const { user: contextUser } = useUser();
  const [channels, setChannels] = useState<{
    myChannels: ChannelWithDetails[];
    publicChannels: ChannelWithDetails[];
  }>({ myChannels: [], publicChannels: [] });
  const [directMessages, setDirectMessages] = useState<DirectMessageItem[]>([]);
  const [users, setUsers] = useState<UserForChat[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<ChannelWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithUser[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberWithUser[]>([]);
  const [threadParent, setThreadParent] = useState<MessageWithUser | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageWithUser | null>(null);
  const [editContent, setEditContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDesc, setNewChannelDesc] = useState("");
  const [newChannelType, setNewChannelType] = useState<"public" | "private">("public");

   // Get current user info
  const currentUserId = contextUser?.id ?? null
  // const isAdmin = contextUser?.role === "admin"

  // Fetch channels
  const fetchChannels = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/chat/channels");
      setChannels(res.data?.result ?? res.data);
    } catch (error) {
      console.error("Failed to fetch channels:", error);
    }
  }, []);

  // Fetch direct messages
  const fetchDirectMessages = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/chat/direct");
      const dmData = res.data?.result ?? res.data; setDirectMessages(Array.isArray(dmData) ? dmData : []);
    } catch (error) {
      console.error("Failed to fetch DMs:", error);
    }
  }, []);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await axiosInstance.get("/chat/users");
      const usersData = res.data?.result ?? res.data; setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  }, []);

  // Fetch messages for a channel
  const fetchMessages = useCallback(async (channelId: number) => {
    setMessagesLoading(true);
    try {
      const res = await axiosInstance.get(`/chat/messages?channelId=${channelId}`);
      const msgsData = res.data?.result ?? res.data; setMessages(Array.isArray(msgsData) ? msgsData : []);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  // Fetch channel details
  const fetchChannelDetails = useCallback(async (channelId: number) => {
    try {
      const res = await axiosInstance.get(`/chat/channels/${channelId}`);
      const chData = res.data?.result ?? res.data; setSelectedChannel(chData);
      setChannelMembers(chData?.members || []);
    } catch (error) {
      console.error("Failed to fetch channel details:", error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchChannels(), fetchDirectMessages(), fetchUsers()]);
      } catch (error) {
        console.error("Failed to load chat data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchChannels, fetchDirectMessages, fetchUsers]);

  // Select initial channel
  useEffect(() => {
    const selectInitialChannel = async () => {
      if (!loading && (channels.myChannels?.length ?? 0) > 0 && !selectedChannel) {
        const myChannels = channels.myChannels ?? [];
        const initialChannel = initialChannelId 
          ? myChannels.find(c => c.id === initialChannelId) || myChannels[0]
          : myChannels[0];
        if (initialChannel) {
          setSelectedChannel(initialChannel);
          setThreadParent(null);
          await Promise.all([
            fetchMessages(initialChannel.id),
            fetchChannelDetails(initialChannel.id),
          ]);
        }
      }
    };
    selectInitialChannel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, channels.myChannels, initialChannelId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!selectedChannel) return;
    
    const interval = setInterval(() => {
      fetchMessages(selectedChannel.id);
    }, 2000);

    return () => clearInterval(interval);
  }, [selectedChannel, fetchMessages]);

  const selectChannel = async (channel: ChannelWithDetails) => {
    setSelectedChannel(channel);
    setThreadParent(null);
    await Promise.all([
      fetchMessages(channel.id),
      fetchChannelDetails(channel.id),
    ]);
  };

  const startDirectMessage = async (userId: number) => {
    try {
      const res = await axiosInstance.post("/chat/direct", { targetUserId: userId });
      const dmData = res.data?.result ?? res.data;
      await fetchChannelDetails(dmData.channelId);
      await fetchMessages(dmData.channelId);
      await fetchDirectMessages();
    } catch (error) {
      console.error("Failed to start DM:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedChannel) return;

    try {
      const res = await axiosInstance.post("/chat/messages", {
        content: newMessage,
        channelId: selectedChannel.id,
        parentId: threadParent?.id,
      });

      const msgData = res.data?.result ?? res.data;
      setMessages((prev) => [...prev, msgData]);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const updateMessage = async () => {
    if (!editContent.trim() || !editingMessage) return;

    try {
      await axiosInstance.put(`/chat/messages/${editingMessage.id}`, { content: editContent });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMessage.id
            ? { ...m, content: editContent, isEdited: true }
            : m
        )
      );
      setEditingMessage(null);
      setEditContent("");
    } catch (error) {
      console.error("Failed to update message:", error);
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (error) {
      console.error("Failed to delete message:", error);
    }
  };

  const addReaction = async (messageId: number, emoji: string) => {
    try {
      await axiosInstance.post(`/chat/messages/${messageId}/reactions`, { emoji });


      // Refresh messages to get updated reactions
      if (selectedChannel) {
        fetchMessages(selectedChannel.id);
      }
    } catch (error) {
      console.error("Failed to add reaction:", error);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;

    try {
      const res = await axiosInstance.post("/chat/channels", {
        name: newChannelName,
        description: newChannelDesc,
        type: newChannelType,
      });

      await fetchChannels();
      selectChannel(res.data?.result ?? res.data);
      setShowCreateChannel(false);
      setNewChannelName("");
      setNewChannelDesc("");
      setNewChannelType("public");
    } catch (error) {
      console.error("Failed to create channel:", error);
    }
  };

  const joinChannel = async (channelId: number) => {
    try {
      await axiosInstance.post(`/chat/channels/${channelId}/join`);
      await fetchChannels();
      const channel = (channels.publicChannels ?? []).find(c => c.id === channelId);
      if (channel) {
        selectChannel(channel);
      }
    } catch (error) {
      console.error("Failed to join channel:", error);
    }
  };

  const leaveChannel = async () => {
    if (!selectedChannel) return;

    try {
      await axiosInstance.delete(`/chat/channels/${selectedChannel.id}/members`);
      await fetchChannels();
      setSelectedChannel(null);
      setMessages([]);
    } catch (error) {
      console.error("Failed to leave channel:", error);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "private":
        return <Lock className="h-4 w-4" />;
      case "direct":
        return <AtSign className="h-4 w-4" />;
      default:
        return <Hash className="h-4 w-4" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }
    return format(date, "MMM d");
  };

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "??";
  };

  const getUserName = (user: { firstName?: string | null; lastName?: string | null; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return user.email.split("@")[0];
  };

  // Group messages by date
  const groupMessagesByDate = (msgs: MessageWithUser[]) => {
    const groups: { date: string; messages: MessageWithUser[] }[] = [];
    let currentDate = "";

    for (const msg of msgs) {
      const msgDate = formatDate(msg.createdAt || "");
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }

    return groups;
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-full bg-white text-gray-800">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 bg-gray-50 flex flex-col">
          {/* Workspace Header */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="font-bold text-lg">Team Chat</h1>
          </div>

          <ScrollArea className="flex-1">
            {/* Channels Section */}
            <div className="p-2">
              <button
                onClick={() => setChannelsExpanded(!channelsExpanded)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 w-full px-2 py-1"
              >
                {channelsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Channels
              </button>

              {channelsExpanded && (
                <div className="mt-1 space-y-0.5">
                  {(channels.myChannels ?? [])
                    .filter(c => c.type !== 'direct')
                    .map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => selectChannel(channel)}
                        className={cn(
                          "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-gray-200",
                          selectedChannel?.id === channel.id && "bg-gray-200 text-white"
                        )}
                      >
                        {getChannelIcon(channel.type)}
                        <span className="truncate">{channel.name}</span>
                      </button>
                    ))}

                  {/* Public channels to join */}
                  {(channels.publicChannels ?? []).length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs text-gray-400 mt-2">
                        Browse Channels
                      </div>
                      {(channels.publicChannels ?? []).map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => joinChannel(channel.id)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                        >
                          {getChannelIcon(channel.type)}
                          <span className="truncate">{channel.name}</span>
                          <Plus className="h-3 w-3 ml-auto" />
                        </button>
                      ))}
                    </>
                  )}

                  <button
                    onClick={() => setShowCreateChannel(true)}
                    className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Channel</span>
                  </button>
                </div>
              )}
            </div>

            {/* Direct Messages Section */}
            <div className="p-2">
              <button
                onClick={() => setDmsExpanded(!dmsExpanded)}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 w-full px-2 py-1"
              >
                {dmsExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
                Direct Messages
              </button>

              {dmsExpanded && (
                <div className="mt-1 space-y-0.5">
                  {directMessages.map((dm) => (
                    <button
                      key={dm.id}
                      onClick={() => fetchChannelDetails(dm.channelId).then(() => fetchMessages(dm.channelId))}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm hover:bg-gray-200",
                        selectedChannel?.id === dm.channelId && "bg-gray-200 text-white"
                      )}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={dm.otherUser?.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px] bg-gray-200">
                          {getInitials(dm.otherUser?.firstName, dm.otherUser?.lastName, dm.otherUser?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {getUserName(dm.otherUser)}
                      </span>
                    </button>
                  ))}

                  {/* Users to start DM */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm text-gray-500 hover:bg-gray-200 hover:text-gray-800">
                        <Plus className="h-4 w-4" />
                        <span>New Message</span>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-gray-50 border-gray-200">
                      {users
                        .filter(u => u.id !== currentUserId)
                        .map((user) => (
                          <DropdownMenuItem
                            key={user.id}
                            onClick={() => startDirectMessage(user.id)}
                            className="text-gray-800 focus:bg-gray-200 focus:text-white"
                          >
                            <Avatar className="h-5 w-5 mr-2">
                              <AvatarImage src={user.avatarUrl || ""} />
                              <AvatarFallback className="text-[10px] bg-gray-200">
                                {getInitials(user.firstName, user.lastName, user.email)}
                              </AvatarFallback>
                            </Avatar>
                            {getUserName(user)}
                          </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChannel ? (
            <>
              {/* Channel Header */}
              <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2">
                  {getChannelIcon(selectedChannel.type)}
                  <h2 className="font-semibold">
                    {selectedChannel.type === 'direct' 
                      ? channelMembers.find(m => m.userId !== currentUserId)?.user 
                        ? getUserName(channelMembers.find(m => m.userId !== currentUserId)!.user)
                        : 'Direct Message'
                      : selectedChannel.name}
                  </h2>
                  {selectedChannel.description && (
                    <span className="text-sm text-gray-500 hidden md:inline">
                      | {selectedChannel.description}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-500 hover:text-white hover:bg-gray-200"
                        onClick={() => setShowAddMembers(true)}
                      >
                        <Users className="h-4 w-4" />
                        <span className="ml-1 text-xs">{channelMembers.length}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Members</TooltipContent>
                  </Tooltip>

                  {selectedChannel.type !== 'direct' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-gray-500 hover:text-white hover:bg-gray-200"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-gray-50 border-gray-200">
                        <DropdownMenuItem 
                          className="text-gray-800 focus:bg-gray-200"
                          onClick={() => setShowAddMembers(true)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Channel Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-gray-200" />
                        <DropdownMenuItem
                          className="text-red-400 focus:bg-gray-200 focus:text-red-400"
                          onClick={leaveChannel}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Leave Channel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-gray-500">Loading messages...</div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <MessageSquare className="h-12 w-12 mb-4" />
                    <p>No messages yet</p>
                    <p className="text-sm">Be the first to send a message!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupMessagesByDate(messages).map((group) => (
                      <div key={group.date}>
                        <div className="flex items-center gap-2 my-4">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-xs text-gray-400 px-2">{group.date}</span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>

                        {group.messages.map((message, idx) => {
                          const showAvatar =
                            idx === 0 ||
                            group.messages[idx - 1]?.userId !== message.userId;

                          return (
                            <div
                              key={message.id}
                              className={cn(
                                "group flex gap-3 hover:bg-gray-50/50 p-1 rounded",
                                !showAvatar && "ml-11"
                              )}
                            >
                              {showAvatar && (
                                <Avatar className="h-8 w-8 flex-shrink-0">
                                  <AvatarImage src={message.user.avatarUrl || ""} />
                                  <AvatarFallback className="bg-gray-200 text-xs">
                                    {getInitials(message.user.firstName, message.user.lastName, message.user.email)}
                                  </AvatarFallback>
                                </Avatar>
                              )}

                              <div className="flex-1 min-w-0">
                                {showAvatar && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="font-semibold text-sm">
                                      {getUserName(message.user)}
                                    </span>
                                    <span className="text-xs text-gray-400">
                                      {formatTime(message.createdAt || "")}
                                    </span>
                                  </div>
                                )}

                                {editingMessage?.id === message.id ? (
                                  <div className="mt-1">
                                    <Input
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                          e.preventDefault();
                                          updateMessage();
                                        }
                                        if (e.key === "Escape") {
                                          setEditingMessage(null);
                                          setEditContent("");
                                        }
                                      }}
                                      className="bg-gray-200 border-gray-300"
                                      autoFocus
                                    />
                                    <div className="flex gap-2 mt-1 text-xs">
                                      <button
                                        onClick={updateMessage}
                                        className="text-blue-400 hover:underline"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingMessage(null);
                                          setEditContent("");
                                        }}
                                        className="text-gray-500 hover:underline"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm text-gray-800">
                                      {message.content}
                                      {message.isEdited && (
                                        <span className="text-xs text-gray-400 ml-1">(edited)</span>
                                      )}
                                    </p>

                                    {/* Reactions */}
                                    {message.reactions && message.reactions.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {Object.entries(
                                          message.reactions.reduce((acc: Record<string, number>, r: MessageReaction) => {
                                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                            return acc;
                                          }, {})
                                        ).map(([emoji, count]) => (
                                          <button
                                            key={emoji}
                                            onClick={() => addReaction(message.id, emoji)}
                                            className="px-2 py-0.5 text-xs bg-gray-200 rounded-full hover:bg-gray-200"
                                          >
                                            {emoji} {count as number}
                                          </button>
                                        ))}
                                      </div>
                                    )}

                                    {/* Reply count */}
                                    {message.replyCount && message.replyCount > 0 && (
                                      <button
                                        onClick={() => setThreadParent(message)}
                                        className="text-xs text-blue-400 hover:underline mt-1"
                                      >
                                        {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>

                              {/* Message Actions */}
                              <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1">
                                {QUICK_EMOJIS.slice(0, 3).map((emoji) => (
                                  <Tooltip key={emoji}>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => addReaction(message.id, emoji)}
                                        className="p-1 hover:bg-gray-200 rounded"
                                      >
                                        {emoji}
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>React with {emoji}</TooltipContent>
                                  </Tooltip>
                                ))}

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1 hover:bg-gray-200 rounded">
                                      <Smile className="h-4 w-4 text-gray-500" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent className="bg-gray-50 border-gray-200">
                                    <div className="flex gap-1 p-2">
                                      {QUICK_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => addReaction(message.id, emoji)}
                                          className="p-1 hover:bg-gray-200 rounded text-lg"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </DropdownMenuContent>
                                </DropdownMenu>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      onClick={() => setThreadParent(message)}
                                      className="p-1 hover:bg-gray-200 rounded"
                                    >
                                      <Reply className="h-4 w-4 text-gray-500" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent>Reply in thread</TooltipContent>
                                </Tooltip>

                                {message.userId === currentUserId && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="p-1 hover:bg-gray-200 rounded">
                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="bg-gray-50 border-gray-200">
                                      <DropdownMenuItem
                                        className="text-gray-800 focus:bg-gray-200"
                                        onClick={() => {
                                          setEditingMessage(message);
                                          setEditContent(message.content);
                                        }}
                                      >
                                        <Edit2 className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-red-400 focus:bg-gray-200"
                                        onClick={() => deleteMessage(message.id)}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Thread indicator */}
              {threadParent && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center gap-2">
                  <Reply className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-500">
                    Replying to {getUserName(threadParent.user)}
                  </span>
                  <button
                    onClick={() => setThreadParent(null)}
                    className="ml-auto text-gray-500 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-2 bg-gray-200 rounded-lg px-4 py-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${selectedChannel.type === 'direct' ? 'directly' : '#' + selectedChannel.name}`}
                    className="flex-1 bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-gray-800 placeholder:text-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-gray-500 hover:text-white hover:bg-gray-200"
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4" />
                <p>Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>

        {/* Create Channel Dialog */}
        <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
          <DialogContent className="bg-gray-50 border-gray-200 text-gray-800">
            <DialogHeader>
              <DialogTitle>Create a Channel</DialogTitle>
              <DialogDescription className="text-gray-500">
                Channels are where your team communicates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="channel-name">Name</Label>
                <Input
                  id="channel-name"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s/g, "-"))}
                  placeholder="e.g. marketing"
                  className="bg-gray-200 border-gray-300"
                />
              </div>

              <div>
                <Label htmlFor="channel-desc">Description (optional)</Label>
                <Input
                  id="channel-desc"
                  value={newChannelDesc}
                  onChange={(e) => setNewChannelDesc(e.target.value)}
                  placeholder="What's this channel about?"
                  className="bg-gray-200 border-gray-300"
                />
              </div>

              <div>
                <Label>Visibility</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={newChannelType === "public" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewChannelType("public")}
                    className={newChannelType !== "public" ? "border-gray-300 text-gray-500" : ""}
                  >
                    <Hash className="h-4 w-4 mr-1" />
                    Public
                  </Button>
                  <Button
                    variant={newChannelType === "private" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewChannelType("private")}
                    className={newChannelType !== "private" ? "border-gray-300 text-gray-500" : ""}
                  >
                    <Lock className="h-4 w-4 mr-1" />
                    Private
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateChannel(false)} className="border-gray-300">
                Cancel
              </Button>
              <Button onClick={createChannel} disabled={!newChannelName.trim()}>
                Create Channel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Members Dialog */}
        <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
          <DialogContent className="bg-gray-50 border-gray-200 text-gray-800">
            <DialogHeader>
              <DialogTitle>Channel Members</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-gray-500 text-sm">
                  {channelMembers.length} member{channelMembers.length !== 1 ? "s" : ""}
                </Label>
                <ScrollArea className="h-64 mt-2">
                  <div className="space-y-2">
                    {channelMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-gray-200"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.user.avatarUrl || ""} />
                          <AvatarFallback className="bg-gray-200 text-xs">
                            {getInitials(member.user.firstName, member.user.lastName, member.user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {getUserName(member.user)}
                          </div>
                          <div className="text-xs text-gray-500">{member.user.email}</div>
                        </div>
                        {member.role === "admin" && (
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddMembers(false)} className="border-gray-300">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
