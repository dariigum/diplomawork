'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Building2,
  ArrowRight,
  Cpu,
  Info,
  RefreshCw,
  Target,
  TrendingUp,
  Layers,
  Percent,
  Activity,
  ChevronDown,
  Workflow,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { RecommendationApiItem } from '@/lib/recommendations-api-types'

const INITIAL_LIMIT = 3
const MID_LIMIT = 5
const MAX_LIMIT = 50

/** Shared metric card shell — aligned with dashboard AI surfaces. */
const METRIC_CARD =
  'group/metric relative overflow-hidden rounded-xl border border-border/55 bg-gradient-to-br shadow-sm transition-all duration-300 ease-out hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5'

const PROGRESS_ENHANCED =
  'h-2.5 bg-primary/12 rounded-full [&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out'

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; pendingLimit: number }
  | { kind: 'ok'; data: RecommendationApiItem[]; apiLimit: number }
  | { kind: 'empty'; lastLimit: number }
  | { kind: 'no_embedding'; message: string }
  | { kind: 'error'; status: number; message: string }

const LOADING_MESSAGES = [
  'Analyzing semantic vectors…',
  'Comparing embeddings…',
  'Ranking matches…',
  'Fetching ranked results…',
] as const

async function readErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : `Request failed (${res.status}).`
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

function computeStats(data: RecommendationApiItem[]) {
  const n = data.length
  if (n === 0) {
    return {
      count: 0,
      topMatch: 0,
      skillsDetected: 0,
      meanSemanticMatch: 0,
      meanHybridMatch: 0,
    }
  }
  const percentsHybrid = data.map((d) => scoreToPercent(getFinalScore(d)))
  const topMatch = Math.max(...percentsHybrid)
  const meanSemanticMatch = Math.round((data.reduce((acc, d) => acc + getSemanticScore(d), 0) / n) * 100)
  const meanHybridMatch = Math.round((data.reduce((acc, d) => acc + getFinalScore(d), 0) / n) * 100)
  const skillSet = new Set<string>()
  for (const item of data) {
    for (const s of item.matchedSkills) skillSet.add(s)
  }
  return {
    count: n,
    topMatch,
    skillsDetected: skillSet.size,
    meanSemanticMatch,
    meanHybridMatch,
  }
}

