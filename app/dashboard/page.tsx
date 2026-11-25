import type { Metadata } from "next"
import { DashboardChooser } from "@/components/dashboard/dashboard-chooser"

export const metadata: Metadata = { title: "Choose dashboard" }
export default function DashboardPage() { return <DashboardChooser /> }
