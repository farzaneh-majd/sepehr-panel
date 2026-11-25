import type { Metadata } from "next"
import { Suspense } from "react"
import { KanbanBoard } from "@/components/boards"
import { BoardSkeleton } from "@/components/boards/board-skeleton"

export const metadata: Metadata = { title: "Board" }
export default async function BoardPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <div className="h-dvh w-full overflow-hidden"><Suspense fallback={<BoardSkeleton />}><KanbanBoard boardId={Number(id)} /></Suspense></div> }
