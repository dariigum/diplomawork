'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Building2, ArrowRight, Cpu, Info, RefreshCw, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/provider'
import type { BehaviourSessionInsights, RecommendationApiItem } from '@/lib/recommendations-api-types'
import { parseRecommendationsApiPayload } from '@/lib/recommendations-api-types'
import { formatBehaviourPhraseForDisplay } from '@/lib/recommendations-display-format'

const INITIAL_LIMIT = 3
const MID_LIMIT = 5
const MAX_LIMIT = 50
const RECOMMENDATIONS_RETURN_HREF = '/dashboard/employee/recommendations'

const PROGRESS_ENHANCED =
  'h-2.5 bg-primary/12 rounded-full [&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out'

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; pendingLimit: number }
  | { kind: 'ok'; data: RecommendationApiItem[]; apiLimit: number; behaviourSession: BehaviourSessionInsights | null }
  | { kind: 'empty'; lastLimit: number; behaviourSession: BehaviourSessionInsights | null }
  | { kind: 'no_embedding'; message: string }
  | { kind: 'error'; status: number; message: string }

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : formatMessage(fallback, { status: res.status })
}

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

function getFinalScore(d: RecommendationApiItem): number {
  return typeof d.finalScore === 'number' ? d.finalScore : d.score
}

function getSemanticScore(d: RecommendationApiItem): number {
  return typeof d.semanticScore === 'number' ? d.semanticScore : d.score
}

type FitTier = 'strong' | 'good' | 'related' | 'exploratory'

function fitTierFromPercent(pct: number): FitTier {
  if (pct >= 85) return 'strong'
  if (pct >= 70) return 'good'
  if (pct >= 50) return 'related'
  return 'exploratory'
}

function buildCardLeadLine(item: RecommendationApiItem, fallback: string): string {
  const tag = item.behaviourCardTagline?.trim()
  const note = item.semanticMatchNote?.trim()
  if (tag && tag.length <= 180) return tag
  if (note) {
    const firstSentence = note.split(/(?<=[.!?])\s+/)[0]?.trim() || note.split('\n')[0]?.trim()
    const base = firstSentence && firstSentence.length >= 12 ? firstSentence : note
    return base.length > 180 ? `${base.slice(0, 177)}…` : base
  }
  if (tag) return tag.length > 180 ? `${tag.slice(0, 177)}…` : tag
  return fallback
}

function tierBadgeClass(tier: FitTier): string {
  switch (tier) {
    case 'strong':
      return 'border-border/80 bg-background/70 text-foreground'
    case 'good':
      return 'border-border/80 bg-background/70 text-foreground'
    case 'related':
      return 'border-border/80 bg-muted/40 text-foreground'
    default:
      return 'border-muted-foreground/25 bg-muted/30 text-muted-foreground'
  }
}

