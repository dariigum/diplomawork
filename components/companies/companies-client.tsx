"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Search, MapPin, Users, Briefcase, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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

export function CompaniesClient({ companies }: { companies: CompanyListItem[] }) {
  const { t } = useI18n()
  const [query, setQuery] = useState("")

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

  return (
    <main className="container mx-auto px-4 py-8">
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
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.companies.searchEmployers}
            className="border-border bg-card pl-9"
            aria-label={t.companies.searchEmployers}
          />
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">{t.companies.noSearchResults}</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Link key={company.id} href={`/companies/${company.id}`}>
              <Card className="h-full cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-muted text-lg font-semibold text-muted-foreground">
                      {company.logoUrl || "🏢"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-foreground">{company.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {company.industry}
                      </Badge>
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 text-sm text-muted-foreground">
                    {company.description || t.companies.noDescription}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{company.location || t.companies.multipleLocations}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{company.employees}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
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
      )}
    </main>
  )
}
