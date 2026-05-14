'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BrainCircuit,
  ChevronRight,
  Info,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { BehaviourSessionInsights, RecommendationApiItem } from '@/lib/recommendations-api-types'
import { parseRecommendationsApiPayload } from '@/lib/recommendations-api-types'

const PREVIEW_FETCH_LIMIT = 25

const PREVIEW_PROGRESS =
  'h-2 mt-1 bg-primary/12 [&_[data-slot=progress-indicator]]:transition-transform [&_[data-slot=progress-indicator]]:duration-700 [&_[data-slot=progress-indicator]]:ease-out'

export type EmployeeDashboardAiServerHints = {
  hasResume: boolean
  /** Latest resume document has a non-empty embedding array (DB truth at render time). */
  embeddingIndexed: boolean
}

type PreviewState =
  | { kind: 'idle' | 'loading' }
  | {
      kind: 'ok'
      count: number
      topPercent: number | null
      topTitle: string | null
      topCompany: string | null
      syncedAt: number
      behaviourSession: BehaviourSessionInsights | null
    }
  | { kind: 'empty'; syncedAt: number; behaviourSession: BehaviourSessionInsights | null }
  | { kind: 'no_resume' }
  | { kind: 'no_embedding'; message: string }
  | { kind: 'pipeline_error'; message: string }
  | { kind: 'error' }

async function readPreviewErrorMessage(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: unknown } | null
  return typeof body?.error === 'string' ? body.error : `Request failed (${res.status}).`
}

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

function formatSyncedLabel(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(ts))
  } catch {
    return ''
  }
}

type EmployeeDashboardAiPreviewProps = {
  serverHints: EmployeeDashboardAiServerHints
}