export function EmployeeAiRecommendations() {
  const [state, setState] = useState<LoadState>({ kind: 'idle' })
  const [loadTick, setLoadTick] = useState(0)

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
      setState({ kind: 'error', status: 0, message: 'Network error. Check your connection and try again.' })
      return
    }

    if (res.status === 401) {
      setState({ kind: 'error', status: 401, message: 'Please sign in to see recommendations.' })
      return
    }
    if (res.status === 403) {
      setState({ kind: 'error', status: 403, message: 'Only job seekers can access AI semantic matching.' })
      return
    }
    if (res.status === 404) {
      const body = await res.json().catch(() => ({}))
      setState({
        kind: 'error',
        status: 404,
        message: typeof body.error === 'string' ? body.error : 'Create a resume first to unlock recommendations.',
      })
      return
    }

    if (res.status === 422) {
      const message = await readErrorMessage(res)
      setState({ kind: 'no_embedding', message })
      return
    }

    if (res.status === 503) {
      const message = await readErrorMessage(res)
      setState({ kind: 'error', status: 503, message })
      return
    }

    if (!res.ok) {
      const message = await readErrorMessage(res)
      setState({ kind: 'error', status: res.status, message })
      return
    }

    const data = await res.json().catch(() => null)
    if (!Array.isArray(data)) {
      setState({ kind: 'error', status: res.status, message: 'Unexpected response from recommendations API.' })
      return
    }

    if (data.length === 0) {
      setState({ kind: 'empty', lastLimit: limit })
      return
    }

    setState({ kind: 'ok', data: data as RecommendationApiItem[], apiLimit: limit })
  }, [])

  useEffect(() => {
    fetchRecommendations(INITIAL_LIMIT)
  }, [fetchRecommendations])

  useEffect(() => {
    if (state.kind !== 'loading' && state.kind !== 'idle') return
    const id = setInterval(() => {
      setLoadTick((t) => (t + 1) % LOADING_MESSAGES.length)
    }, 1450)
    return () => clearInterval(id)
  }, [state.kind])

  const loadingMessage = LOADING_MESSAGES[loadTick % LOADING_MESSAGES.length]

  const stats = useMemo(() => {
    if (state.kind !== 'ok') return null
    return computeStats(state.data)
  }, [state])

  const loadingSkeletonCount =
    state.kind === 'loading' ? Math.min(6, Math.max(1, state.pendingLimit)) : INITIAL_LIMIT

  const refresh = useCallback(() => {
    const lim = state.kind === 'ok' ? state.apiLimit : INITIAL_LIMIT
    fetchRecommendations(lim)
  }, [fetchRecommendations, state])

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div className="space-y-8 md:space-y-10 animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline" className="gap-1 rounded-full border-primary/35 shadow-sm transition-colors hover:border-primary/50">
            <Zap className="h-3 w-3" />
            Not keyword search
          </Badge>
          <Badge variant="secondary" className="rounded-full gap-1 shadow-sm transition-colors hover:bg-secondary/90">
            <Workflow className="h-3 w-3" />
            Hybrid rank (semantic-first)
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card
              key={i}
              className={cn(
                METRIC_CARD,
                'from-muted/45 to-background/95 border-dashed border-border/50',
                'animate-in fade-in slide-in-from-bottom-1 duration-500',
              )}
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <CardHeader className="pb-2 space-y-2">
                <Skeleton className="h-3 w-24 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-primary/25 ring-1 ring-primary/[0.06]',
            'bg-gradient-to-br from-primary/[0.1] via-violet-600/[0.07] to-cyan-500/[0.08] p-6 md:p-8 shadow-md',
            'transition-shadow duration-300 hover:shadow-lg',
          )}
        >
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner ring-1 ring-white/10">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg text-foreground transition-all duration-300">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Server-side embeddings and cosine for the semantic term, plus a capped behaviour layer for the final
                hybrid sort. No client-side scoring.
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
                'transition-all duration-500 ease-out',
                'animate-in fade-in slide-in-from-bottom-1 duration-500',
              )}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-6 w-[85%] rounded-md" />
                <Skeleton className="h-4 w-2/5 rounded-md" />
                <Skeleton className="h-2 w-full rounded-full bg-primary/10" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Skeleton className="h-14 w-full rounded-xl bg-muted/80" />
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-3 w-4/5 rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (state.kind === 'error') {
    const isNoResume = state.status === 404
    const isPipelineDown = state.status === 503
    return (
      <Card className="rounded-2xl border-destructive/25 bg-gradient-to-br from-destructive/[0.05] via-background to-violet-500/[0.04] overflow-hidden shadow-lg ring-1 ring-destructive/10 transition-shadow duration-300 hover:shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/12 ring-1 ring-destructive/20">
              <Info className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-xl">
                {isNoResume
                  ? 'Add a resume to start matching'
                  : isPipelineDown
                    ? 'Matching service unavailable'
                    : 'Recommendations unavailable'}
              </CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">{state.message}</p>
              <p className="text-sm leading-relaxed text-foreground/85 border-l-2 border-primary/35 pl-3 mt-4">
                {isNoResume ? (
                  <>
                    Semantic ranking needs a saved resume so we can build profile text, request an embedding from the ML
                    service, and store your vector for cosine ranking.
                  </>
                ) : state.status === 401 ? (
                  <>Sign in as a job seeker to load your matches.</>
                ) : isPipelineDown ? (
                  <>
                    The server could not finish ranking (database or embedding pipeline). This is not an empty shortlist —
                    try again after services recover. Scores always come from stored vectors, not the browser.
                  </>
                ) : (
                  <>
                    Check that MongoDB and the FastAPI embedding service are running. If you are signed in correctly,
                    retry — rankings stay deterministic from stored vectors.
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 pt-5">
                {state.status === 401 ? (
                  <Button asChild size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/employee/resume/new">{isNoResume ? 'Create resume' : 'Resume editor'}</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" type="button" onClick={() => fetchRecommendations(INITIAL_LIMIT)} className="rounded-full transition-colors">
                  <RefreshCw className="h-4 w-4 mr-1.5" />
                  Retry
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
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full shadow-sm">
            Cosine-ranked
          </Badge>
          <Badge variant="secondary" className="rounded-full shadow-sm">
            Embedding required
          </Badge>
        </div>
        <Card className="relative overflow-hidden rounded-2xl border border-amber-500/35 bg-card/80 backdrop-blur-md shadow-lg ring-1 ring-amber-500/10 transition-shadow duration-300 hover:shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-primary/[0.04]" />
          <CardHeader className="relative pb-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-amber-500/12 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/25 shadow-inner">
                <Cpu className="h-8 w-8" />
              </div>
              <div className="space-y-3 max-w-2xl">
                <CardTitle className="text-xl sm:text-2xl tracking-tight">Resume not embedded yet</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">{state.message}</p>
                <p className="text-sm text-foreground/85 leading-relaxed border-l-2 border-amber-500/40 pl-3">
                  Your profile is on file, but we do not have a vector to compare against vacancies — so ranking cannot
                  start. Re-save from the resume editor while the embedding API is reachable.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative flex flex-wrap gap-2 pb-8">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/employee">Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/employee/resume/new">Open resume editor</Link>
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={() => fetchRecommendations(INITIAL_LIMIT)}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Check again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (state.kind === 'empty') {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full shadow-sm">Hybrid-ranked</Badge>
          <Badge variant="secondary" className="rounded-full shadow-sm">Embedding-based</Badge>
        </div>
        <Card className="relative overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-card/70 backdrop-blur-md shadow-xl ring-1 ring-primary/[0.07] transition-shadow duration-300 hover:shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-cyan-500/[0.06]" />
          <CardHeader className="relative pb-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20 shadow-inner">
                <Cpu className="h-8 w-8" />
              </div>
              <div className="space-y-3 max-w-2xl">
                <CardTitle className="text-xl sm:text-2xl tracking-tight">No ranked vacancies in this window</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ranking ran successfully, but nothing cleared the current cosine threshold, or indexed vacancies are
                  still missing vectors.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground list-none pl-0">
                  <li className="flex gap-2">
                    <span className="text-primary font-semibold">•</span>
                    Confirm open roles have embeddings saved; re-run your data or seed script with the encoder online.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-semibold">•</span>
                    For local demos: <code className="rounded-md bg-muted px-1.5 py-0.5 text-[0.72rem]">npm run seed:demo</code>{' '}
                    with embeddings enabled, then refresh (hybrid sort: semantic-first on the server).
                  </li>
                </ul>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative flex flex-wrap gap-2 pb-8">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/employee">Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/employee/resume/new">Update resume & re-index</Link>
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={() => fetchRecommendations(state.lastLimit)}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Re-run ranking
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
        <Badge variant="outline" className="gap-1.5 rounded-full border-emerald-500/35 text-emerald-800 dark:text-emerald-200 shadow-sm transition-colors hover:border-emerald-500/50">
          <Activity className="h-3 w-3" />
          Semantic-first hybrid ranking
        </Badge>
        <Badge variant="secondary" className="rounded-full gap-1 shadow-sm transition-colors hover:bg-secondary/90">
          <Zap className="h-3 w-3" />
          Not keyword search
        </Badge>
        <Badge variant="outline" className="rounded-full opacity-90 shadow-sm">
          Top {stats?.count ?? 0} • limit {apiLimit}
        </Badge>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className={cn(METRIC_CARD, 'from-primary/[0.12] to-background')}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Matches in view</span>
              <Target className="h-4 w-4 text-primary transition-transform group-hover/metric:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{stats.count}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">Server-ranked slice (hybrid final score DESC)</p>
            </CardContent>
          </Card>
          <Card className={cn(METRIC_CARD, 'from-emerald-500/[0.12] to-background')}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Top hybrid score</span>
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 transition-transform group-hover/metric:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-foreground">{stats.topMatch}%</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">Best final score in this batch (semantic×0.85 + behaviour×0.15)</p>
            </CardContent>
          </Card>
          <Card className={cn(METRIC_CARD, 'from-violet-500/[0.12] to-background')}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Text overlap hints</span>
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400 transition-transform group-hover/metric:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-foreground">{stats.skillsDetected}</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">Distinct JD phrases flagged in your resume text</p>
            </CardContent>
          </Card>
          <Card className={cn(METRIC_CARD, 'from-cyan-500/[0.12] to-background')}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">Mean hybrid / semantic</span>
              <Percent className="h-4 w-4 text-cyan-600 dark:text-cyan-400 transition-transform group-hover/metric:scale-110" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums text-foreground">{stats.meanHybridMatch}%</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-snug">
                Hybrid mean (rank key). Avg semantic cosine alone: {stats.meanSemanticMatch}%.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-3 border-b border-border/50">
        <div className="space-y-1 max-w-xl min-w-0">
          <p className="text-sm font-semibold text-foreground tracking-tight">Results</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Showing the top <strong className="text-foreground font-medium">{data.length}</strong> matches fetched with{' '}
            <code className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[0.72rem]">?limit={apiLimit}</code> — order follows backend
            hybrid ranking (semantic-first; cosine unchanged inside the semantic term).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {hasMoreLikelyFive && (
            <Button variant="secondary" size="sm" type="button" className="gap-1 rounded-full shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]" onClick={() => fetchRecommendations(MID_LIMIT)}>
              Show top <span className="font-semibold">{MID_LIMIT}</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          )}
          {hasMoreLikelyMax && (
            <Button variant="secondary" size="sm" type="button" className="gap-1 rounded-full shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]" onClick={() => fetchRecommendations(MAX_LIMIT)}>
              Show all (up to {MAX_LIMIT})
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          )}
          <Button variant="outline" size="sm" type="button" onClick={refresh} className="gap-2 rounded-full transition-all duration-200 hover:border-primary/35 hover:bg-muted/40 active:scale-[0.98]">
            <RefreshCw className="h-4 w-4" />
            Refresh same window
          </Button>
        </div>
      </div>

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        {data.map((item, idx) => {
          const pctHybrid = scoreToPercent(getFinalScore(item))
          const pctSemantic = scoreToPercent(getSemanticScore(item))
          const behaviourPts = Math.round(item.behaviourScore * 1000) / 10
          return (
            <Card
              key={item.vacancyId}
              className={cn(
                'group/card relative overflow-hidden rounded-2xl border-border/65 transition-all duration-300 ease-out',
                'shadow-md hover:shadow-xl hover:border-primary/35 hover:-translate-y-1',
                'active:scale-[0.995]',
                idx === 0 &&
                  'ring-2 ring-primary/30 bg-gradient-to-b from-primary/[0.08] via-background to-background shadow-lg',
              )}
            >
              {idx === 0 && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="rounded-full bg-primary text-primary-foreground shadow-md gap-1 transition-transform group-hover/card:scale-[1.02]">
                    <Sparkles className="h-3 w-3" />
                    #1 ranked match
                  </Badge>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-50 group-hover/card:opacity-90 transition-opacity duration-300" />

              <CardHeader className="pb-3 space-y-4 pr-14 sm:pr-24">
                <div className="min-w-0 space-y-1.5">
                  <h2 className="font-semibold text-xl leading-snug tracking-tight line-clamp-2 text-foreground">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 opacity-85" />
                    <span className="truncate">{item.company}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      Hybrid match (semantic-first)
                    </span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{pctHybrid}%</span>
                  </div>
                  <Progress value={pctHybrid} className={PROGRESS_ENHANCED} />
                  <p className="text-[0.7rem] text-muted-foreground">
                    Final = semantic×0.85 + behaviour×0.15 — semantic cosine alone ~{pctSemantic}% · behaviour term{' '}
                    {behaviourPts.toFixed(1)} / 15 max points
                  </p>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-0">
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                    Vacancy snapshot
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.description}</p>
                </div>

                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent p-4 space-y-4 shadow-inner transition-colors duration-300 group-hover/card:border-primary/35">
                  <div className="rounded-lg border border-primary/30 bg-background/60 p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary shrink-0" />
                      <h3 className="font-semibold text-sm tracking-tight">Semantic match (embedding)</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-[0.9rem]">{item.semanticMatchNote}</p>
                  </div>

                  <div className="rounded-lg border border-violet-500/30 bg-violet-500/[0.04] dark:bg-violet-500/[0.07] p-3.5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-violet-600 dark:text-violet-300 shrink-0" />
                      <h3 className="font-semibold text-sm tracking-tight">Text overlap hints</h3>
                    </div>
                    {item.matchedSkills.length > 0 ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Plain-text check between your resume and the listing — independent from hybrid and cosine scores.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.matchedSkills.map((s) => (
                            <Badge
                              key={s}
                              variant="secondary"
                              className="font-normal text-xs rounded-full px-2.5 py-0.5 bg-background/90 border border-border/60"
                            >
                              {s}
                            </Badge>
                          ))}
                        </div>
                        {item.textOverlapNote ? (
                          <p className="text-muted-foreground leading-relaxed text-[0.85rem]">{item.textOverlapNote}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        No JD phrases were auto-flagged against your resume text. Hybrid rank still applies (semantic-first).
                      </p>
                    )}
                  </div>

                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] dark:bg-amber-500/[0.08] p-3.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-amber-700 dark:text-amber-300 shrink-0" />
                      <h3 className="font-semibold text-sm tracking-tight">Behaviour layer (ranking)</h3>
                    </div>
                    <p className="text-muted-foreground text-[0.85rem] leading-relaxed">{item.hybridRankingNote}</p>
                    {item.behaviourExplanations.length > 0 ? (
                      <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                        {item.behaviourExplanations.slice(0, 6).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                <Button variant="default" size="sm" className="w-full sm:w-auto gap-2 rounded-full shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]" asChild>
                  <Link href={`/jobs/${item.vacancyId}`}>
                    Open vacancy <ArrowRight className="h-4 w-4" />
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
