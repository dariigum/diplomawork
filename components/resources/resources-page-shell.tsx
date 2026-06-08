"use client"

import { Loader2 } from "lucide-react"
import ResourcesClient from "@/app/resources/ResourcesClient"
import { useStalePageData } from "@/hooks/use-stale-page-data"
import type { ResourceArticleDto } from "@/lib/server/resources-articles"

type ResourcesPayload = { articles: ResourceArticleDto[] }

export function ResourcesPageShell() {
  const { data, isRefreshing } = useStalePageData<ResourcesPayload>(
    "resources",
    "/api/public/resources",
  )

  if (!data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <>
      {isRefreshing && (
        <div className="h-0.5 w-full overflow-hidden bg-muted">
          <div className="h-full w-1/3 animate-pulse bg-primary/50" />
        </div>
      )}
      <ResourcesClient articles={data.articles} />
    </>
  )
}
