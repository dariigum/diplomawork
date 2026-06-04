import Link from 'next/link'
import { Activity, Layers, Sparkles, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { BehaviourAnalyticsSnapshot } from '@/lib/behaviour-analytics'
import { getBehaviourCategoryDisplayName } from '@/lib/behaviour-ui-explanations'
import { formatBehaviourPhraseForDisplay } from '@/lib/recommendations-display-format'
import { getDictionary } from '@/lib/i18n/dictionaries'

type Props = {
  snapshot: BehaviourAnalyticsSnapshot
  variant?: 'full' | 'compact'
  locale?: string
}

function trendBarPct(value: number, max: number): number {
  if (value <= 0) return 0
  const m = Math.max(1, max)
  return Math.min(100, Math.round((value / m) * 100))
}

export function EmployeeBehaviourAnalyticsDashboard({ snapshot, variant = 'full', locale = 'en' }: Props) {
  const t = getDictionary(locale)
  const isCompact = variant === 'compact'
  const { windows, categoryRanked, skillRanked, profileTopCategories, profileTopSkills } = snapshot
  const max7 = Math.max(1, windows.last7Days.viewed, windows.last7Days.saved, windows.last7Days.applied)
  const maxCat = Math.max(1, ...categoryRanked.map((c) => c.weight))

  if (snapshot.coldStart) {
    return (
      <section className={cn('space-y-3', isCompact ? '' : 'pt-2')}>
        <Card className="border-dashed border-border/70 bg-muted/15 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {t.employeeDashboard.interactionInsights}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            {snapshot.summaryLines[0] ? (
              <p className="font-medium text-foreground">{snapshot.summaryLines[0]}</p>
            ) : null}
            {snapshot.summaryLines.slice(1).map((line, i) => (
              <p key={i} className="text-xs">
                {line}
              </p>
            ))}
            <p className="text-[0.65rem] text-muted-foreground/90 pt-2 border-t border-border/50 leading-relaxed">
              {snapshot.footnote}
            </p>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className={cn('space-y-4', isCompact ? '' : 'pt-2')}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className={cn('font-semibold text-foreground tracking-tight', isCompact ? 'text-base' : 'text-lg')}>
            {isCompact ? t.employeeDashboard.signalsFromActivity : t.employeeDashboard.activityAdaptiveSignals}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            {isCompact ? t.employeeDashboard.signalsCompact : t.employeeDashboard.signalsFull}
          </p>
        </div>

        {!isCompact ? (
          <Badge variant="outline" className="rounded-full shrink-0 border-primary/25 bg-primary/[0.06] text-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            {t.employeeDashboard.adaptiveVisibility}
          </Badge>
        ) : null}
      </div>

      <div className={cn('grid gap-4', isCompact ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4')}>
        <Card className="border-border/65 shadow-sm bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t.employeeDashboard.last7Days}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {(
              [
                [t.employeeDashboard.views, windows.last7Days.viewed],
                [t.employeeDashboard.saves, windows.last7Days.saved],
                [t.employeeDashboard.applies, windows.last7Days.applied],
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
              {t.employeeDashboard.days30} {windows.last30Days.viewed} {t.employeeDashboard.views.toLowerCase()} ·{' '}
              {windows.last30Days.saved} {t.employeeDashboard.saves.toLowerCase()} ·{' '}
              {windows.last30Days.applied} {t.employeeDashboard.applies.toLowerCase()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/65 shadow-sm bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {t.employeeDashboard.allTimeTotals}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">{t.employeeDashboard.views}</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.viewed}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">{t.employeeDashboard.saves}</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.saved}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">{t.employeeDashboard.applies}</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.applied}</p>
            </div>
            <div className="rounded-lg border border-border/50 bg-background/60 px-2 py-1.5">
              <p className="text-muted-foreground">{t.employeeDashboard.unsaves}</p>
              <p className="text-lg font-semibold tabular-nums">{windows.allTime.unsaved}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/65 shadow-sm md:col-span-2 lg:col-span-2 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="h-4 w-4 text-muted-foreground" />
              {t.employeeDashboard.favouriteCategories}
            </CardTitle>
            <p className="text-[0.65rem] text-muted-foreground font-normal leading-snug">
              {t.employeeDashboard.categoriesDesc}
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {categoryRanked.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.employeeDashboard.noCategoryMass}</p>
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
                    <Progress value={trendBarPct(c.weight, maxCat)} className="h-1 bg-muted" />
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
            <CardTitle className="text-sm">{t.employeeDashboard.topSkillPhrases}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {skillRanked.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t.employeeDashboard.noSkillPhrases}</p>
            ) : (
              skillRanked.map((s) => (
                <Badge key={s.skill} variant="outline" className="rounded-full text-xs font-normal gap-1.5">
                  {formatBehaviourPhraseForDisplay(s.skill, 48)}
                  <span className="text-[0.65rem] tabular-nums text-muted-foreground">{s.weight}</span>
                </Badge>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/65 shadow-sm bg-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.employeeDashboard.profileBuilderAlignment}</CardTitle>
            <p className="text-[0.65rem] text-muted-foreground font-normal leading-snug">
              {t.employeeDashboard.profileBuilderDesc}
            </p>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div>
              <p className="font-medium text-foreground/90 mb-1">{t.employeeDashboard.categories}</p>
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
              <p className="font-medium text-foreground/90 mb-1">{t.employeeDashboard.skills}</p>
              <p className="leading-relaxed">
                {profileTopSkills.length
                  ? profileTopSkills
                      .slice(0, 8)
                      .map((p) => formatBehaviourPhraseForDisplay(p, 40))
                      .join(' · ')
                  : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {!isCompact ? (
        <Card className="border-border/65 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{t.employeeDashboard.activitySummary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {snapshot.summaryLines[0] ? (
              <p className="text-sm font-medium text-foreground leading-snug">{snapshot.summaryLines[0]}</p>
            ) : null}
            {snapshot.summaryLines.length > 1 ? (
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1.5 leading-relaxed">
                {snapshot.summaryLines.slice(1).map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : null}
            <p className="text-[0.65rem] text-muted-foreground/90 pt-2 border-t border-border/40 leading-relaxed">
              {snapshot.footnote}
            </p>
          </CardContent>
        </Card>
      ) : (
        <p className="text-[0.65rem] text-muted-foreground/90 leading-relaxed">{snapshot.footnote}</p>
      )}

      {isCompact ? (
        <p className="text-xs">
          <Link href="/dashboard/employee" className="text-primary hover:underline">
            {t.employeeDashboard.openWorkspace}
          </Link>{' '}
          {t.employeeDashboard.forFullAnalytics}
        </p>
      ) : null}
    </section>
  )
}
