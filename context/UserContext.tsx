"use client"

import * as React from "react"
import { getCookie } from "cookies-next"
import axiosInstance from "@/lib/axios-config"

interface UserData {
  id?: number
  username?: string
  firstName?: string
  first_name?: string
  lastName?: string
  last_name?: string
  email?: string
  role?: string | null
  avatarId?: number | string
}

interface UserContextType {
  user: UserData | null
  avatarBlobUrl: string
  loading: boolean
  refreshUser: () => Promise<void>
  setAvatarBlobUrl: (url: string) => void
}

const UserContext = React.createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserData | null>(null)
  const [avatarBlobUrl, setAvatarBlobUrl] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const userRef = React.useRef<UserData | null>(null)
  userRef.current = user

  const fetchAvatarBlob = async (avatarId: number | string) => {
    try {
      const avatarRes = await axiosInstance.get(`/files/${avatarId}`, {
        responseType: "blob",
      })
      if (avatarRes.status === 200) {
        const blob = new Blob([avatarRes.data], { type: avatarRes.headers["content-type"] as string })
        const blobUrl = URL.createObjectURL(blob)
        setAvatarBlobUrl(blobUrl)
      }
    } catch (error) {
      console.error("Failed to fetch avatar:", error)
    }
  }

  const readCookie = (name: string) => {
    let value = getCookie(name) as string | undefined
    if (!value && typeof document !== "undefined") {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
      value = match ? decodeURIComponent(match[1]) : undefined
    }
    return value
  }

  const refreshUser = React.useCallback(async () => {
    if (!readCookie("access") && !readCookie("refresh")) {
      setUser(null)
      setAvatarBlobUrl("")
      setLoading(false)
      return
    }

    setLoading(true)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await axiosInstance.get("/user")
        const userData: UserData = res.data.result || res.data
        setUser(userData)
        if (userData.avatarId) {
          await fetchAvatarBlob(userData.avatarId)
        } else {
          setAvatarBlobUrl("")
        }
        break
      } catch (error) {
        console.error("Failed to fetch user:", error)
        if (!readCookie("access") && !readCookie("refresh")) break
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
    setLoading(false)
  }, [])

  React.useEffect(() => {
    refreshUser()
  }, [refreshUser])

  React.useEffect(() => {
    const checkSession = () => {
      if (!userRef.current || !readCookie("refresh")) return
      axiosInstance.get("/user").catch(() => {})
    }
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      if (!userRef.current) refreshUser()
      else checkSession()
    }
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") checkSession()
    }, 60000)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [refreshUser])

  return (
    <UserContext.Provider value={{ user, avatarBlobUrl, loading, refreshUser, setAvatarBlobUrl }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = React.useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
