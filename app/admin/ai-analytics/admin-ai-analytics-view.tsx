'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BrainCircuit, Target, Database } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { RecommendationEvalResults } from '@/lib/recommendation-eval-results'
import { useI18n } from '@/lib/i18n/provider'

type AdminAiAnalyticsViewProps = {
  evalResults: RecommendationEvalResults | null
  hasComputedMetrics: boolean
}

const COLORS = ['hsl(var(--muted))']

function formatMetric(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return value.toFixed(3)
}

export function AdminAiAnalyticsView({ evalResults, hasComputedMetrics }: AdminAiAnalyticsViewProps) {
  const { t, locale } = useI18n()
  const precisionLabel = hasComputedMetrics ? formatMetric(evalResults?.precisionAt10 ?? null) : t.admin.aiAnalytics.planned
  const recallLabel = hasComputedMetrics ? formatMetric(evalResults?.recallAt10 ?? null) : t.admin.aiAnalytics.planned

  const matchDistributionData = [{ name: t.admin.aiAnalytics.noData, value: 1 }]

  function metricSubtitle(hasComputedMetrics: boolean, evalResults: RecommendationEvalResults | null): string {
    if (hasComputedMetrics && evalResults) {
      const userLabel = locale === 'ru' ? t.admin.aiAnalytics.evaluatedUsers : locale === 'kk' ? t.admin.aiAnalytics.evaluatedUsers : 'user(s)';
      return `${evalResults.evaluatedUsers} ${userLabel} · ${new Date(evalResults.generatedAt).toLocaleString()}`
    }
    if (evalResults && evalResults.evaluatedUsers === 0) {
      return t.admin.aiAnalytics.insufficientDataSub
    }
    return t.admin.aiAnalytics.plannedEvalSub
  }

  const precisionSub = metricSubtitle(hasComputedMetrics, evalResults)
  const recallSub = metricSubtitle(hasComputedMetrics, evalResults)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t.admin.aiAnalytics.title}</h1>
        <p className="text-muted-foreground">{t.admin.aiAnalytics.subtitle}</p>
        {evalResults?.methodology && (
          <p className="mt-2 text-xs text-muted-foreground max-w-4xl">{evalResults.methodology}</p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precision@10</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{precisionLabel}</div>
            <p className="text-xs text-muted-foreground">{precisionSub}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recall@10</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recallLabel}</div>
            <p className="text-xs text-muted-foreground">{recallSub}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin.aiAnalytics.avgMatchScore}</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t.admin.aiAnalytics.planned}</div>
            <p className="text-xs text-muted-foreground">{t.admin.aiAnalytics.notPartOfEval}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t.admin.aiAnalytics.qdrantVectorDb}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{t.admin.aiAnalytics.planned}</div>
            <p className="text-xs text-muted-foreground">{t.admin.aiAnalytics.statusUnavailable}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t.admin.aiAnalytics.modelPerformanceTrends}</CardTitle>
            <CardDescription>{t.admin.aiAnalytics.precisionRecallTime}</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {hasComputedMetrics ? t.admin.aiAnalytics.historicalTrendsPlanned : t.admin.aiAnalytics.insufficientData}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t.admin.aiAnalytics.matchDistribution}</CardTitle>
            <CardDescription>{t.admin.aiAnalytics.matchDistributionDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={matchDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name }) => name}
                  >
                    {matchDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
