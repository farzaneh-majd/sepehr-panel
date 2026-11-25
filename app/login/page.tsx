import type { Metadata } from "next"
import { PanelsTopLeft } from "lucide-react"
import { LoginForm } from "@/components/login-form"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams
  return (
    <main className="flex min-h-svh items-center justify-center bg-gradient-to-br from-[#f4f5f7] via-white to-[#e9f2ff] px-4 py-8 sm:p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-[#172b4d]">
          <div className="flex size-14 items-center justify-center rounded-xl bg-[#0c66e4] text-white shadow-lg"><PanelsTopLeft className="size-8" /></div>
          <div className="text-center"><h1 className="text-2xl font-bold tracking-tight">Sepehr Panel</h1><p className="mt-1 text-sm text-[#44546f]">Boards and inventory, in one workspace</p></div>
        </div>
        <LoginForm deactivatedNotice={reason === "deactivated"} />
      </div>
    </main>
  )
}
