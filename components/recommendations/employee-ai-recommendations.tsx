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
  Lightbulb,
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

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; pendingLimit: number }
  | { kind: 'ok'; data: RecommendationApiItem[]; apiLimit: number }
  | { kind: 'empty'; lastLimit: number }
  | { kind: 'error'; status: number; message: string }

const LOADING_MESSAGES = [
  'Analyzing semantic vectors…',
  'Comparing embeddings…',
  'Ranking AI matches…',
  'Generating recommendation insights…',
] as const

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

function computeStats(data: RecommendationApiItem[]) {
  const n = data.length
  if (n === 0) {
    return {
      count: 0,
      topMatch: 0,
      skillsDetected: 0,
      avgConfidence: 0,
    }
  }
  const percents = data.map((d) => scoreToPercent(d.score))
  const topMatch = Math.max(...percents)
  const avgConfidence = Math.round((data.reduce((acc, d) => acc + d.score, 0) / n) * 100)
  const skillSet = new Set<string>()
  for (const item of data) {
    for (const s of item.matchedSkills) skillSet.add(s)
  }
  return {
    count: n,
    topMatch,
    skillsDetected: skillSet.size,
    avgConfidence,
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
          <Badge variant="outline" className="gap-1 rounded-full border-primary/35">
            <Zap className="h-3 w-3" />
            Not keyword search
          </Badge>
          <Badge variant="secondary" className="rounded-full gap-1">
            <Workflow className="h-3 w-3" />
            Embedding → cosine ranking
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card
              key={i}
              className="border-border/60 overflow-hidden bg-gradient-to-b from-muted/50 to-background/80 backdrop-blur-sm shadow-sm"
            >
              <CardHeader className="pb-2 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-9 w-20" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-primary/25',
            'bg-gradient-to-br from-primary/[0.1] via-violet-600/[0.07] to-cyan-500/[0.08] p-6 md:p-8 shadow-md',
          )}
        >
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner ring-1 ring-white/10">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg text-foreground transition-all duration-300">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                Server-side cosine similarity across SBERT embeddings — vacancy vectors ranked against your resume vector.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {Array.from({ length: loadingSkeletonCount }, (_, i) => (
            <Card
              key={i}
              className={cn(
                'overflow-hidden border-border/65 shadow-md/50',
                'transition-all duration-500 ease-out',
              )}
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-6 w-[85%]" />
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-2 w-full rounded-full" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Skeleton className="h-14 w-full rounded-xl" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (state.kind === 'error') {
    const isNoResume = state.status === 404
    return (
      <Card className="border-destructive/25 bg-gradient-to-br from-destructive/[0.05] via-background to-violet-500/[0.04] overflow-hidden shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-destructive/12 ring-1 ring-destructive/20">
              <Info className="h-6 w-6 text-destructive" />
            </div>
            <div className="min-w-0 space-y-2">
              <CardTitle className="text-xl">
                {isNoResume ? 'Semantic profile not ready' : 'AI recommendations unavailable'}
              </CardTitle>
              <p className="text-sm text-muted-foreground leading-relaxed">{state.message}</p>
              <p className="text-sm leading-relaxed text-foreground/85 border-l-2 border-primary/35 pl-3 mt-4">
                {isNoResume ? (
                  <>
                    AI semantic matching requires an{' '}
                    <strong className="text-foreground font-medium">active resume record</strong> so we can build your
                    profile text, request an embedding from the ML service, and store the vector for cosine ranking.
                  </>
                ) : state.status === 401 ? (
                  <>Sign in as a job seeker to access your semantic matches.</>
                ) : (
                  <>
                    Confirm MongoDB and the FastAPI embedding service are running. Ranking is deterministic from stored
                    vectors — no mock scores are applied client-side.
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
                <Button variant="ghost" size="sm" type="button" onClick={() => fetchRecommendations(INITIAL_LIMIT)}>
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

  if (state.kind === 'empty') {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="rounded-full">Cosine-ranked</Badge>
          <Badge variant="secondary" className="rounded-full">Embedding-based</Badge>
        </div>
        <Card className="relative overflow-hidden border border-dashed border-primary/30 bg-card/70 backdrop-blur-md shadow-xl">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-cyan-500/[0.06]" />
          <CardHeader className="relative pb-2">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20 shadow-inner">
                <Cpu className="h-8 w-8" />
              </div>
              <div className="space-y-3 max-w-2xl">
                <CardTitle className="text-xl sm:text-2xl tracking-tight">No ranked vacancies to show yet</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This can mean{' '}
                  <strong className="text-foreground/90 font-medium">your resume embedding is missing</strong> (ML service
                  was down when saving) — or cosine similarity stayed at zero versus current vacancies — or vacancy vectors
                  are not in MongoDB yet.
                </p>
                <ul className="text-sm space-y-2 text-muted-foreground list-none pl-0">
                  <li className="flex gap-2">
                    <span className="text-primary font-semibold">•</span>
                    Edit and save your resume while the embedding API is reachable to index your semantic profile.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-semibold">•</span>
                    For demos run <code className="rounded-md bg-muted px-1.5 py-0.5 text-[0.72rem]">npm run seed:demo</code>{' '}
                    with embeddings enabled, then reopen this page (server still sorts by cosine only).
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
        <Badge variant="outline" className="gap-1.5 rounded-full border-emerald-500/35 text-emerald-800 dark:text-emerald-200">
          <Activity className="h-3 w-3" />
          Live semantic ranking
        </Badge>
        <Badge variant="secondary" className="rounded-full gap-1">
          <Zap className="h-3 w-3" />
          Not keyword search
        </Badge>
        <Badge variant="outline" className="rounded-full opacity-90">
          Top {stats?.count ?? 0} • limit {apiLimit}
        </Badge>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/65 bg-gradient-to-br from-primary/[0.1] to-background shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Matches in view</span>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums tracking-tight">{stats.count}</p>
              <p className="text-xs text-muted-foreground mt-1">Server-ranked slice (semantic score DESC)</p>
            </CardContent>
          </Card>
          <Card className="border-border/65 bg-gradient-to-br from-emerald-500/[0.1] to-background shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top cosine match</span>
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.topMatch}%</p>
              <p className="text-xs text-muted-foreground mt-1">From real similarity curve</p>
            </CardContent>
          </Card>
          <Card className="border-border/65 bg-gradient-to-br from-violet-500/[0.1] to-background shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Explainability hits</span>
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.skillsDetected}</p>
              <p className="text-xs text-muted-foreground mt-1">Overlaps resume ↔ JD text</p>
            </CardContent>
          </Card>
          <Card className="border-border/65 bg-gradient-to-br from-cyan-500/[0.1] to-background shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg. confidence</span>
              <Percent className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.avgConfidence}%</p>
              <p className="text-xs text-muted-foreground mt-1">Mean of cosine-derived scores</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-2 border-b border-border/50">
        <div className="space-y-1 max-w-xl">
          <p className="text-sm font-medium text-foreground">Results</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Showing the top <strong className="text-foreground">{data.length}</strong> semantic matches fetched with{' '}
            <code className="rounded bg-muted px-1 py-px text-[0.72rem]">?limit={apiLimit}</code> — order preserved from
            backend cosine ranking only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasMoreLikelyFive && (
            <Button variant="secondary" size="sm" type="button" className="gap-1 rounded-full shadow-sm" onClick={() => fetchRecommendations(MID_LIMIT)}>
              Show top <span className="font-semibold">{MID_LIMIT}</span>
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          )}
          {hasMoreLikelyMax && (
            <Button variant="secondary" size="sm" type="button" className="gap-1 rounded-full shadow-sm" onClick={() => fetchRecommendations(MAX_LIMIT)}>
              Show all (up to {MAX_LIMIT})
              <ChevronDown className="h-4 w-4 opacity-70" />
            </Button>
          )}
          <Button variant="outline" size="sm" type="button" onClick={refresh} className="gap-2 rounded-full">
            <RefreshCw className="h-4 w-4" />
            Refresh same window
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {data.map((item, idx) => {
          const pct = scoreToPercent(item.score)
          return (
            <Card
              key={item.vacancyId}
              className={cn(
                'group relative overflow-hidden border-border/70 transition-all duration-300',
                'shadow-md hover:shadow-xl hover:border-primary/30 hover:-translate-y-1',
                idx === 0 &&
                  'ring-2 ring-primary/35 bg-gradient-to-b from-primary/[0.06] via-background to-background shadow-lg',
              )}
            >
              {idx === 0 && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="rounded-full bg-primary text-primary-foreground shadow-md gap-1">
                    <Sparkles className="h-3 w-3" />
                    #1 semantic pick
                  </Badge>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-40 group-hover:opacity-80 transition-opacity" />

              <CardHeader className="pb-3 space-y-4 pr-24">
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
                      AI match strength
                    </span>
                    <span className="text-lg font-bold text-foreground tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2.5 bg-primary/15 rounded-full" />
                  <p className="text-[0.7rem] text-muted-foreground">
                    Cosine similarity → display = <code className="text-[0.65rem]">round(score×100)</code>
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

                <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-transparent p-4 space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm tracking-tight">Why this recommendation matches you</h3>
                  </div>

                  {item.matchedSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Matched because your profile includes
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
                    </div>
                  )}

                  <div className="space-y-1.5 text-sm">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Semantic overlap</p>
                    <p className="text-muted-foreground leading-relaxed text-[0.9rem]">{item.explanation}</p>
                  </div>

                  <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/25 px-3 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">Behavioural signals</p>
                    <p className="text-xs text-muted-foreground/85 mt-1">
                      Reserved for apply / click / session patterns — not used in ranking yet.
                    </p>
                  </div>
                </div>

                <Button variant="default" size="sm" className="w-full sm:w-auto gap-2 rounded-full shadow-sm" asChild>
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
