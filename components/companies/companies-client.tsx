"use client"

import Link from "next/link"
import { useMemo, useState, type ReactNode } from "react"
import { Search, MapPin, Users, Briefcase, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/provider"

export type CompanyListItem = {
  id: string
  name: string
  industry: string
  description: string
  location: string
  employees: string
  openJobs: number
  logoUrl: string | null
}

function CompanyLogo({ logoUrl, name }: { logoUrl: string | null; name: string }): ReactNode {
  const [failed, setFailed] = useState(false)

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        className="h-full w-full rounded-xl object-cover"
        onError={() => setFailed(true)}
      />
    )
  }

  return <span className="text-lg">🏢</span>
}

export function CompaniesClient({ companies }: { companies: CompanyListItem[] }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 30

  const handleQueryChange = (val: string) => {
    setQuery(val)
    setCurrentPage(1)
  }

  const filteredCompanies = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return companies

    return companies.filter((company) => {
      const haystack = [company.name, company.industry, company.location]
        .join(" ")
        .toLowerCase()
      return haystack.includes(normalized)
    })
  }, [companies, query])

  const totalPages = Math.ceil(filteredCompanies.length / ITEMS_PER_PAGE)

  const paginatedCompanies = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredCompanies.slice(startIndex, startIndex + ITEMS_PER_PAGE)
  }, [filteredCompanies, currentPage])

  return (
    <main className="container mx-auto min-w-0 max-w-full overflow-x-hidden px-4 py-8">
      <div className="mb-8 space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.companies.exploreCompanies}</h1>
          <p className="mt-2 text-muted-foreground">{t.companies.discoverGreatPlaces}</p>
        </div>

        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={t.companies.searchEmployers}
            className="border-border bg-card pl-9"
            aria-label={t.companies.searchEmployers}
          />
        </div>
      </div>

      {paginatedCompanies.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t.companies.noSearchResults}</p>
      ) : (
        <>
          <div className="grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {paginatedCompanies.map((company) => (
              <Link key={company.id} href={`/companies/${company.id}`} className="block min-w-0">
                <Card className="h-full min-w-0 cursor-pointer overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex min-w-0 items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-lg font-semibold text-muted-foreground">
                        <CompanyLogo logoUrl={company.logoUrl} name={company.name} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-semibold text-foreground">{company.name}</h3>
                        {company.industry ? (
                          <Badge variant="secondary" className="mt-1">
                            {company.industry}
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                      {company.description || t.companies.noDescription}
                    </p>

                    <div className="mt-4 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                      <div className="flex min-w-0 max-w-full items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{company.location || t.companies.multipleLocations}</span>
                      </div>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="truncate">{company.employees || "—"}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 items-center justify-between gap-2 border-t border-border pt-4">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium text-foreground">4.8</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-primary">
                        <Briefcase className="h-4 w-4" />
                        <span className="font-medium">
                          {company.openJobs} {t.companies.openJobs}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                {t.admin.users.previous || "Previous"}
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                {t.admin.users.next || "Next"}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
