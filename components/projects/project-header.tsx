"use client"

import * as React from "react"
import axiosInstance from "@/lib/axios-config"
import type { ProjectHeaderProps } from "@/types/projects"

export function ProjectHeader({ projectId }: ProjectHeaderProps) {
  const [projectName, setProjectName] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    async function fetchProjectName() {
      try {
        const res = await axiosInstance.get(`/project/${projectId}`)
        const projectData = res.data?.result ?? res.data
        if (projectData?.name) {
          setProjectName(projectData.name)
        }
      } catch (error) {
        console.error("Failed to fetch project name:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjectName()
  }, [projectId])

  if (isLoading) {
    return <h1 className="text-lg font-semibold">Loading...</h1>
  }

  return <h1 className="text-lg font-semibold">{projectName || "Project"}</h1>
}
