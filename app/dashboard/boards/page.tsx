import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { BoardsView } from "@/components/boards"

export const metadata: Metadata = { title: "Kanban Boards" }
export default function BoardsPage() { return <main className="min-h-svh bg-[#f4f5f7] text-[#172b4d]"><div className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><Link href="/dashboard" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#0c66e4] hover:underline"><ArrowLeft className="size-4" />Dashboard chooser</Link><h1 className="text-3xl font-bold">Kanban Boards</h1><p className="mb-7 mt-2 text-[#626f86]">Jira-style planning with collaborative cards and complete activity history.</p><BoardsView /></div></main> }
