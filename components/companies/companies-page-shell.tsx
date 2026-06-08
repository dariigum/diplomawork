"use client"

import { Loader2 } from "lucide-react"
import { CompaniesClient, type CompanyListItem } from "@/components/companies/companies-client"
import { useStalePageData } from "@/hooks/use-stale-page-data"

type CompaniesPayload = { companies: CompanyListItem[] }

export function CompaniesPageShell() {
  const { data, isRefreshing } = useStalePageData<CompaniesPayload>(
    "companies",
    "/api/public/companies",
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
      <CompaniesClient companies={data.companies} />
    </>
  )
}
