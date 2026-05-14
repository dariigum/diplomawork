import Link from 'next/link'
import { Activity, BarChart3, Layers, Sparkles, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { BehaviourAnalyticsSnapshot } from '@/lib/behaviour-analytics'
import { getBehaviourCategoryDisplayName } from '@/lib/behaviour-ui-explanations'

type Props = {
  snapshot: BehaviourAnalyticsSnapshot
  variant?: 'full' | 'compact'
}

function trendBarPct(value: number, max: number): number {
  if (value <= 0) return 0
  const m = Math.max(1, max)
  return Math.min(100, Math.round((value / m) * 100))
}

export function EmployeeBehaviourAnalyticsDashboard({ snapshot, variant = 'full' }: Props) {
  const isCompact = variant === 'compact'
  const { windows, categoryRanked, skillRanked, profileTopCategories, profileTopSkills } = snapshot
  const max7 = Math.max(1, windows.last7Days.viewed, windows.last7Days.saved, windows.last7Days.applied)
  const maxCat = Math.max(1, ...categoryRanked.map((c) => c.weight))

  if (snapshot.coldStart) {
    return (
      <section className={cn('space-y-3', isCompact ? '' : 'pt-2')}>
        {!isCompact ? (
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-4 w-4 text-primary" />
            Behaviour analytics
          </div>
        ) : null}
        <Card className="border-dashed border-border/70 bg-muted/15 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              Interaction insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            {snapshot.summaryLines.map((line, i) => (
              <p key={i}>{line}</p>
            ))}
            <p className="text-xs pt-1 border-t border-border/50">{snapshot.footnote}</p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className={cn('space-y-4', isCompact ? '' : 'pt-2')}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          {!isCompact ? (
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
              Behaviour analytics
            </div>
          ) : null}
          <h2 className={cn('font-semibold text-foreground tracking-tight', isCompact ? 'text-base' : 'text-lg')}>
            Activity & adaptive signals
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Derived from recorded interactions only — same category rules as elsewhere. Not a separate ML training
            pipeline.
          </p>
        </div>
        {!isCompact ? (
          <Badge variant="outline" className="rounded-full shrink-0 border-primary/25 bg-primary/[0.06] text-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            Adaptive visibility
          </Badge>
        ) : null}
      </div>

      <div className={cn('grid gap-4', isCompact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4')}>
        <Card className="border-border/65 shadow-sm bg-gradient-to-br from-primary/[0.06] to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Last 7 days
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {(
              [
                ['Views', windows.last7Days.viewed],
                ['Saves', windows.last7Days.saved],
                ['Applies', windows.last7Days.applied],
              ] as const
            ).map(([label, n]) => (
              <div key={label}>
                <div className="flex justify-between text-muted-foreground mb-1">
                  <span>{label}</span>
                  <span className="tabular-nums text-foreground font-medium">{n}</span>
                </div>
                <Progress value={trendBarPct(n, max7)} className="h-1.5 bg-primary/10" />
              </div>
            ))}
            <p className="text-[0.65rem] text-muted-foreground pt-1 border-t border-border/40">
              30 days: {windows.last30Days.viewed} views · {windows.last30Days.saved} saves ·{' '}
              {windows.last30Days.applied} applies
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/65 shadow-sm bg-gradient-to-br from-emerald-500/[0.07] to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-600" />
              All-time totals
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">Views</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.viewed}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">Saves</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.saved}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">Applies</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.applied}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">Unsaves</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.unsaved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/65 shadow-sm md:col-span-2 lg:col-span-2 bg-gradient-to-br from-violet-500/[0.06] to-background">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-violet-600" />
              Favourite inferred categories
            </CardTitle>
            <p className="text-xs text-muted-foreground font-normal leading-snug">
              Weighted by views/saves/applies on vacancies tagged via keyword buckets (~90d window, capped reads).
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryRanked.length === 0 ? (
              <p className="text-xs text-muted-foreground">No category mass in the current window.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {categoryRanked.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-1 rounded-xl border border-border/55 bg-background/70 px-3 py-2 min-w-[7.5rem]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="rounded-full text-xs font-medium">
                        {c.label}
                      </Badge>
                      <span className="text-[0.65rem] tabular-nums text-muted-foreground">{c.weight}</span>
                    </div>
                    <Progress value={trendBarPct(c.weight, maxCat)} className="h-1 bg-violet-500/15" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={cn('grid gap-4', isCompact ? 'md:grid-cols-1' : 'lg:grid-cols-2')}>
        <Card className="border-border/65 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top skill phrases (weighted)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {skillRanked.length === 0 ? (
              <p className="text-xs text-muted-foreground">No skill phrases aggregated in this window.</p>
            ) : (
              skillRanked.map((s) => (
                <Badge key={s.skill} variant="outline" className="rounded-full text-xs font-normal gap-1.5">
                  {s.skill}
                  <span className="text-[0.65rem] tabular-nums text-muted-foreground">{s.weight}</span>
                </Badge>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/65 shadow-sm bg-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Profile builder alignment</CardTitle>
            <p className="text-xs text-muted-foreground font-normal">
              Same `buildUserBehaviourProfile` lists used in recommendation context — shown for transparency.
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground/90 mb-1">Categories</p>
              <div className="flex flex-wrap gap-1">
                {profileTopCategories.length ? (
                  profileTopCategories.map((id) => (
                    <Badge key={id} variant="secondary" className="rounded-full text-[0.65rem]">
                      {getBehaviourCategoryDisplayName(id)}
                    </Badge>
                  ))
                ) : (
                  <span>—</span>
                )}
              </div>
            </div>
            <div>
              <p className="font-medium text-foreground/90 mb-1">Skills</p>
              <p className="leading-relaxed">{profileTopSkills.length ? profileTopSkills.slice(0, 8).join(' · ') : '—'}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isCompact ? (
        <Card className="border-primary/15 bg-gradient-to-r from-background to-primary/[0.04]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Activity summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
              {snapshot.summaryLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground/90 pt-1 border-t border-border/40">{snapshot.footnote}</p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground/90">{snapshot.footnote}</p>
      )}

      {isCompact ? (
        <p className="text-xs">
          <Link href="/dashboard/employee" className="text-primary hover:underline">
            Open workspace
          </Link>{' '}
          for the full analytics card.
        </p>
      ) : null}
    </section>
  )
}
