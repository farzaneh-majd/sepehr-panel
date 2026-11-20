"use client"

import * as React from "react"
import axiosInstance from "@/lib/axios-config"

interface AvatarCache {
  [avatarId: string]: string
}

interface AvatarContextType {
  getAvatarUrl: (avatarId: number | string | null | undefined) => string | null
  preloadAvatar: (avatarId: number | string) => Promise<void>
  clearCache: () => void
}

const AvatarContext = React.createContext<AvatarContextType | undefined>(undefined)

export function AvatarProvider({ children }: { children: React.ReactNode }) {
  const [avatarCache, setAvatarCache] = React.useState<AvatarCache>({})
  const cacheRef = React.useRef<AvatarCache>({})
  const inFlightRef = React.useRef<Map<string, Promise<void>>>(new Map())

  const preloadAvatar = React.useCallback((avatarId: number | string): Promise<void> => {
    const id = String(avatarId)
    if (cacheRef.current[id]) return Promise.resolve()

    const pending = inFlightRef.current.get(id)
    if (pending) return pending

    const request = (async () => {
      try {
        const avatarRes = await axiosInstance.get(`/files/${avatarId}`, {
          responseType: "blob",
        })
        if (avatarRes.status === 200) {
          const blob = new Blob([avatarRes.data], { type: avatarRes.headers["content-type"] as string })
          const blobUrl = URL.createObjectURL(blob)
          cacheRef.current = { ...cacheRef.current, [id]: blobUrl }
          setAvatarCache(cacheRef.current)
        }
      } catch (error) {
        console.error(`Failed to fetch avatar ${avatarId}:`, error)
      } finally {
        inFlightRef.current.delete(id)
      }
    })()

    inFlightRef.current.set(id, request)
    return request
  }, [])

  const getAvatarUrl = React.useCallback((avatarId: number | string | null | undefined): string | null => {
    if (!avatarId) return null
    return avatarCache[String(avatarId)] || null
  }, [avatarCache])

  const clearCache = React.useCallback(() => {
    Object.values(cacheRef.current).forEach(url => URL.revokeObjectURL(url))
    cacheRef.current = {}
    setAvatarCache({})
  }, [])

  const value = React.useMemo(
    () => ({ getAvatarUrl, preloadAvatar, clearCache }),
    [getAvatarUrl, preloadAvatar, clearCache]
  )

  return (
    <AvatarContext.Provider value={value}>
      {children}
    </AvatarContext.Provider>
  )
}

export function useAvatar() {
  const context = React.useContext(AvatarContext)
  if (context === undefined) {
    throw new Error("useAvatar must be used within an AvatarProvider")
  }
  return context
}
