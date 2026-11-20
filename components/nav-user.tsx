"use client"

import { useRouter } from "next/navigation"
import { deleteCookie } from "cookies-next"
import Link from "next/link"
import { useState } from "react"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  Download,
  LogOut,
  Settings,
  Share,
  SquarePlus,
} from "lucide-react"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const { status: installStatus, install } = usePwaInstall()
  const [iosHelpOpen, setIosHelpOpen] = useState(false)

  const handleInstall = () => {
    if (installStatus === "ios") setIosHelpOpen(true)
    else install()
  }

  const handleLogout = () => {
    deleteCookie("access")
    deleteCookie("refresh")
    router.push("/login")
  }

  // Generate initials from name
  const getInitials = () => {
    const parts = user.name.split(" ")
    const first = parts[0]?.[0] || ""
    const last = parts[1]?.[0] || ""
    return (first + last).toUpperCase() || "U"
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                <AvatarFallback className="rounded-lg bg-cyan-500 text-white">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
                  <AvatarFallback className="rounded-lg bg-cyan-500 text-white">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />            
            <DropdownMenuGroup>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/dashboard/settings">
                  <Settings />
                  Settings
                </Link>
              </DropdownMenuItem>              
              <DropdownMenuItem>
                <Bell />
                Notifications
              </DropdownMenuItem>
              {(installStatus === "prompt" || installStatus === "ios") && (
                <DropdownMenuItem onClick={handleInstall} className="cursor-pointer">
                  <Download />
                  Install app
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={iosHelpOpen} onOpenChange={setIosHelpOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Install Awan</DialogTitle>
              <DialogDescription>Add Awan to your home screen in Safari:</DialogDescription>
            </DialogHeader>
            <ol className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">1</span>
                Tap the Share button <Share className="h-4 w-4 text-cyan-600" />
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">2</span>
                Choose &quot;Add to Home Screen&quot; <SquarePlus className="h-4 w-4 text-cyan-600" />
              </li>
              <li className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-xs text-white">3</span>
                Tap &quot;Add&quot;
              </li>
            </ol>
          </DialogContent>
        </Dialog>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
