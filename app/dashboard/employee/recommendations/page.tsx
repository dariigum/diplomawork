import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronDown, FileText, Sparkles, ChevronLeft } from 'lucide-react'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db/mongoose'
import { EmployeeAiRecommendations } from '@/components/recommendations/employee-ai-recommendations'
import { EmployeeBehaviourAnalyticsDashboard } from '@/components/recommendations/employee-behaviour-analytics-dashboard'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import { buildBehaviourAnalytics } from '@/lib/behaviour-analytics'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cookies } from 'next/headers'
import { getDictionary } from '@/lib/i18n/dictionaries'

export const dynamic = 'force-dynamic'

export default async function EmployeeRecommendationsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'EMPLOYEE') {
    redirect('/login')
  }

  await dbConnect()
  const activeResumeLean = (await getActiveResumeLeanForUser(session.user.id)) as { title?: string } | null
  const activeResumeTitle = activeResumeLean?.title ? String(activeResumeLean.title) : null
  const behaviourAnalytics = await buildBehaviourAnalytics(session.user.id)

  const cookieStore = await cookies()
  const locale = (cookieStore.get('NEXT_LOCALE')?.value || 'en') as 'en' | 'ru' | 'kk'
  const t = getDictionary(locale)

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 sm:px-6 pb-12">
      <section className="group/hero relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-6 sm:p-8 md:p-10 shadow-md ring-1 ring-border/50 transition-shadow duration-300 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-background/80 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-muted/40 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0" asChild>
                <Link href="/dashboard/employee?tab=candidates" aria-label={t.forms.back}>
                  <ChevronLeft className="size-6" />
                </Link>
              </Button>
              <Badge className="gap-1.5 rounded-full border-primary/30 bg-primary/15 px-3 py-1 text-primary shadow-sm transition-colors hover:bg-primary/20">
                <Sparkles className="h-3.5 w-3.5" />
                {t.employeeDashboard.recommendationsPageBadge}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.25rem] leading-tight">
              {t.employeeDashboard.recommendationsPageTitle}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed md:text-lg">
              {t.employeeDashboard.recommendationsPageSubtitle}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.employeeDashboard.recommendationsPageDescription}
            </p>
            <details className="group rounded-xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground shadow-sm ring-1 ring-border/40">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180 text-muted-foreground" />
                {t.employeeDashboard.howRecommendationsWork}
              </summary>
              <p className="mt-3 pl-6 text-muted-foreground leading-relaxed border-l-2 border-primary/25">
                {t.employeeDashboard.howRecommendationsWorkDesc}
              </p>
            </details>
          </div>
        </div>
      </section>

      {activeResumeTitle ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border/70 bg-card/80 px-4 py-3 sm:px-5 shadow-sm ring-1 ring-border/50">
          <div className="flex items-center gap-2 text-primary shrink-0">
            <FileText className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.employeeDashboard.activeResume}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {t.employeeDashboard.recommendationsUseResume}{' '}
            <strong className="text-foreground font-semibold">{activeResumeTitle}</strong>
            <span className="text-muted-foreground"> {t.employeeDashboard.activeResumeSuffix}</span>
          </p>
        </div>
      ) : null}

      <EmployeeBehaviourAnalyticsDashboard snapshot={behaviourAnalytics} variant="compact" />

      <EmployeeAiRecommendations />
    </div>
  )
}
