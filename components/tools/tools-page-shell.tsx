"use client"

import { Loader2 } from "lucide-react"
import { ToolsHubClient } from "@/components/tools/tools-hub-client"
import { useStalePageData } from "@/hooks/use-stale-page-data"
import type { ToolsHubEmployeeStats, ToolsHubEmployerStats } from "@/app/actions/tools-hub"

type ToolsHubPayload = {
  role: "EMPLOYEE" | "EMPLOYER" | "ADMIN" | null
  employee: ToolsHubEmployeeStats | null
  employer: ToolsHubEmployerStats | null
  savedJobsCount: number
}

export function ToolsPageShell() {
  const { data, isRefreshing } = useStalePageData<ToolsHubPayload>(
    "tools-hub",
    "/api/public/tools-hub",
  )

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const role = data.role === "EMPLOYEE" || data.role === "EMPLOYER" ? data.role : null

  return (
    <>
      {isRefreshing && (
        <div className="h-0.5 w-full overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary/50" />
        </div>
      )}
      <ToolsHubClient role={role} employee={data.employee} employer={data.employer} />
    </>
  )
}
