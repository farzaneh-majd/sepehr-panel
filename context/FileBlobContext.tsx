"use client"

import * as React from "react"
import axiosInstance from "@/lib/axios-config"

interface FileBlobCache {
  [fileId: string]: string // fileId -> blob URL
}

interface FileBlobContextType {
  getBlobUrl: (fileId: number | string | null | undefined) => string | null
  getContentType: (fileId: number | string | null | undefined) => string | null
  preloadFile: (fileId: number | string) => Promise<void>
}

const FileBlobContext = React.createContext<FileBlobContextType | undefined>(undefined)

export function FileBlobProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = React.useState<FileBlobCache>({})
  const [typeCache, setTypeCache] = React.useState<{ [id: string]: string }>({})
  const loadingRef = React.useRef<Set<string>>(new Set())

  const fetchBlob = React.useCallback(async (fileId: number | string): Promise<void> => {
    const id = String(fileId)
    if (cache[id] || loadingRef.current.has(id)) return

    loadingRef.current.add(id)
    try {
      console.log("[FileBlobContext] Fetching fileId:", id)
      const res = await axiosInstance.get(`/files/${id}`, { responseType: "blob" })
      console.log("[FileBlobContext] Response status:", res.status, "content-type:", res.headers["content-type"], "size:", res.data?.size)
      if (res.status === 200) {
        const contentType = res.headers["content-type"] as string || "application/octet-stream"
        const blob = new Blob([res.data], { type: contentType })
        const url = URL.createObjectURL(blob)
        console.log("[FileBlobContext] Created blob URL:", url.slice(0, 40), "type:", contentType)
        setCache(prev => ({ ...prev, [id]: url }))
        setTypeCache(prev => ({ ...prev, [id]: contentType }))
      }
    } catch (err: any) {
      console.error("[FileBlobContext] Fetch failed for fileId:", id, err?.response?.status, err?.message)
    } finally {
      loadingRef.current.delete(id)
    }
  }, [cache])

  const getBlobUrl = React.useCallback((fileId: number | string | null | undefined): string | null => {
    if (!fileId) return null
    return cache[String(fileId)] || null
  }, [cache])

  const getContentType = React.useCallback((fileId: number | string | null | undefined): string | null => {
    if (!fileId) return null
    return typeCache[String(fileId)] || null
  }, [typeCache])

  const preloadFile = React.useCallback(async (fileId: number | string) => {
    await fetchBlob(fileId)
  }, [fetchBlob])

  return (
    <FileBlobContext.Provider value={{ getBlobUrl, getContentType, preloadFile }}>
      {children}
    </FileBlobContext.Provider>
  )
}

export function useFileBlob() {
  const ctx = React.useContext(FileBlobContext)
  if (!ctx) throw new Error("useFileBlob must be used within a FileBlobProvider")
  return ctx
}
