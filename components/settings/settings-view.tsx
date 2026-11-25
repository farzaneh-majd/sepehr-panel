"use client"

import * as React from "react"
import axios from "axios"
import { deleteCookie } from "cookies-next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react"
import axiosInstance from "@/lib/axios-config"
import { useUser } from "@/context/UserContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

type Tab = "profile" | "password"

function errorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  return error.response?.data?.message || fallback
}

export function SettingsView() {
  const router = useRouter()
  const { refreshUser } = useUser()
  const [tab, setTab] = React.useState<Tab>("profile")
  const [username, setUsername] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [showPasswords, setShowPasswords] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null)

  React.useEffect(() => {
    axiosInstance.get("/user").then(({ data }) => {
      const account = data.result || data
      setUsername(account.username || "")
      setFirstName(account.firstName || "")
      setLastName(account.lastName || "")
    }).catch(() => setMessage({ type: "error", text: "Unable to load your account." }))
  }, [])

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setMessage(null)
    try {
      await axiosInstance.put("/user/profile", { username, firstName, lastName })
      await refreshUser()
      setMessage({ type: "success", text: "Your account details were saved to the local database." })
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Unable to update your account.") })
    } finally {
      setLoading(false)
    }
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    setMessage(null)
    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "The new password must be at least 8 characters." })
      return
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "The new passwords do not match." })
      return
    }
    setLoading(true)
    try {
      await axiosInstance.put("/user/password", { currentPassword, newPassword })
      deleteCookie("access")
      deleteCookie("refresh")
      router.replace("/login")
    } catch (error) {
      setMessage({ type: "error", text: errorMessage(error, "Unable to change your password.") })
      setLoading(false)
    }
  }

  return (
    <main className="min-h-svh bg-[#f4f5f7] px-4 py-8 text-[#172b4d] sm:px-6">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => router.back()} className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#0c66e4] hover:underline">
          <ArrowLeft className="size-4" /> Back
        </button>
        <div className="mb-6">
          <h1 className="text-3xl font-semibold">Account settings</h1>
          <p className="mt-1 text-[#44546f]">Update your local Sepehr Panel account.</p>
        </div>

        <div className="mb-5 flex gap-2 rounded-lg border border-[#dfe1e6] bg-white p-1.5">
          <button type="button" onClick={() => { setTab("profile"); setMessage(null) }} className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium", tab === "profile" ? "bg-[#e9f2ff] text-[#0c66e4]" : "text-[#44546f] hover:bg-[#f1f2f4]")}>
            <UserRound className="size-4" /> Username and profile
          </button>
          <button type="button" onClick={() => { setTab("password"); setMessage(null) }} className={cn("flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium", tab === "password" ? "bg-[#e9f2ff] text-[#0c66e4]" : "text-[#44546f] hover:bg-[#f1f2f4]")}>
            <LockKeyhole className="size-4" /> Password
          </button>
        </div>

        {message && <div role="status" className={cn("mb-5 rounded-md border px-4 py-3 text-sm", message.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800")}>{message.text}</div>}

        {tab === "profile" ? (
          <Card className="border-[#dfe1e6] shadow-sm">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your username is used to sign in. Email is not required.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveProfile} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={80} required autoComplete="username" />
                  <p className="text-xs text-[#626f86]">Letters, numbers, dots, underscores and hyphens are allowed.</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="firstName">First name</Label><Input id="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} maxLength={100} /></div>
                  <div className="space-y-2"><Label htmlFor="lastName">Last name</Label><Input id="lastName" value={lastName} onChange={(event) => setLastName(event.target.value)} maxLength={100} /></div>
                </div>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save changes"}</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-[#dfe1e6] shadow-sm">
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>After changing it, you will sign in again using the new password.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={changePassword} className="space-y-5">
                {[
                  ["currentPassword", "Current password", currentPassword, setCurrentPassword, "current-password"],
                  ["newPassword", "New password", newPassword, setNewPassword, "new-password"],
                  ["confirmPassword", "Confirm new password", confirmPassword, setConfirmPassword, "new-password"],
                ].map(([id, label, value, setter, autoComplete]) => (
                  <div key={id as string} className="space-y-2">
                    <Label htmlFor={id as string}>{label as string}</Label>
                    <div className="relative">
                      <Input id={id as string} type={showPasswords ? "text" : "password"} value={value as string} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<string>>)(event.target.value)} minLength={id === "currentPassword" ? undefined : 8} required autoComplete={autoComplete as string} className="pr-11" />
                      <button type="button" onClick={() => setShowPasswords((shown) => !shown)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#626f86]" aria-label={showPasswords ? "Hide passwords" : "Show passwords"}>{showPasswords ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
                    </div>
                  </div>
                ))}
                <Button type="submit" disabled={loading}>{loading ? "Changing..." : "Change password"}</Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
