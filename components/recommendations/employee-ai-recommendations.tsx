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
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { RecommendationApiItem } from '@/lib/recommendations-api-types'

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ok'; data: RecommendationApiItem[] }
  | { kind: 'empty' }
  | { kind: 'error'; status: number; message: string }

const LOADING_MESSAGES = [
  'Analyzing your resume…',
  'Comparing embeddings with vacancy vectors…',
  'Generating semantic recommendations…',
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
  const avgConfidence = Math.round(
    data.reduce((acc, d) => acc + d.score, 0) / n * 100,
  )
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

  const load = useCallback(async () => {
    setState({ kind: 'loading' })

    let res: Response
    try {
      res = await fetch('/api/recommendations', {
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
      setState({ kind: 'error', status: 403, message: 'Only job seekers can access AI recommendations.' })
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
      setState({ kind: 'empty' })
      return
    }

    setState({ kind: 'ok', data: data as RecommendationApiItem[] })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (state.kind !== 'loading' && state.kind !== 'idle') return
    const id = setInterval(() => {
      setLoadTick((t) => (t + 1) % LOADING_MESSAGES.length)
    }, 1400)
    return () => clearInterval(id)
  }, [state.kind])

  const loadingMessage = LOADING_MESSAGES[loadTick % LOADING_MESSAGES.length]

  const stats = useMemo(() => {
    if (state.kind !== 'ok') return null
    return computeStats(state.data)
  }, [state])

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card
              key={i}
              className="border-border/70 overflow-hidden bg-gradient-to-b from-muted/40 to-background"
            >
              <CardHeader className="pb-2 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
            </Card>
          ))}
        </div>

        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border border-primary/25',
            'bg-gradient-to-br from-primary/[0.12] via-violet-500/[0.06] to-cyan-500/[0.06] p-6 md:p-8',
          )}
        >
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/20 text-primary shadow-inner">
              <Sparkles className="h-7 w-7 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg text-foreground transition-all duration-300">{loadingMessage}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Cosine similarity in embedding space — your resume vector is matched against every vacancy vector in the
                pool.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card
              key={i}
              className="overflow-hidden border-border/70 shadow-sm transition-opacity duration-500"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-2 w-full" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (state.kind === 'error') {
    return (
      <Card className="border-destructive/30 bg-gradient-to-br from-destructive/[0.04] to-background overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15">
              <Info className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-lg">Something blocked AI recommendations</CardTitle>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{state.message}</p>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {state.status === 404
                  ? 'Complete your resume so we can compute SBERT embeddings and store them in MongoDB. Without a vector for your profile, semantic matching cannot run.'
                  : state.status === 401
                    ? 'Sign in as a job seeker and open this page again.'
                    : 'Confirm MongoDB is reachable and the embedding service is up (same stack as seed:demo + ML service).'}
              </p>
              <div className="flex flex-wrap gap-2 mt-5">
                {state.status === 401 ? (
                  <Button asChild size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/employee/resume/new">Edit resume</Link>
                  </Button>
                )}
                <Button variant="ghost" size="sm" type="button" onClick={() => load()}>
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
      <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
        <Card className="relative overflow-hidden border-dashed border-primary/35 bg-gradient-to-br from-muted/50 via-background to-violet-500/[0.06]">
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/5 blur-2xl" />
          <CardHeader className="relative pb-2">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Cpu className="h-7 w-7" />
              </div>
              <div className="space-y-2 max-w-2xl">
                <CardTitle className="text-xl sm:text-2xl">No semantic matches returned</CardTitle>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The engine ran, but either no vacancy embeddings exist yet, or similarity stayed at zero. For a reliable
                  demo, run <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">npm run seed:demo</code> with the ML
                  service online, then refresh. Also enrich your resume skills — stronger text yields better vectors.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative pt-0 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/employee">Dashboard</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard/employee/resume/new">Complete resume</Link>
            </Button>
            <Button variant="secondary" size="sm" type="button" onClick={() => load()}>
              <RefreshCw className="h-4 w-4 mr-1.5" />
              Run again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/80 bg-gradient-to-br from-primary/[0.08] to-background shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">AI matches</span>
              <Target className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.count}</p>
              <p className="text-xs text-muted-foreground mt-1">Returned by semantic ranking</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-gradient-to-br from-emerald-500/[0.08] to-background shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Top match score</span>
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.topMatch}%</p>
              <p className="text-xs text-muted-foreground mt-1">Highest cosine-derived match</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-gradient-to-br from-violet-500/[0.08] to-background shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills overlap</span>
              <Layers className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.skillsDetected}</p>
              <p className="text-xs text-muted-foreground mt-1">Unique terms vs your resume</p>
            </CardContent>
          </Card>
          <Card className="border-border/80 bg-gradient-to-br from-cyan-500/[0.08] to-background shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Avg. confidence</span>
              <Percent className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold tabular-nums">{stats.avgConfidence}%</p>
              <p className="text-xs text-muted-foreground mt-1">Mean semantic match strength</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground max-w-xl">
          Rankings use <strong className="text-foreground font-medium">real</strong> cosine scores from{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">/api/recommendations</code>. Percentages are{' '}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">round(score × 100)</code> only.
        </p>
        <Button variant="outline" size="sm" type="button" onClick={() => load()} className="shrink-0 gap-2">
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {state.data.map((item, idx) => {
          const pct = scoreToPercent(item.score)
          return (
            <Card
              key={item.vacancyId}
              className={cn(
                'group relative overflow-hidden border-border/80 transition-all duration-300',
                'hover:shadow-xl hover:border-primary/25 hover:-translate-y-0.5',
                idx === 0 && 'ring-2 ring-primary/30 bg-gradient-to-b from-primary/[0.04] to-background shadow-md',
              )}
            >
              {idx === 0 && (
                <div className="absolute top-4 right-4 z-10">
                  <Badge className="rounded-full bg-primary text-primary-foreground shadow-sm gap-1">
                    <Sparkles className="h-3 w-3" />
                    Best semantic match
                  </Badge>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              <CardHeader className="pb-3 space-y-4 pr-24">
                <div className="min-w-0 space-y-1">
                  <h2 className="font-semibold text-xl leading-snug tracking-tight line-clamp-2 text-foreground">
                    {item.title}
                  </h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 shrink-0 opacity-80" />
                    <span className="truncate">{item.company}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      AI match strength
                    </span>
                    <span className="text-base font-bold text-foreground tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2.5 bg-primary/10" />
                  <p className="text-xs text-muted-foreground">Recommendation confidence = semantic similarity (not HR guess).</p>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 pt-0">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Vacancy snapshot</p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.description}</p>
                </div>

                <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-primary shrink-0" />
                    <h3 className="font-semibold text-sm">Why this recommendation matches you</h3>
                  </div>

                  {item.matchedSkills.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Matched because your profile includes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.matchedSkills.map((s) => (
                          <Badge
                            key={s}
                            variant="secondary"
                            className="font-normal text-xs rounded-full px-2.5 py-0.5 bg-background/80 border border-border/60"
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5 text-sm">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Semantic overlap</p>
                    <p className="text-muted-foreground leading-relaxed">{item.explanation}</p>
                  </div>

                  <div className="rounded-lg border border-dashed border-muted-foreground/25 bg-muted/30 px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Behavioural signals</p>
                    <p className="text-xs text-muted-foreground/80 mt-1">Reserved for future click / apply / dwell-time features.</p>
                  </div>
                </div>

                <Button variant="default" size="sm" className="w-full sm:w-auto gap-2" asChild>
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
