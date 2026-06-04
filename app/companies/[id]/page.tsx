import Link from "next/link"
import { cookies } from "next/headers"
import { MapPin, Users, Globe, ExternalLink, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/jobs/header"
import dbConnect from "@/lib/db/mongoose"
import { formatEmployerName } from "@/lib/format-employer-name"
import { formatVacancySalary } from "@/lib/format-vacancy-salary"
import { parseSafeExternalUrl } from "@/lib/vacancy-detail-display"
import { User, Vacancy, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { BackButton } from "@/components/ui/back-button"

export const dynamic = "force-dynamic"

export default async function CompanyProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ru' | 'kk'
  const t = getDictionary(locale)

  const { id } = await params
  const { from } = await searchParams
  const backHref = from ? decodeURIComponent(from) : '/companies'
  const backLabel = from ? t.companies.back : t.companies.backToCompanies

  await dbConnect()
  const company = await User.findById(id).lean() as any
  const vacancies = await Vacancy.find({ employerId: id }).lean() as any[]

  const session = await getSession()
  let savedJobsCount = 0
  if (session && session.user.role === 'EMPLOYEE') {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
  }

  const companyWebsite = company ? parseSafeExternalUrl(company.website) : null

  if (!company || company.role !== 'EMPLOYER') {
    return (
      <div className="min-h-screen bg-background">
        <Header savedJobsCount={savedJobsCount} />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">{t.companies.companyNotFound}</h1>
          <Link href={backHref} className="text-primary mt-4 inline-block hover:underline">{backLabel}</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />

      <main className="container mx-auto px-4 py-8">
        <BackButton label={t.forms.back} />

        <div className="bg-card border border-border rounded-xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary flex-shrink-0">
            {company.logoUrl || "🏢"}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{formatEmployerName(company)}</h1>
            <div className="flex items-center gap-4 mt-2 mb-4">
              {company.industry ? (
                <Badge variant="secondary">{company.industry}</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {company.description || t.companies.noDescription}
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg md:min-w-48 border border-border">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{company.location || t.companies.multipleLocations}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span>{company.employees || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              {companyWebsite ? (
                <a href={companyWebsite.href} target="_blank" rel="noopener noreferrer" className="hover:underline transition-colors">
                  {t.companies.visitWebsite}
                </a>
              ) : (
                <span>{t.companies.noWebsite}</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            {t.companies.openPositions} ({vacancies.length})
          </h2>
          {vacancies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-border">
              {t.companies.noOpenPositions}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {vacancies.map(job => (
                <Link
                  key={job._id.toString()}
                  href={`/jobs/${job._id.toString()}?from=${encodeURIComponent(`/companies/${id}`)}`}
                >
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all h-full cursor-pointer bg-card">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground transition-colors mix-blend-normal">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="bg-background">{job.employmentType || t.forms.fullTime}</Badge>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.workMode === 'REMOTE' ? t.forms.remote : [job.city, job.country].filter(Boolean).join(', ') || job.address}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {formatVacancySalary(job.salaryMin, job.salaryMax)}
                        </span>
                        <span className="text-primary flex items-center gap-1 text-sm font-medium">
                          {t.companies.viewJob} <ExternalLink className="h-3 w-3" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