export function EmployeeAiRecommendations() {
  const { t } = useI18n()
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const [loadTick, setLoadTick] = useState(0)

  const loadingMessages = [
    t.employeeDashboard.loadingRelevantOpportunities,
    t.employeeDashboard.loadingPersonalizedRecommendations,
    t.employeeDashboard.loadingRefreshingRecommendations,
  ] as const

  const fetchRecommendations = useCallback(async (limit: number) => {
    setState({ kind: 'loading', pendingLimit: limit })

    let res: Response
    try {
      res = await fetch(`/api/recommendations?limit=${limit}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      })
    } catch {
      setState({ kind: 'error', status: 0, message: t.employeeDashboard.networkError })
      return
    }

    if (res.status === 401) {
      setState({ kind: 'error', status: 401, message: t.employeeDashboard.signInToSeeRecommendations })
      return
    }
    if (res.status === 403) {
      setState({ kind: 'error', status: 403, message: t.employeeDashboard.jobSeekersOnly })
      return
    }
    if (res.status === 404) {
      setState({
        kind: 'error',
        status: 404,
        message: t.employeeDashboard.createResumeToUnlock,
      })
      return
    }

    if (res.status === 422) {
      setState({ kind: 'no_embedding', message: t.employeeDashboard.resumeSavedNeedMatch })
      return
    }

    if (res.status === 503) {
      setState({ kind: 'error', status: 503, message: t.employeeDashboard.couldntLoadRecs })
      return
    }

    if (!res.ok) {
      const message = await readErrorMessage(res, t.employeeDashboard.requestFailed)
      setState({ kind: 'error', status: res.status, message })
      return
    }

    const raw = await res.json().catch(() => null)
    const { recommendations, behaviourSession } = parseRecommendationsApiPayload(raw)

    if (recommendations.length === 0) {
      setState({ kind: 'empty', lastLimit: limit, behaviourSession: behaviourSession ?? null })
      return
    }

    setState({ kind: 'ok', data: recommendations, apiLimit: limit, behaviourSession: behaviourSession ?? null })
  }, [t])

  useEffect(() => {
    fetchRecommendations(INITIAL_LIMIT)
  }, [fetchRecommendations])

  useEffect(() => {
    if (state.kind !== 'loading' && state.kind !== 'idle') return
    const id = setInterval(() => {
      setLoadTick((t) => (t + 1) % loadingMessages.length)
    }, 1450)
    return () => clearInterval(id)
  }, [loadingMessages.length, state.kind])

  const loadingMessage = loadingMessages[loadTick % loadingMessages.length]

  const loadingSkeletonCount =
    state.kind === 'loading' ? Math.min(6, Math.max(1, state.pendingLimit)) : INITIAL_LIMIT

  const refresh = useCallback(() => {
    const lim = state.kind === 'ok' ? state.apiLimit : INITIAL_LIMIT
    fetchRecommendations(lim)
  }, [fetchRecommendations, state])

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div className="space-y-8 md:space-y-10 animate-in fade-in duration-300">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-border/70 ring-1 ring-border/50',
            'bg-card/80 p-6 md:p-8 shadow-sm',
          )}
        >
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg text-foreground transition-all duration-300">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {t.employeeDashboard.loadingTakesMoment}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: loadingSkeletonCount }, (_, i) => (
            <Card
              key={i}
              className={cn(
                'overflow-hidden rounded-2xl border-border/60 shadow-md ring-1 ring-border/30',
                'animate-in fade-in slide-in-from-bottom-1 duration-500',
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-6 w-[85%] rounded-md" />
                <Skeleton className="h-4 w-2/5 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Skeleton className="h-10 w-full rounded-xl bg-muted/80" />
                <Skeleton className="h-3 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (state.kind === 'error') {
    const isNoResume = state.status === 404
    const isAuth = state.status === 401 || state.status === 403
    return (
      <Card className="rounded-2xl border-destructive/25 bg-card overflow-hidden shadow-md ring-1 ring-destructive/10">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/10">
              <Info className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-xl">
                {isNoResume
                  ? t.employeeDashboard.addResumeToGetStarted
                  : isAuth
                    ? t.employeeDashboard.signInRequired
                    : t.employeeDashboard.couldntLoadRecs}
              </CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAuth || isNoResume ? state.message : t.employeeDashboard.pleaseRetry}
              </p>
              {!isAuth && !isNoResume ? (
                <details className="mt-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer font-medium text-foreground list-none marker:content-none [&::-webkit-details-marker]:hidden">
                    {t.employeeDashboard.details}
                  </summary>
                  <p className="mt-2 leading-relaxed">{state.message}</p>
                </details>
              ) : null}
              <div className="flex flex-wrap gap-2 pt-4">
                {state.status === 401 ? (
                  <Button asChild size="sm">
                    <Link href="/login">{t.employeeDashboard.signIn}</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/employee/resume/new">
                      {isNoResume ? t.employeeDashboard.createResume : t.employeeDashboard.resumeEditor}
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" type="button" onClick={() => fetchRecommendations(INITIAL_LIMIT)}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  {t.employeeDashboard.retry}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  if (state.kind === 'no_embedding') {
    return (
      <Card className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-md">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Cpu className="h-7 w-7" />
            </div>
            <div className="space-y-2 max-w-2xl">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {t.employeeDashboard.profileSetup}
                </Badge>
              </div>
              <CardTitle className="text-xl tracking-tight">{t.employeeDashboard.finishSetupProfile}</CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {t.employeeDashboard.resumeSavedNeedMatch}
              </p>
              <details className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground list-none marker:content-none [&::-webkit-details-marker]:hidden">
                  {t.employeeDashboard.technicalNote}
                </summary>
                <p className="mt-2 leading-relaxed">{state.message}</p>
              </details>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-8">
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/employee">{t.employeeDashboard.dashboard}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/dashboard/employee/resume/new">{t.employeeDashboard.openResumeEditor}</Link>
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={() => fetchRecommendations(INITIAL_LIMIT)}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            {t.employeeDashboard.tryAgain}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (state.kind === 'empty') {
    const bs = state.behaviourSession
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {bs ? (
          <details className="rounded-xl border border-border/70 bg-card/80 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-foreground list-none marker:content-none flex items-center gap-2 [&::-webkit-details-marker]:hidden">
              <Info className="h-4 w-4 text-primary shrink-0" />
              {t.employeeDashboard.activityContext}
            </summary>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              {bs.productBadge ? (
                <Badge variant="secondary" className="rounded-full text-xs">
                  {bs.productBadge}
                </Badge>
              ) : null}
              <p className="leading-relaxed">{bs.neutralSemanticLine}</p>
              <ul className="space-y-1 list-disc pl-4 leading-relaxed">
                {bs.dashboardLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          </details>
        ) : null}
        <Card className="rounded-2xl border border-dashed border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <Cpu className="h-7 w-7" />
              </div>
              <div className="space-y-3 max-w-2xl">
                <CardTitle className="text-xl tracking-tight">{t.employeeDashboard.noStrongMatchesFound}</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t.employeeDashboard.noStrongMatchesDesc}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 pb-8">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/employee">{t.employeeDashboard.dashboard}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/">{t.employeeDashboard.exploreJobs}</Link>
            </Button>
            <Button asChild size="sm" variant="secondary">
              <Link href="/dashboard/employee/resume/new">{t.employeeDashboard.updateResume}</Link>
            </Button>
            <Button variant="ghost" size="sm" type="button" onClick={() => fetchRecommendations(state.lastLimit)}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              {t.employeeDashboard.refresh}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const apiLimit = state.apiLimit
  const data = state.data
  const hasMoreLikelyFive = apiLimit === INITIAL_LIMIT && data.length === INITIAL_LIMIT
  const hasMoreLikelyMax = apiLimit === MID_LIMIT && data.length === MID_LIMIT

  return (
    <div className="space-y-10 md:space-y-12 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="rounded-full text-xs">
          {t.employeeDashboard.personalizedForYou}
        </Badge>
      </div>

      {state.kind === 'ok' && state.behaviourSession ? (
        <details className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-foreground list-none flex items-center gap-2 marker:content-none [&::-webkit-details-marker]:hidden">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            {t.employeeDashboard.whyTheseRolesMatch}
          </summary>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground border-t border-border/40 pt-3">
            {state.behaviourSession.productBadge ? (
              <Badge variant="secondary" className="rounded-full text-xs">
                {state.behaviourSession.productBadge}
              </Badge>
            ) : null}
            <p className="leading-relaxed">{state.behaviourSession.neutralSemanticLine}</p>
            <ul className="space-y-1 list-disc pl-4 max-w-3xl leading-relaxed">
              {state.behaviourSession.dashboardLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        </details>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-3 border-b border-border/50">
        <div className="space-y-1 max-w-xl min-w-0">
          <p className="text-sm font-semibold text-foreground tracking-tight">{t.employeeDashboard.yourPositions}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {formatMessage(t.employeeDashboard.showingRolesBestFirst, { count: data.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasMoreLikelyFive && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="gap-1 rounded-full"
              onClick={() => fetchRecommendations(MID_LIMIT)}
            >
              {t.employeeDashboard.showMore} <span className="font-semibold">({MID_LIMIT})</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          )}
          {hasMoreLikelyMax && (
            <Button
              variant="secondary"
              size="sm"
              type="button"
              className="gap-1 rounded-full"
              onClick={() => fetchRecommendations(MAX_LIMIT)}
            >
              {formatMessage(t.employeeDashboard.showMoreUpTo, { count: MAX_LIMIT })}
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          )}
          <Button variant="outline" size="sm" type="button" onClick={refresh} className="gap-2 rounded-full">
            <RefreshCw className="h-4 w-4" />
            {t.employeeDashboard.refresh}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        {data.map((item, idx) => {
          const pctHybrid = scoreToPercent(getFinalScore(item))
          const pctSemantic = scoreToPercent(getSemanticScore(item))
          const behaviourPts = Math.round(item.behaviourScore * 1000) / 10
          const tier = fitTierFromPercent(pctHybrid)
          const lead = buildCardLeadLine(item, t.employeeDashboard.alignedFallback)
          const tierLabel =
            tier === 'strong'
              ? t.employeeDashboard.strongFit
              : tier === 'good'
                ? t.employeeDashboard.goodFit
                : tier === 'related'
                  ? t.dashboard.matchFitRelated
                  : t.dashboard.matchFitExploratory
          return (
            <Card
              key={item.vacancyId}
              className={cn(
                'group/card relative overflow-hidden rounded-2xl border-border/60 transition-all duration-300',
                'shadow-sm hover:shadow-md hover:border-border',
                idx === 0 && 'ring-2 ring-border/60 bg-card/80',
              )}
            >
              <CardHeader className="pb-4 space-y-4">
                <div className="min-w-0 space-y-2">
                  <h2 className="font-semibold text-lg leading-snug tracking-tight line-clamp-2 text-foreground">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 opacity-85" />
                    <span className="truncate">{item.company}</span>
                  </div>
                  <Badge variant="outline" className={cn('rounded-full text-xs font-medium w-fit', tierBadgeClass(tier))}>
                    {tierLabel}
                  </Badge>
                  <p className="text-sm text-foreground/90 leading-relaxed">{lead}</p>
                </div>

                <details className="group rounded-lg border border-border/60 bg-muted/15">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors marker:content-none [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                    {t.employeeDashboard.rankedHow}
                  </summary>
                  <div className="border-t border-border/50 px-3 py-3 space-y-4 text-xs text-muted-foreground">
                    <div>
                      <p className="font-semibold text-foreground mb-1">{t.employeeDashboard.matchStrengthOverall}</p>
                      <Progress value={pctHybrid} className={PROGRESS_ENHANCED} />
                      <p className="mt-1.5 tabular-nums">
                        {formatMessage(t.employeeDashboard.combinedScoreLine, {
                          hybrid: pctHybrid,
                          semantic: pctSemantic,
                          behaviour: behaviourPts.toFixed(1),
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{t.employeeDashboard.semanticNotes}</p>
                      <p className="leading-relaxed">{item.semanticMatchNote}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{t.employeeDashboard.resumePhraseOverlap}</p>
                      {item.matchedSkills.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {item.matchedSkills.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="font-normal text-[0.65rem] rounded-full px-2 py-0"
                            >
                              {formatBehaviourPhraseForDisplay(s, 40)}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p>{t.employeeDashboard.noExtraPhraseOverlap}</p>
                      )}
                      {item.textOverlapNote ? <p className="mt-2 leading-relaxed">{item.textOverlapNote}</p> : null}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground mb-1">{t.employeeDashboard.rankingDetail}</p>
                      <p className="leading-relaxed">{item.hybridRankingNote}</p>
                      {item.behaviourExplanations.length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 mt-2">
                          {item.behaviourExplanations.slice(0, 8).map((line, i) => (
                            <li key={i}>{line}</li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </div>
                </details>
              </CardHeader>

              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.description}</p>
                <Button variant="default" size="sm" className="w-full sm:w-auto gap-2 rounded-full" asChild>
                  <Link href={`/jobs/${item.vacancyId}?from=${encodeURIComponent(RECOMMENDATIONS_RETURN_HREF)}`}>
                    {t.employeeDashboard.openVacancy} <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
