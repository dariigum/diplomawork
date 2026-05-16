"use client"

import Link from "next/link"
import {
  ArrowRight,
  Briefcase,
  Building2,
  FileText,
  Heart,
  MessageCircle,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/provider"
import type { ToolsHubEmployeeStats, ToolsHubEmployerStats } from "@/app/actions/tools-hub"

type ToolsHubClientProps = {
  role: "EMPLOYEE" | "EMPLOYER" | null
  employee: ToolsHubEmployeeStats | null
  employer: ToolsHubEmployerStats | null
}

function ActionCard({
  href,
  title,
  description,
  openLabel,
  icon: Icon,
}: {
  href: string
  title: string
  description: string
  openLabel: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link href={href} className="block h-full">
      <Card className="h-full border-border/70 transition-all hover:border-primary/40 hover:shadow-md">
        <CardContent className="flex h-full flex-col gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
            {openLabel} <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ToolsHubClient({ role, employee, employer }: ToolsHubClientProps) {
  const { t } = useI18n()

  const pageHeader = (
    <div className="mb-8 space-y-2">
      <h1 className="text-3xl font-bold text-foreground">{t.tools.title}</h1>
      <p className="text-muted-foreground">{t.tools.subtitle}</p>
    </div>
  )

  if (!role) {
    return (
      <>
        {pageHeader}
        <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              {t.tools.forJobSeekers}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.tools.jobSeekerIntro}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t.tools.jobSeekerBullet1}</li>
              <li>{t.tools.jobSeekerBullet2}</li>
              <li>{t.tools.jobSeekerBullet3}</li>
              <li>{t.tools.jobSeekerBullet4}</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link href="/signup">{t.tools.signUpJobSeeker}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">{t.header.login}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {t.tools.forEmployers}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{t.tools.employerIntro}</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t.tools.employerBullet1}</li>
              <li>{t.tools.employerBullet2}</li>
              <li>{t.tools.employerBullet3}</li>
              <li>{t.tools.employerBullet4}</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button asChild>
                <Link href="/signup">{t.tools.signUpEmployer}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/login">{t.header.login}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      </>
    )
  }

  if (role === "EMPLOYEE" && employee) {
    return (
      <>
        {pageHeader}
        <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{t.tools.savedVacancies}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{employee.savedVacancies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{t.tools.applications}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{employee.applications}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{t.tools.resumes}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{employee.resumes}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard href="/" title={t.tools.browseVacancies} description={t.tools.browseVacanciesDesc} openLabel={t.tools.open} icon={Briefcase} />
          <ActionCard href="/dashboard/employee/recommendations" title={t.tools.aiMatches} description={t.tools.aiMatchesDesc} openLabel={t.tools.open} icon={Sparkles} />
          <ActionCard href="/dashboard/employee" title={t.tools.myDashboard} description={t.tools.myDashboardDesc} openLabel={t.tools.open} icon={FileText} />
          <ActionCard href="/resources" title={t.header.resources} description={t.tools.resourcesDesc} openLabel={t.tools.open} icon={FileText} />
          <ActionCard href="/companies" title={t.header.companies} description={t.tools.companiesDesc} openLabel={t.tools.open} icon={Building2} />
        </div>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">{t.tools.jobSeekerChecklist}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistSeeker1}</li>
              <li className="flex items-start gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistSeeker2}</li>
              <li className="flex items-start gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistSeeker3}</li>
              <li className="flex items-start gap-2"><Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistSeeker4}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      </>
    )
  }

  if (role === "EMPLOYER" && employer) {
    return (
      <>
        {pageHeader}
        <div className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{t.tools.activeVacancies}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{employer.activeVacancies}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{t.tools.totalApplicants}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{employer.totalApplicants}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ActionCard href="/dashboard/employer/vacancy/new" title={t.tools.postVacancy} description={t.tools.postVacancyDesc} openLabel={t.tools.open} icon={UserPlus} />
          <ActionCard href="/dashboard/employer" title={t.tools.hiringDashboard} description={t.tools.hiringDashboardDesc} openLabel={t.tools.open} icon={MessageCircle} />
          <ActionCard href="/companies" title={t.header.companies} description={t.tools.companiesDesc} openLabel={t.tools.open} icon={Building2} />
          <ActionCard href="/resources" title={t.header.resources} description={t.tools.resourcesDesc} openLabel={t.tools.open} icon={FileText} />
        </div>

        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardHeader>
            <CardTitle className="text-lg">{t.tools.employerChecklist}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistEmployer1}</li>
              <li className="flex items-start gap-2"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistEmployer2}</li>
              <li className="flex items-start gap-2"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistEmployer3}</li>
              <li className="flex items-start gap-2"><Briefcase className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{t.tools.checklistEmployer4}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
      </>
    )
  }

  return null
}
