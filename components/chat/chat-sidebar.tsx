"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  Hash,
  Lock,
  MessageSquare,
  Plus,
  AtSign,
  Users,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios-config"
import type { ChannelWithDetails, UserForChat } from "@/types/chat"

interface UserData {
  id: number
  role: string
  [key: string]: any
}

interface DirectMessageItem {
  id: number
  user1Id: number
  user2Id: number
  channelId: number
  createdAt: string
  otherUser: UserForChat
  lastMessage?: { content: string; createdAt: string; userId: number } | null
}

interface ChatSidebarProps extends React.ComponentProps<typeof Sidebar> {
  channels: {
    myChannels: ChannelWithDetails[]
    publicChannels: ChannelWithDetails[]
  }
  directMessages: DirectMessageItem[]
  users: UserForChat[]
  selectedChannel: ChannelWithDetails | null
  onSelectChannel: (channel: ChannelWithDetails) => void
  onJoinChannel: (channelId: number) => void
  onStartDirectMessage: (userId: number) => void
  onCreateChannel: () => void
  onSelectDM: (channelId: number) => void
}

const navItems = [
  {
    title: "Channels",
    icon: Hash,
    type: "channels",
  },
  {
    title: "Direct Messages",
    icon: MessageSquare,
    type: "dms",
  },
  {
    title: "Team",
    icon: Users,
    type: "users",
  },
]

export function ChatSidebar({
  channels,
  directMessages,
  users,
  selectedChannel,
  onSelectChannel,
  onJoinChannel,
  onStartDirectMessage,
  onCreateChannel,
  onSelectDM,
  ...props
}: ChatSidebarProps) {
  const [user, setUser] = useState<UserData | null>(null)
  const [activeItem, setActiveItem] = React.useState(navItems[0])
  const [searchQuery, setSearchQuery] = React.useState("")
  const { setOpen } = useSidebar()
  const currentUserId = user?.id ? user.id : null

  // Fetch user data via API
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get("/user")
        if (response.data.result) {
          setUser(response.data.result)
        }
      } catch (error) {
        console.error("Failed to fetch user:", error)
      }
    }
    fetchUser()
  }, [])

  const sessionUser = user ? {
    name: user.name || user.email?.split("@")[0] || "User",
    email: user.email || "",
    avatar: user.avatarUrl || "",
  } : {
    name: "User",
    email: "",
    avatar: "",
  }

  const getChannelIcon = (type: string) => {
    switch (type) {
      case "private":
        return <Lock className="h-4 w-4" />
      case "direct":
        return <AtSign className="h-4 w-4" />
      default:
        return <Hash className="h-4 w-4" />
    }
  }

  const getInitials = (firstName?: string | null, lastName?: string | null, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
    if (firstName) {
      return firstName.substring(0, 2).toUpperCase()
    }
    if (email) {
      return email.substring(0, 2).toUpperCase()
    }
    return "??"
  }

  const getUserName = (user: { firstName?: string | null; lastName?: string | null; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.firstName) {
      return user.firstName
    }
    return user.email.split("@")[0]
  }

  // Filter items based on search
  const filteredChannels = channels.myChannels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredPublicChannels = channels.publicChannels.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredDMs = directMessages.filter(dm =>
    getUserName(dm.otherUser).toLowerCase().includes(searchQuery.toLowerCase())
  )
  const filteredUsers = users.filter(u =>
    u.id !== currentUserId &&
    getUserName(u).toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <Sidebar
      collapsible="icon"
      className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
      {...props}
    >
      {/* First sidebar - icons only */}
      <Sidebar
        collapsible="none"
        className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="/dashboard">
                  <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                    <MessageSquare className="size-4" />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">Team Chat</span>
                    <span className="truncate text-xs">Workspace</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{
                        children: item.title,
                        hidden: false,
                      }}
                      onClick={() => {
                        setActiveItem(item)
                        setOpen(true)
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={sessionUser} />
        </SidebarFooter>
      </Sidebar>

      {/* Second sidebar - content */}
      <Sidebar collapsible="none" className="hidden flex-1 md:flex">
        <SidebarHeader className="gap-3.5 border-b p-4">
          <div className="flex w-full items-center justify-between">
            <div className="text-foreground text-base font-medium">
              {activeItem?.title}
            </div>
            {activeItem?.type === "channels" && (
              <button
                onClick={onCreateChannel}
                className="text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <SidebarInput
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup className="px-0">
            <SidebarGroupContent>
              {/* Channels View */}
              {activeItem?.type === "channels" && (
                <>
                  {filteredChannels.filter(c => c.type !== 'direct').map((channel) => (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel)}
                      className={cn(
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 border-b p-4 text-sm leading-tight last:border-b-0",
                        selectedChannel?.id === channel.id && "bg-sidebar-accent"
                      )}
                    >
                      {getChannelIcon(channel.type)}
                      <span className="flex-1 truncate text-left">{channel.name}</span>
                    </button>
                  ))}

                  {filteredPublicChannels.length > 0 && (
                    <>
                      <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                        Browse Channels
                      </div>
                      {filteredPublicChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => onJoinChannel(channel.id)}
                          className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 border-b p-4 text-sm leading-tight last:border-b-0"
                        >
                          {getChannelIcon(channel.type)}
                          <span className="flex-1 truncate text-left">{channel.name}</span>
                          <Plus className="h-3 w-3" />
                        </button>
                      ))}
                    </>
                  )}
                </>
              )}

              {/* Direct Messages View */}
              {activeItem?.type === "dms" && (
                <>
                  {filteredDMs.map((dm) => (
                    <button
                      key={dm.id}
                      onClick={() => onSelectDM(dm.channelId)}
                      className={cn(
                        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 border-b p-4 text-sm leading-tight last:border-b-0",
                        selectedChannel?.id === dm.channelId && "bg-sidebar-accent"
                      )}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={dm.otherUser?.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(dm.otherUser?.firstName, dm.otherUser?.lastName, dm.otherUser?.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="truncate font-medium">{getUserName(dm.otherUser)}</div>
                        {dm.lastMessage && (
                          <div className="truncate text-xs text-muted-foreground">
                            {dm.lastMessage.content}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}

                  <div className="px-4 py-2 text-xs text-muted-foreground border-b">
                    Start a conversation
                  </div>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onStartDirectMessage(user.id)}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 border-b p-4 text-sm leading-tight last:border-b-0"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-left">{getUserName(user)}</span>
                      <Plus className="h-3 w-3" />
                    </button>
                  ))}
                </>
              )}

              {/* Team View */}
              {activeItem?.type === "users" && (
                <>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => onStartDirectMessage(user.id)}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex w-full items-center gap-2 border-b p-4 text-sm leading-tight last:border-b-0"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(user.firstName, user.lastName, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="truncate font-medium">{getUserName(user)}</div>
                        <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    </Sidebar>
  )
}
