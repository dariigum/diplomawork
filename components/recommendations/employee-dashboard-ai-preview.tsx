'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Activity, BrainCircuit, ChevronRight, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'

const PREVIEW_FETCH_LIMIT = 25

type PreviewState =
  | { kind: 'idle' | 'loading' }
  | { kind: 'ok'; count: number; topPercent: number | null }
  | { kind: 'empty' }
  | { kind: 'no_resume' }
  | { kind: 'error' }

function scoreToPercent(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(100, Math.round(score * 100)))
}

export function EmployeeDashboardAiPreview() {
  const [state, setState] = useState<PreviewState>({ kind: 'idle' })

  const load = () => {
    setState({ kind: 'loading' })
    fetch(`/api/recommendations?limit=${PREVIEW_FETCH_LIMIT}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    })
      .then(async (res) => {
        if (res.status === 404) {
          setState({ kind: 'no_resume' })
          return
        }
        if (!res.ok) {
          setState({ kind: 'error' })
          return
        }
        const data = await res.json().catch(() => null)
        if (!Array.isArray(data) || data.length === 0) {
          setState({ kind: 'empty' })
          return
        }
        const topScore = typeof data[0]?.score === 'number' ? data[0].score : null
        setState({
          kind: 'ok',
          count: data.length,
          topPercent: topScore !== null ? scoreToPercent(topScore) : null,
        })
      })
      .catch(() => setState({ kind: 'error' }))
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-violet-600/[0.1] via-background/95 to-cyan-500/[0.08] backdrop-blur-md shadow-lg">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative p-5 sm:p-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-4 min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full gap-1.5 bg-primary/15 text-primary border border-primary/25">
              <BrainCircuit className="h-3.5 w-3.5" />
              AI insights
            </Badge>
            <Badge variant="outline" className="rounded-full gap-1 text-xs">
              <Activity className="h-3 w-3" />
              Semantic cosine ranking
            </Badge>
            <Badge variant="secondary" className="rounded-full text-xs">
              Embeddings
            </Badge>
          </div>

          <div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">Semantic job preview</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl leading-relaxed">
              Snapshot from the same SBERT embedding pipeline — not keyword search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {(state.kind === 'idle' || state.kind === 'loading') && (
              <>
                <div className="space-y-1.5 min-w-[8rem]">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                </div>
                <div className="space-y-1.5 min-w-[11rem]">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-full rounded-full max-w-[10rem]" />
                </div>
              </>
            )}

            {state.kind === 'ok' && (
              <>
                <div>
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    AI matches ready
                  </p>
                  <p className="text-2xl font-bold tabular-nums">{state.count}</p>
                  <p className="text-xs text-muted-foreground">Within top {PREVIEW_FETCH_LIMIT} ranked</p>
                </div>
                <div className="min-w-[10rem] max-w-xs flex-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                    Top semantic match
                  </p>
                  {state.topPercent !== null ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold tabular-nums">{state.topPercent}%</span>
                        <span className="text-xs text-muted-foreground">cosine → %</span>
                      </div>
                      <Progress value={state.topPercent} className="h-1.5 mt-2 bg-primary/15" />
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">—</p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-55" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-muted-foreground">Embedding profile indexed</span>
                </div>
              </>
            )}

            {state.kind === 'no_resume' && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                No resume → no embedding vector stored. Complete your semantic profile to unlock AI-ranked vacancies.
              </p>
            )}

            {state.kind === 'empty' && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-md">
                Resume exists but ranking returned zero rows — regenerate embeddings or add demo vacancies via{' '}
                <code className="rounded bg-muted px-1 text-xs">seed:demo</code>.
              </p>
            )}

            {state.kind === 'error' && (
              <p className="text-sm text-muted-foreground">Could not reach AI rankings. Retry when services are stable.</p>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
          <Button asChild className="rounded-full shadow-md gap-1">
            <Link href="/dashboard/employee/recommendations">
              Open AI matches <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="outline" size="sm" type="button" className="rounded-full gap-1.5 bg-background/70" onClick={load}>
            <RefreshCw className="h-4 w-4" />
            Sync preview
          </Button>
        </div>
      </div>

      <div className="relative border-t border-border/55 bg-muted/25 px-5 py-2.5 sm:px-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>Vectors in Mongo • FastAPI encoder • cosine sort server-side — UI never invents scores.</span>
      </div>
    </div>
  )
}
