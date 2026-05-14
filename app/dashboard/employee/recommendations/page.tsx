import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Sparkles, BrainCircuit, Zap } from 'lucide-react'
import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db/mongoose'
import { EmployeeAiRecommendations } from '@/components/recommendations/employee-ai-recommendations'
import { EmployeeBehaviourAnalyticsDashboard } from '@/components/recommendations/employee-behaviour-analytics-dashboard'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import { buildBehaviourAnalytics } from '@/lib/behaviour-analytics'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function EmployeeRecommendationsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'EMPLOYEE') {
    redirect('/login')
  }

  await dbConnect()
  const activeResumeLean = (await getActiveResumeLeanForUser(session.user.id)) as { title?: string } | null
  const activeResumeTitle = activeResumeLean?.title ? String(activeResumeLean.title) : null
  const behaviourAnalytics = await buildBehaviourAnalytics(session.user.id)
  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 sm:px-6 pb-12">
      <section className="group/hero relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-violet-600/[0.14] via-background to-cyan-500/[0.1] p-6 sm:p-8 md:p-10 shadow-md ring-1 ring-primary/[0.06] transition-shadow duration-300 hover:shadow-lg">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 rounded-full border-primary/30 bg-primary/15 px-3 py-1 text-primary shadow-sm transition-colors hover:bg-primary/20">
                <BrainCircuit className="h-3.5 w-3.5" />
                Semantic AI matching
              </Badge>
              <Badge variant="outline" className="rounded-full border-violet-500/40 text-violet-700 dark:text-violet-300 shadow-sm">
                SBERT embeddings
              </Badge>
              <Badge variant="secondary" className="rounded-full gap-1 text-xs shadow-sm">
                <Zap className="h-3 w-3" />
                Adaptive-ranked
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-[2.25rem] leading-tight">
              AI Career Assistant
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed md:text-lg">
              Recommendations combine resume embeddings (cosine semantic score) with a small, capped behaviour layer.
              Final order is semantic-first adaptive ranking — computed server-side, not keyword search alone.
            </p>
            <p className="text-sm text-muted-foreground/90 flex items-start gap-2 max-w-2xl">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>
                Explainable AI: vectors from your encoder; semantic term is cosine on the server; behaviour boosts are
                spelled out on each card. Percentages reflect API values, not browser guesses.
              </span>
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="rounded-full text-xs font-normal bg-background/50 shadow-sm">
                Semantic-first adaptive ranking
              </Badge>
              <Badge variant="secondary" className="rounded-full text-xs font-normal shadow-sm">
                Final % (adaptive)
              </Badge>
              <Badge variant="outline" className="rounded-full text-xs font-normal opacity-90 shadow-sm">
                Top-N via ?limit=
              </Badge>
            </div>
          </div>
          <Button
            variant="outline"
            className="shrink-0 rounded-full border-border/80 bg-background/70 backdrop-blur-sm shadow-sm transition-all duration-200 hover:border-primary/30 hover:bg-background hover:shadow-md"
            asChild
          >
            <Link href="/dashboard/employee">← Workspace</Link>
          </Button>
        </div>
      </section>

      {activeResumeTitle ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] via-background to-violet-500/[0.05] px-4 py-3 sm:px-5 shadow-sm ring-1 ring-primary/[0.06]">
          <div className="flex items-center gap-2 text-primary shrink-0">
            <BrainCircuit className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active AI resume</span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            Recommendations are generated from{' '}
            <strong className="text-foreground font-semibold">{activeResumeTitle}</strong>
            <span className="text-muted-foreground"> — the profile marked for semantic matching in your workspace.</span>
          </p>
        </div>
      ) : null}

      <EmployeeBehaviourAnalyticsDashboard snapshot={behaviourAnalytics} variant="compact" />

      <EmployeeAiRecommendations />
    </div>
  )
}
