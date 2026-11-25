"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useUser } from "@/context/UserContext"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/login")
  }, [loading, user, router])

  if (loading || !user) return <div className="flex min-h-svh items-center justify-center bg-[#f4f5f7]"><Loader2 className="size-8 animate-spin text-[#0c66e4]" /></div>
  return <>{children}</>
}