export function EmployeeDashboardAiPreview({ serverHints }: EmployeeDashboardAiPreviewProps) {
  const [state, setState] = useState<PreviewState>({ kind: 'idle' })

  const load = () => {
    setState({ kind: 'loading' })
    fetch(`/api/recommendations?limit=${PREVIEW_FETCH_LIMIT}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (res) => {
        const syncedAt = Date.now()
        if (res.status === 404) {
          setState({ kind: 'no_resume' })
          return
        }
        if (res.status === 422) {
          const message = await readPreviewErrorMessage(res)
          setState({ kind: 'no_embedding', message })
          return
        }
        if (res.status === 503) {
          const message = await readPreviewErrorMessage(res)
          setState({ kind: 'pipeline_error', message })
          return
        }
        if (!res.ok) {
          setState({ kind: 'error' })
          return
        }
        const raw = (await res.json().catch(() => null)) as unknown
        const { recommendations, behaviourSession } = parseRecommendationsApiPayload(raw)
        if (recommendations.length === 0) {
          setState({ kind: 'empty', syncedAt, behaviourSession: behaviourSession ?? null })
          return
        }
        const first = recommendations[0] as RecommendationApiItem
        const topScore = typeof first?.score === 'number' ? first.score : null
        setState({
          kind: 'ok',
          count: recommendations.length,
          topPercent: topScore !== null ? scoreToPercent(topScore) : null,
          topTitle: typeof first?.title === 'string' ? first.title : null,
          topCompany: typeof first?.company === 'string' ? first.company : null,
          syncedAt,
          behaviourSession: behaviourSession ?? null,
        })
      })
      .catch(() => setState({ kind: 'error' }))
  }

  useEffect(() => {
    load()
  }, [])

  const insightLine =
    state.kind === 'ok' && state.topPercent !== null && state.topTitle
      ? `Strongest match in this preview: ${state.topTitle}${state.topCompany ? ` · ${state.topCompany}` : ''} · ${state.topPercent}% hybrid.`
      : state.kind === 'ok' && state.topPercent !== null
        ? `${state.count} roles ranked in this window — best hybrid score ${state.topPercent}%.`
        : state.kind === 'ok'
          ? `${state.count} ranked roles in this preview window.`
          : null

  return (
    <div
      className={cn(
        'group/preview relative overflow-hidden rounded-2xl border border-primary/20',
        'bg-gradient-to-br from-violet-600/[0.12] via-background to-cyan-500/[0.09] backdrop-blur-md',
        'shadow-md ring-1 ring-primary/[0.07]',
        'transition-all duration-300 hover:shadow-lg hover:border-primary/30',
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl opacity-90 transition-opacity duration-500 group-hover/preview:opacity-100" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-cyan-500/12 blur-3xl" />

      <div className="relative p-5 sm:p-6 md:p-7 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:justify-between">
        <div className="space-y-5 min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 rounded-full border-primary/30 bg-primary/15 px-3 py-1 text-primary shadow-sm transition-colors hover:bg-primary/20">
                <BrainCircuit className="h-3.5 w-3.5" />
                ML-powered matching
              </Badge>
              <Badge variant="outline" className="rounded-full border-violet-500/40 text-violet-700 dark:text-violet-300 text-xs shadow-sm">
                SBERT embeddings
              </Badge>
              <Badge variant="secondary" className="rounded-full gap-1 text-xs shadow-sm transition-colors hover:bg-secondary/90">
                <Zap className="h-3 w-3" />
                Hybrid-ranked
              </Badge>
            </div>
          </div>

          <AiReadinessStrip serverHints={serverHints} state={state} />

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Semantic job matches</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
              Live preview of the same server ranking as your full list — hybrid (semantic×0.85 + behaviour×0.15), not keyword search.
            </p>
          </div>

          {insightLine && (
            <p className="text-sm text-foreground/90 leading-relaxed max-w-2xl flex gap-2 rounded-xl border border-primary/15 bg-background/55 px-3.5 py-2.5 backdrop-blur-sm transition-colors duration-200 hover:border-primary/25">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>{insightLine}</span>
            </p>
          )}

          {state.kind === 'ok' && state.behaviourSession ? (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] dark:bg-amber-500/[0.08] px-3.5 py-3 max-w-2xl space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-foreground">
                <Info className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                <span>Lightweight activity insights</span>
                {state.behaviourSession.productBadge ? (
                  <Badge variant="secondary" className="rounded-full text-[0.65rem] font-normal">
                    {state.behaviourSession.productBadge}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full text-[0.65rem] font-normal">
                    Semantic-only for now
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{state.behaviourSession.neutralSemanticLine}</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-3.5">
                {state.behaviourSession.dashboardLines.slice(0, 3).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex flex-wrap items-start gap-x-8 gap-y-5">
            {(state.kind === 'idle' || state.kind === 'loading') && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 w-full max-w-xl">
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-2">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-3 w-32 rounded-md" />
                </div>
                <div className="rounded-xl border border-border/50 bg-muted/15 p-4 space-y-2">
                  <Skeleton className="h-3 w-28 rounded-md" />
                  <Skeleton className="h-2 w-full rounded-full bg-primary/10" />
                  <Skeleton className="h-3 w-3/4 rounded-md mt-2" />
                </div>
              </div>
            )}

            {state.kind === 'ok' && (
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 w-full max-w-3xl">
                <div className="rounded-xl border border-border/55 bg-gradient-to-br from-primary/[0.08] to-background/95 p-4 shadow-sm transition-all duration-300 hover:border-primary/25 hover:shadow-md">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Matches in preview
                  </p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground mt-1">{state.count}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-1.5">
                    Server slice (max {PREVIEW_FETCH_LIMIT} per request)
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-border/55 bg-gradient-to-br from-emerald-500/[0.08] to-background/95 p-4 shadow-sm transition-all duration-300 hover:border-emerald-500/25 hover:shadow-md">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Top semantic match
                  </p>
                  {state.topPercent !== null ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2 mt-1">
                        <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground">{state.topPercent}%</span>
                        <span className="text-xs text-muted-foreground">hybrid final → display %</span>
                      </div>
                      <Progress value={state.topPercent} className={PREVIEW_PROGRESS} />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">—</p>
                  )}
                  {state.topTitle && (
                    <p
                      className="text-sm font-medium text-foreground truncate pt-2 border-t border-border/40 mt-2"
                      title={state.topTitle}
                    >
                      {state.topTitle}
                    </p>
                  )}
                </div>
                <div className="flex flex-col justify-center gap-1.5 rounded-xl border border-border/55 bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:col-span-2 lg:col-span-1 transition-colors duration-300 hover:bg-muted/30">
                  <span className="inline-flex items-center gap-2 justify-start">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Preview in sync
                  </span>
                  <span className="tabular-nums text-foreground/80">Refreshed {formatSyncedLabel(state.syncedAt)}</span>
                </div>
              </div>
            )}

            {state.kind === 'empty' && (
              <div className="space-y-3 max-w-lg">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Matcher returned successfully, but no roles cleared the bar yet — check vacancy embeddings or seed data.
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">Checked {formatSyncedLabel(state.syncedAt)}</p>
                {state.behaviourSession ? (
                  <div className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5 space-y-1.5">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                      Activity context (still shown)
                    </p>
                    <p className="text-xs text-muted-foreground">{state.behaviourSession.neutralSemanticLine}</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-3.5 space-y-0.5">
                      {state.behaviourSession.dashboardLines.slice(0, 2).map((line, i) => (
                        <li key={i}>{line}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {state.kind === 'no_resume' && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Add a resume to build your profile — semantic ranking starts after your first save.
              </p>
            )}

            {state.kind === 'no_embedding' && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{state.message}</p>
            )}

            {state.kind === 'pipeline_error' && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{state.message}</p>
            )}

            {state.kind === 'error' && (
              <p className="text-sm text-muted-foreground max-w-md">
                Could not reach the matcher. Check your session and tap Refresh preview.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 lg:justify-center border-t border-border/40 lg:border-t-0 lg:border-l lg:pl-6 pt-5 lg:pt-0">
          <Button asChild className="rounded-full shadow-md gap-1 transition-transform hover:translate-x-0.5">
            <Link href="/dashboard/employee/recommendations">
              Explore all matches <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            className="rounded-full gap-1.5 bg-background/70 border-border/80 backdrop-blur-sm transition-colors hover:bg-background"
            onClick={load}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh preview
          </Button>
        </div>
      </div>

      <div className="relative border-t border-border/50 bg-muted/20 px-5 py-2.5 sm:px-7 flex flex-wrap items-center gap-2 text-[0.7rem] sm:text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>Vectors server-side · hybrid sort on the API · UI shows returned scores only.</span>
      </div>
    </div>
  )
}

function AiReadinessStrip({
  serverHints,
  state,
}: {
  serverHints: EmployeeDashboardAiServerHints
  state: PreviewState
}) {
  const chips: { key: string; label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }[] = []

  if (state.kind === 'loading' || state.kind === 'idle') {
    chips.push({ key: 'sync', label: 'Checking matcher…', variant: 'secondary' })
    if (serverHints.hasResume) {
      chips.push({ key: 'resume', label: 'Resume on file', variant: 'outline' })
    }
    if (serverHints.embeddingIndexed) {
      chips.push({ key: 'emb', label: 'Resume vector stored', variant: 'outline' })
    }
    if (!serverHints.hasResume) {
      chips.push({ key: 'nr', label: 'No resume yet', variant: 'outline' })
    } else if (!serverHints.embeddingIndexed) {
      chips.push({ key: 'pend', label: 'Embedding not stored', variant: 'outline' })
    }
  } else if (state.kind === 'ok') {
    chips.push({ key: 'live', label: 'Recommendations available', variant: 'default' })
    chips.push({ key: 'idx', label: 'Semantic profile indexed', variant: 'outline' })
    if (state.behaviourSession && !state.behaviourSession.coldStart) {
      chips.push({ key: 'beh', label: 'Behaviour-aware notes on', variant: 'outline' })
    }
  } else if (state.kind === 'empty') {
    chips.push({ key: 'ready', label: 'Matcher online', variant: 'outline' })
    chips.push({ key: 'short', label: 'Shortlist empty', variant: 'secondary' })
    if (serverHints.embeddingIndexed) {
      chips.push({ key: 'idx', label: 'Resume vector stored', variant: 'outline' })
    }
  } else if (state.kind === 'no_resume') {
    chips.push({ key: 'nr', label: 'Resume required for AI matches', variant: 'secondary' })
  } else if (state.kind === 'no_embedding') {
    chips.push({ key: 'pend', label: 'Embedding pending', variant: 'secondary' })
    chips.push({ key: 'resume', label: 'Resume on file', variant: 'outline' })
  } else if (state.kind === 'pipeline_error' || state.kind === 'error') {
    chips.push({ key: 'off', label: 'Matcher unavailable', variant: 'destructive' })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mr-1">AI status</span>
      {chips.map((c) => (
        <Badge
          key={c.key}
          variant={c.variant}
          className={cn(
            'rounded-full text-xs font-normal transition-all duration-200 shadow-sm',
            c.variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {c.label}
        </Badge>
      ))}
      <Badge variant="outline" className="rounded-full gap-1 text-[0.65rem] font-normal border-primary/20 shadow-sm">
        <Target className="h-3 w-3" />
        Live data
      </Badge>
    </div>
  )
}
