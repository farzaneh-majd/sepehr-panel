"use client"

import Link from "next/link"
import { Boxes, ChevronRight, LogOut, SquareKanban } from "lucide-react"
import { deleteCookie } from "cookies-next"
import { useRouter } from "next/navigation"
import { useUser } from "@/context/UserContext"

const choices = [
  { title: "Kanban Boards", description: "Plan work, collaborate on cards, track bugs, and manage delivery.", href: "/dashboard/boards", icon: SquareKanban, color: "bg-[#0c66e4]" },
  { title: "Inventory", description: "Track stock, locations, quantities, and the people who changed each item.", href: "/dashboard/inventory", icon: Boxes, color: "bg-[#00875a]" },
]

export function DashboardChooser() {
  const { user } = useUser()
  const router = useRouter()
  const name = [user?.firstName ?? user?.first_name, user?.lastName ?? user?.last_name].filter(Boolean).join(" ") || user?.email || "User"
  const logout = () => { deleteCookie("access"); deleteCookie("refresh"); router.replace("/login") }

  return (
    <main className="min-h-svh bg-[#f4f5f7] text-[#172b4d]">
      <header className="border-b border-[#dfe1e6] bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><div><p className="text-lg font-bold">Sepehr Panel</p><p className="text-xs text-[#626f86]">Workspace selector</p></div><div className="flex items-center gap-3"><span className="hidden text-sm text-[#44546f] sm:block">Signed in as <strong>{name}</strong></span><button onClick={logout} className="rounded-md p-2 text-[#44546f] hover:bg-[#f1f2f4]" title="Log out"><LogOut className="size-4" /></button></div></div></header>
      <section className="mx-auto max-w-5xl px-5 py-12"><p className="text-sm font-semibold uppercase tracking-wide text-[#0c66e4]">Choose a dashboard</p><h1 className="mt-2 text-3xl font-bold">What would you like to manage?</h1><p className="mt-2 text-[#626f86]">Your activity is recorded against your signed-in account.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">{choices.map(({ title, description, href, icon: Icon, color }) => <Link key={title} href={href} className="group rounded-xl border border-[#dfe1e6] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[#85b8ff] hover:shadow-md"><div className="flex items-start gap-4"><div className={`flex size-12 shrink-0 items-center justify-center rounded-lg text-white ${color}`}><Icon className="size-6" /></div><div className="min-w-0 flex-1"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><ChevronRight className="size-5 text-[#626f86] transition group-hover:translate-x-1 group-hover:text-[#0c66e4]" /></div><p className="mt-2 text-sm leading-6 text-[#626f86]">{description}</p></div></div></Link>)}</div>
      </section>
    </main>
  )
}
