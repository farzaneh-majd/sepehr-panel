"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import axiosInstance from "@/lib/axios-config"
import { useUser } from "@/context/UserContext"
import { Camera, User, Lock, Bell, Palette } from "lucide-react"
import type { UserData, SettingsTab } from "@/types/settings"

export function SettingsView() {
  const { refreshUser, avatarBlobUrl } = useUser()
  const [isLoading, setIsLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("profile")

  // Profile form
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [avatarId, setAvatarId] = React.useState<string>("")

  // Password form
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")

  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const initialLoadDone = React.useRef(false)

  React.useEffect(() => {
    async function loadUserData() {
      try {
        const res = await axiosInstance.get("/user")
        if (res.status === 200) {
          const userData: UserData = res.data.result || res.data
          setFirstName(userData.firstName || userData.first_name || "")
          setLastName(userData.lastName || userData.last_name || "")
          setEmail(userData.email || "")
          setAvatarId(userData.avatarId?.toString() || "")
        }
      } catch (error) {
        console.error("Failed to load user data:", error)
      } finally {
        initialLoadDone.current = true
      }
    }
    loadUserData()
  }, [refreshUser])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    setMessage(null)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await axiosInstance.post("/user/avatar", formData, {
        headers: { "Content-Type": undefined },
      })

      if (res.status === 200) {
        const newAvatarId = res.data.avatarId
        setAvatarId(newAvatarId?.toString() || "")
        setMessage({ type: "success", text: "Avatar uploaded successfully" })
        // Refresh user context to update avatar in sidebar
        await refreshUser()
      } else {
        setMessage({ type: "error", text: res.data.error || "Failed to upload avatar" })
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.error || error.message || "An error occurred"
      setMessage({ type: "error", text: errorMsg })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    try {
      const res = await axiosInstance.put("/user/profile", { firstName, lastName })

      if (res.status === 200) {
        setMessage({ type: "success", text: "Profile updated successfully" })
        // Refresh user context to update name in sidebar
        await refreshUser()
      } else {
        setMessage({ type: "error", text: res.data.error || "Failed to update profile" })
      }
    } catch (_error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match" })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" })
      return
    }

    setIsLoading(true)
    setMessage(null)

    try {
      const res = await axiosInstance.put("/user/password", { currentPassword, newPassword })

      if (res.status === 200) {
        setMessage({ type: "success", text: "Password changed successfully" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage({ type: "error", text: res.data.error || "Failed to change password" })
      }
    } catch (_error) {
      setMessage({ type: "error", text: "An error occurred" })
    } finally {
      setIsLoading(false)
    }
  }

  const getInitials = () => {
    const f = firstName?.[0] || ""
    const l = lastName?.[0] || ""
    return (f + l).toUpperCase() || "U"
  }

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: User },
    { id: "password" as const, label: "Password", icon: Lock },
    { id: "notifications" as const, label: "Notifications", icon: Bell },
    { id: "preferences" as const, label: "Preferences", icon: Palette },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <h1 className="text-2xl font-semibold text-slate-700">Settings</h1>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={cn(
              "px-6 py-3 text-sm font-medium flex items-center gap-2",
              activeTab === tab.id 
                ? "text-cyan-600 border-b-2 border-cyan-600 bg-white" 
                : "text-muted-foreground hover:text-foreground bg-slate-100"
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "mx-6 mt-4 p-3 rounded-md text-sm",
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {activeTab === "profile" && (
          <div className="max-w-2xl">
            {/* Avatar Section */}
            <div className="border rounded-lg mb-6">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Profile Picture</span>
              </div>
              <div className="p-6 flex items-center gap-6">
                <div className="relative">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-cyan-500 flex items-center justify-center">
                    {avatarBlobUrl ? (
                      <img
                        src={avatarBlobUrl}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                        key={avatarBlobUrl}
                      />
                    ) : (
                      <span className="text-2xl text-white font-medium">
                        {getInitials()}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-cyan-500 rounded-full text-white hover:bg-cyan-600 transition-colors"
                    disabled={isLoading}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="font-medium">{firstName} {lastName}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click the camera icon to upload a new photo. Max 2MB, JPEG/PNG/GIF/WebP.
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Form */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Personal Information</span>
              </div>
              <form onSubmit={handleProfileSubmit} className="p-6 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed
                  </p>
                </div>
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "password" && (
          <div className="max-w-2xl">
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Change Password</span>
              </div>
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                </div>
                <Separator />
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum 6 characters
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="bg-cyan-500 hover:bg-cyan-600"
                  >
                    {isLoading ? "Changing..." : "Change Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="max-w-2xl">
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Notification Settings</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="font-medium">NOTIFICATION TYPE</TableHead>
                    <TableHead className="font-medium">EMAIL</TableHead>
                    <TableHead className="font-medium">IN-APP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Weekly time summary</TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Project updates</TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Team invitations</TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Timer reminders</TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" />
                    </TableCell>
                    <TableCell>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="p-4 border-t">
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  Save Preferences
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "preferences" && (
          <div className="max-w-2xl space-y-6">
            {/* Time Format */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Time Format</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="timeFormat" value="12h" className="rounded" />
                    <span>12-hour (1:30 PM)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="timeFormat" value="24h" className="rounded" defaultChecked />
                    <span>24-hour (13:30)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Date Format */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Date Format</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="dateFormat" value="DD/MM/YYYY" className="rounded" defaultChecked />
                    <span>DD/MM/YYYY (31/12/2026)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="dateFormat" value="MM/DD/YYYY" className="rounded" />
                    <span>MM/DD/YYYY (12/31/2026)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="dateFormat" value="YYYY-MM-DD" className="rounded" />
                    <span>YYYY-MM-DD (2026-12-31)</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Week Start */}
            <div className="border rounded-lg">
              <div className="px-4 py-3 bg-slate-50 border-b">
                <span className="text-sm font-medium">Week Starts On</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="weekStart" value="saturday" className="rounded" defaultChecked />
                    <span>Saturday</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="weekStart" value="sunday" className="rounded" />
                    <span>Sunday</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="weekStart" value="monday" className="rounded" />
                    <span>Monday</span>
                  </label>
                </div>
              </div>
            </div>

            <Button className="bg-cyan-500 hover:bg-cyan-600">
              Save Preferences
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
