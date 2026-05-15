'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronRight,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { BehaviourSessionInsights, RecommendationApiItem } from '@/lib/recommendations-api-types'
import { parseRecommendationsApiPayload } from '@/lib/recommendations-api-types'

const PREVIEW_FETCH_LIMIT = 25

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

function fitTierLabel(pct: number | null): string | null {
  if (pct === null) return null
  if (pct >= 85) return 'Strong fit'
  if (pct >= 70) return 'Good fit'
  if (pct >= 50) return 'Related'
  return 'Exploratory'
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
    state.kind === 'ok' && state.topTitle
      ? (() => {
          const tier = fitTierLabel(state.topPercent)
          return `Top pick: ${state.topTitle}${state.topCompany ? ` · ${state.topCompany}` : ''}${
            tier ? ` · ${tier}` : ''
          }`
        })()
      : state.kind === 'ok'
        ? `${state.count} roles in this preview.`
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
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="gap-1.5 rounded-full border-primary/30 bg-primary/15 px-3 py-1 text-primary shadow-sm transition-colors hover:bg-primary/20">
              <Sparkles className="h-3.5 w-3.5" />
              Semantic recommendations
            </Badge>
          </div>

          <AiReadinessStrip serverHints={serverHints} state={state} />

          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Roles matched for you</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xl leading-relaxed">
              Live preview from the same list as your recommendations page — personalized, not keyword search.
            </p>
          </div>

          {insightLine && (
            <p className="text-sm text-foreground/90 leading-relaxed max-w-2xl flex gap-2 rounded-xl border border-primary/15 bg-background/55 px-3.5 py-2.5 backdrop-blur-sm transition-colors duration-200 hover:border-primary/25">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <span>{insightLine}</span>
            </p>
          )}

          {state.kind === 'ok' && state.behaviourSession ? (
            <details className="rounded-xl border border-amber-500/25 bg-amber-500/[0.05] dark:bg-amber-500/[0.08] px-3.5 py-3 max-w-2xl">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-foreground outline-none marker:content-none [&::-webkit-details-marker]:hidden">
                <Info className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300 shrink-0" />
                Why these roles match you
              </summary>
              <div className="mt-3 space-y-2 pt-2 border-t border-border/40">
                {state.behaviourSession.productBadge ? (
                  <Badge variant="secondary" className="rounded-full text-[0.65rem] font-normal">
                    {state.behaviourSession.productBadge}
                  </Badge>
                ) : null}
                <p className="text-xs text-muted-foreground leading-relaxed">{state.behaviourSession.neutralSemanticLine}</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-3.5">
                  {state.behaviourSession.dashboardLines.slice(0, 3).map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </details>
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
                    In this preview
                  </p>
                  <p className="text-3xl font-bold tabular-nums tracking-tight text-foreground mt-1">{state.count}</p>
                  <p className="text-xs text-muted-foreground leading-snug mt-1.5">
                    Previewing {state.count} matched roles
                  </p>
                </div>
                <div className="min-w-0 rounded-xl border border-border/55 bg-gradient-to-br from-emerald-500/[0.08] to-background/95 p-4 shadow-sm transition-all duration-300 hover:border-emerald-500/25 hover:shadow-md">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Match strength
                  </p>
                  {state.topPercent !== null ? (
                    <>
                      <p className="text-2xl font-bold tracking-tight text-foreground mt-1">
                        {fitTierLabel(state.topPercent)}
                      </p>
                      <p className="text-[0.65rem] text-muted-foreground mt-1">Compared with other roles in this batch</p>
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
                  <span className="text-foreground/80">Updated {formatSyncedLabel(state.syncedAt)}</span>
                </div>
              </div>
            )}

            {state.kind === 'empty' && (
              <div className="space-y-3 max-w-lg">
                <p className="text-sm font-medium text-foreground">No strong matches found yet.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Try updating your profile or resume, or browse more roles — then refresh.
                </p>
                <p className="text-xs text-muted-foreground tabular-nums">Checked {formatSyncedLabel(state.syncedAt)}</p>
                {state.behaviourSession ? (
                  <details className="rounded-lg border border-border/60 bg-muted/25 px-3 py-2.5">
                    <summary className="cursor-pointer text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground list-none marker:content-none [&::-webkit-details-marker]:hidden">
                      Activity context
                    </summary>
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-muted-foreground">{state.behaviourSession.neutralSemanticLine}</p>
                      <ul className="text-xs text-muted-foreground list-disc pl-3.5 space-y-0.5">
                        {state.behaviourSession.dashboardLines.slice(0, 2).map((line, i) => (
                          <li key={i}>{line}</li>
                        ))}
                      </ul>
                    </div>
                  </details>
                ) : null}
              </div>
            )}

            {state.kind === 'no_resume' && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Add a resume to unlock personalized recommendations.
              </p>
            )}

            {state.kind === 'no_embedding' && (
              <div className="space-y-2 max-w-md">
                <p className="text-sm font-medium text-foreground">Finish setting up your profile</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Your resume is saved, but we still need a complete match profile. Re-save from the resume editor, then
                  try again.
                </p>
              </div>
            )}

            {state.kind === 'pipeline_error' && (
              <div className="space-y-2 max-w-md">
                <p className="text-sm font-medium text-foreground">We couldn&apos;t load recommendations right now.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Please try again in a moment.</p>
              </div>
            )}

            {state.kind === 'error' && (
              <div className="space-y-2 max-w-md">
                <p className="text-sm font-medium text-foreground">We couldn&apos;t load recommendations right now.</p>
                <p className="text-sm text-muted-foreground leading-relaxed">Please try again in a moment.</p>
              </div>
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

      <div className="relative border-t border-border/50 bg-muted/20 px-5 py-2.5 sm:px-7 text-[0.7rem] sm:text-xs text-muted-foreground">
        Personalized on the server — the numbers you see come from your latest data.
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
  let label = ''
  let variant: 'default' | 'secondary' | 'outline' | 'destructive' = 'secondary'

  if (state.kind === 'loading' || state.kind === 'idle') {
    label = 'Preparing recommendations…'
    variant = 'secondary'
  } else if (state.kind === 'ok') {
    label = 'Recommendations ready'
    variant = 'default'
  } else if (state.kind === 'empty') {
    label = 'No matches in this preview'
    variant = 'outline'
  } else if (state.kind === 'no_resume') {
    label = 'Resume needed'
    variant = 'secondary'
  } else if (state.kind === 'no_embedding') {
    label = 'Profile setup needed'
    variant = 'secondary'
  } else if (state.kind === 'pipeline_error' || state.kind === 'error') {
    label = 'Unavailable'
    variant = 'destructive'
  }

  if (!label) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={variant}
        className={cn(
          'rounded-full text-xs font-normal shadow-sm',
          variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        {label}
      </Badge>
      {(state.kind === 'loading' || state.kind === 'idle') && !serverHints.hasResume ? (
        <span className="text-xs text-muted-foreground">Add a resume to get started.</span>
      ) : null}
    </div>
  )
}
