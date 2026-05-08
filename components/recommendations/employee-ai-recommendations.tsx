'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Building2, ArrowRight, Cpu, Info, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { RecommendationApiItem } from '@/lib/recommendations-api-types'

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading'; message: string }
  | { kind: 'ok'; data: RecommendationApiItem[] }
  | { kind: 'empty' }
  | { kind: 'error'; status: number; message: string }

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

export function EmployeeAiRecommendations() {
  const [state, setState] = useState<LoadState>({ kind: 'idle' })

  const load = useCallback(async () => {
    setState({ kind: 'loading', message: 'Analyzing resume and semantic similarity…' })

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

  if (state.kind === 'idle' || state.kind === 'loading') {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border bg-gradient-to-br from-primary/[0.07] via-background to-violet-500/[0.05] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-foreground">
                {state.kind === 'loading' ? state.message : 'Preparing…'}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Running semantic similarity over your embedding and active vacancies…
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="space-y-2 pb-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-2 w-full" />
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Skeleton className="h-16 w-full" />
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
      <Card className="border-destructive/30 bg-destructive/[0.03]">
        <CardHeader>
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div>
              <p className="font-semibold">{state.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {state.status === 404
                  ? 'Add or update your resume so we can compute SBERT embeddings and match you to roles.'
                  : state.status === 401
                    ? 'Sign in and return to this page.'
                    : 'If the issue persists, ensure MongoDB and the embedding service are running.'}
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {state.status === 401 ? (
                  <Button asChild size="sm">
                    <Link href="/login">Sign in</Link>
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/dashboard/employee/resume/new">Create resume</Link>
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
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <Cpu className="h-10 w-10 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-semibold text-lg">No matches yet</p>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                The semantic engine ran successfully, but no vacancies scored above the current threshold — or vacancy
                embeddings may be missing. Try updating your resume (richer skills and experience usually improve vectors),
                or run <code className="rounded bg-muted px-1 py-0.5 text-xs">npm run seed:demo</code> locally to load
                demo vacancies with embeddings.
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/employee">Dashboard</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/dashboard/employee/resume/new">Add / edit resume</Link>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="rounded-xl border bg-gradient-to-br from-primary/[0.08] via-background to-emerald-500/[0.04] px-5 py-4 max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-semibold">AI-powered matches</span>
            <Badge variant="secondary" className="gap-1">
              <Cpu className="h-3 w-3" />
              Semantic similarity
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Rankings come from cosine similarity between your resume embedding and each vacancy embedding (SBERT vectors
            stored in MongoDB). Percentages reflect the normalized similarity score returned by the engine — nothing is mocked
            on the frontend.
          </p>
        </div>
        <Button variant="outline" size="sm" type="button" onClick={() => load()} className="shrink-0">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {state.data.map((item, idx) => {
          const pct = scoreToPercent(item.score)
          return (
            <Card
              key={item.vacancyId}
              className={cn(
                'relative overflow-hidden border-border/80 transition-shadow hover:shadow-lg',
                idx === 0 && 'ring-1 ring-primary/25 bg-primary/[0.02]',
              )}
            >
              {idx === 0 && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-primary text-primary-foreground">Best match</Badge>
                </div>
              )}
              <CardHeader className="pb-3 space-y-3">
                <div className="flex items-start justify-between gap-3 pr-20">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-lg leading-snug tracking-tight line-clamp-2">{item.title}</h2>
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.company}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span>AI match</span>
                    <span className="text-foreground">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.description}</p>

                <div className="rounded-lg bg-muted/40 border border-border/60 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Why recommended</p>
                  <p className="text-sm leading-relaxed text-foreground/90">{item.explanation}</p>
                </div>

                {item.matchedSkills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Highlighted overlap (resume ↔ listing)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.matchedSkills.map((s) => (
                        <Badge key={s} variant="outline" className="font-normal text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="default" size="sm" className="w-full sm:w-auto" asChild>
                  <Link href={`/jobs/${item.vacancyId}`}>
                    View vacancy <ArrowRight className="ml-2 h-4 w-4" />
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
