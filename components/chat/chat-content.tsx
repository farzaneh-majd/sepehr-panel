"use client"

import * as React from "react"
import { useState, useEffect, useRef } from "react"
import { format } from "@/lib/date"
import {
  Hash, Lock, Send, Smile, MoreVertical, Edit2, Trash2,
  Reply, X, Users, Check, CheckCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useUser } from "@/context/UserContext"
import type { ChannelWithDetails, MessageWithUser, ChannelMemberWithUser } from "@/types/chat"

const QUICK_EMOJIS = ["👍", "❤️", "😂", "🎉", "🚀", "👀", "💯", "🔥"]

interface ChatContentProps {
  selectedChannel: ChannelWithDetails | null
  messages: MessageWithUser[]
  channelMembers: ChannelMemberWithUser[]
  messagesLoading: boolean
  onSendMessage: (content: string, parentId?: number) => Promise<void>
  onUpdateMessage: (messageId: number, content: string) => Promise<void>
  onDeleteMessage: (messageId: number) => Promise<void>
  onAddReaction: (messageId: number, emoji: string) => Promise<void>
  onLeaveChannel: () => Promise<void>
  onShowMembers: () => void
}

export function ChatContent({
  selectedChannel, messages, channelMembers, messagesLoading,
  onSendMessage, onUpdateMessage, onDeleteMessage, onAddReaction,
  onLeaveChannel, onShowMembers,
}: ChatContentProps) {
  const { user } = useUser()
  const currentUserId = user?.id ?? null
  const [newMessage, setNewMessage] = useState("")
  const [editingMessage, setEditingMessage] = useState<MessageWithUser | null>(null)
  const [editContent, setEditContent] = useState("")
  const [replyTo, setReplyTo] = useState<MessageWithUser | null>(null)
  const [showEmoji, setShowEmoji] = useState<number | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async () => {
    if (!newMessage.trim()) return
    await onSendMessage(newMessage, replyTo?.id)
    setNewMessage("")
    setReplyTo(null)
    inputRef.current?.focus()
  }

  const handleUpdateMessage = async () => {
    if (!editingMessage || !editContent.trim()) return
    await onUpdateMessage(editingMessage.id, editContent)
    setEditingMessage(null)
    setEditContent("")
  }

  const formatTime = (dateStr: string) => {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return "Today"
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
    return format(d, "EEE, MMM d")
  }

  const getInitials = (fn?: string | null, ln?: string | null) => {
    return ((fn?.[0] || "") + (ln?.[0] || "")).toUpperCase() || "?"
  }

  const getUserName = (u: any) => {
    if (u.firstName && u.lastName) return `${u.firstName} ${u.lastName}`
    if (u.firstName) return u.firstName
    return u.email?.split("@")[0] || "User"
  }

  // Group messages by date
  const groupedMessages = React.useMemo(() => {
    const groups: { date: string; messages: MessageWithUser[] }[] = []
    let lastDate = ""
    messages.forEach(msg => {
      const date = formatDate(msg.createdAt || "")
      if (date !== lastDate) {
        groups.push({ date, messages: [msg] })
        lastDate = date
      } else {
        groups[groups.length - 1].messages.push(msg)
      }
    })
    return groups
  }, [messages])

  if (!selectedChannel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-400">
          <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">Select a channel to start chatting</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col bg-white">
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 border-b bg-white shadow-sm">
          <div className="flex items-center gap-2">
            {selectedChannel.type === "private" ? <Lock className="w-4 h-4 text-gray-400" /> : <Hash className="w-4 h-4 text-gray-400" />}
            <span className="font-semibold text-gray-800">{selectedChannel.name}</span>
            {selectedChannel.description && <span className="text-xs text-gray-400 ml-2 hidden sm:inline">— {selectedChannel.description}</span>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-gray-500 gap-1" onClick={onShowMembers}>
              <Users className="w-4 h-4" />{channelMembers.length}
            </Button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-3" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f1f5f9' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }}>
          {messagesLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-3 border-gray-200 border-t-cyan-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-1 max-w-3xl mx-auto">
              {groupedMessages.map(group => (
                <div key={group.date}>
                  {/* Date separator */}
                  <div className="flex items-center justify-center my-4">
                    <span className="px-3 py-1 bg-white/80 backdrop-blur border rounded-full text-xs text-gray-500 shadow-sm">{group.date}</span>
                  </div>

                  {group.messages.map((message, idx) => {
                    const isMe = message.userId === currentUserId
                    const prevMsg = group.messages[idx - 1]
                    const showName = !prevMsg || prevMsg.userId !== message.userId
                    const isLast = idx === group.messages.length - 1 || group.messages[idx + 1]?.userId !== message.userId

                    return (
                      <div key={message.id} className={cn("flex mb-0.5", isMe ? "justify-end" : "justify-start")}>
                        {/* Avatar for others */}
                        {!isMe && (
                          <div className="w-8 mr-2 flex-shrink-0">
                            {isLast ? (
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="bg-cyan-100 text-cyan-700 text-xs">{getInitials(message.user?.firstName, message.user?.lastName)}</AvatarFallback>
                              </Avatar>
                            ) : <div className="w-8" />}
                          </div>
                        )}

                        <div className={cn("max-w-[75%] group relative", isMe ? "items-end" : "items-start")}>
                          {/* Name for others */}
                          {!isMe && showName && (
                            <div className="text-xs font-medium text-cyan-600 mb-0.5 ml-1">{getUserName(message.user)}</div>
                          )}

                          {/* Bubble */}
                          {editingMessage?.id === message.id ? (
                            <div className="bg-white border-2 border-cyan-200 rounded-xl p-3 shadow-sm">
                              <textarea
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="w-full resize-none text-sm border-none outline-none bg-transparent min-h-[40px]"
                                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleUpdateMessage() } if (e.key === "Escape") { setEditingMessage(null) } }}
                                autoFocus
                              />
                              <div className="flex gap-2 mt-1 text-xs">
                                <button onClick={handleUpdateMessage} className="text-cyan-600 hover:underline">Save</button>
                                <button onClick={() => setEditingMessage(null)} className="text-gray-400 hover:underline">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className={cn(
                              "rounded-2xl px-3 py-2 text-sm shadow-sm relative",
                              isMe
                                ? "bg-cyan-500 text-white rounded-br-md"
                                : "bg-white border border-gray-100 text-gray-800 rounded-bl-md",
                            )}>
                              {/* Reply reference */}
                              {message.parentId && (
                                <div className={cn("text-xs mb-1 pb-1 border-b", isMe ? "border-cyan-400/30 text-cyan-100" : "border-gray-200 text-gray-400")}>
                                  ↩ Reply
                                </div>
                              )}

                              <p className="whitespace-pre-wrap break-words">{message.content}</p>

                              <div className={cn("flex items-center gap-1 mt-0.5", isMe ? "justify-end" : "justify-start")}>
                                <span className={cn("text-[10px]", isMe ? "text-cyan-100" : "text-gray-400")}>{formatTime(message.createdAt || "")}</span>
                                {message.isEdited && <span className={cn("text-[10px]", isMe ? "text-cyan-200" : "text-gray-400")}>(edited)</span>}
                                {isMe && <CheckCheck className="w-3 h-3 text-cyan-200" />}
                              </div>
                            </div>
                          )}

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex gap-1 mt-0.5 ml-1">
                              {Object.entries(message.reactions.reduce((acc: Record<string, number>, r: any) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc
                              }, {})).map(([emoji, count]) => (
                                <button key={emoji}
                                  className="flex items-center gap-0.5 px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs border"
                                  onClick={() => onAddReaction(message.id, emoji)}>
                                  {emoji} <span className="text-gray-500">{count as number}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Hover actions */}
                          <div className={cn(
                            "absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white border rounded-lg shadow-md p-0.5",
                            isMe ? "right-full mr-1" : "left-full ml-1"
                          )}>
                            <Tooltip><TooltipTrigger asChild>
                              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => setShowEmoji(showEmoji === message.id ? null : message.id)}>
                                <Smile className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </TooltipTrigger><TooltipContent side="top"><p>React</p></TooltipContent></Tooltip>

                            <Tooltip><TooltipTrigger asChild>
                              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => { setReplyTo(message); inputRef.current?.focus() }}>
                                <Reply className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </TooltipTrigger><TooltipContent side="top"><p>Reply</p></TooltipContent></Tooltip>

                            {isMe && <>
                              <button className="p-1 hover:bg-gray-100 rounded" onClick={() => { setEditingMessage(message); setEditContent(message.content) }}>
                                <Edit2 className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                              <button className="p-1 hover:bg-red-50 rounded" onClick={() => onDeleteMessage(message.id)}>
                                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              </button>
                            </>}
                          </div>

                          {/* Emoji picker */}
                          {showEmoji === message.id && (
                            <div className="absolute top-full mt-1 z-10 bg-white border rounded-xl shadow-lg p-2 flex gap-1">
                              {QUICK_EMOJIS.map(e => (
                                <button key={e} className="text-lg hover:scale-125 transition-transform p-1"
                                  onClick={() => { onAddReaction(message.id, e); setShowEmoji(null) }}>{e}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Reply indicator */}
        {replyTo && (
          <div className="px-4 py-2 bg-gray-50 border-t flex items-center gap-2">
            <Reply className="w-4 h-4 text-cyan-500" />
            <div className="flex-1 text-xs text-gray-500 truncate">
              Replying to <span className="font-medium text-gray-700">{getUserName(replyTo.user)}</span>: {replyTo.content}
            </div>
            <button onClick={() => setReplyTo(null)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t bg-white">
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 bg-gray-50 border rounded-2xl px-4 py-2 focus-within:ring-2 focus-within:ring-cyan-200 focus-within:border-cyan-300 transition-all">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder="Type a message..."
                rows={1}
                className="w-full resize-none bg-transparent outline-none text-sm text-gray-800 placeholder:text-gray-400"
                style={{ minHeight: "24px", maxHeight: "120px" }}
              />
            </div>
            <Button
              size="icon"
              className={cn("rounded-full w-10 h-10 shrink-0 transition-all", newMessage.trim() ? "bg-cyan-500 hover:bg-cyan-600 shadow-md" : "bg-gray-200 text-gray-400")}
              onClick={handleSend}
              disabled={!newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
