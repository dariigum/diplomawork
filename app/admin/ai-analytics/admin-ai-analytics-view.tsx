'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BrainCircuit, Target, Database } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { RecommendationEvalResults } from '@/lib/recommendation-eval-results'

type AdminAiAnalyticsViewProps = {
  evalResults: RecommendationEvalResults | null
  hasComputedMetrics: boolean
}

const COLORS = ['hsl(var(--muted))']

const matchDistributionData = [{ name: 'No data', value: 1 }]

function formatMetric(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return value.toFixed(3)
}

function metricSubtitle(hasComputedMetrics: boolean, evalResults: RecommendationEvalResults | null): string {
  if (hasComputedMetrics && evalResults) {
    return `${evalResults.evaluatedUsers} user(s) · ${new Date(evalResults.generatedAt).toLocaleString()}`
  }
  if (evalResults && evalResults.evaluatedUsers === 0) {
    return 'Insufficient data'
  }
  return 'Planned — run npm run eval:recommendations'
}

export function AdminAiAnalyticsView({ evalResults, hasComputedMetrics }: AdminAiAnalyticsViewProps) {
  const precisionLabel = hasComputedMetrics ? formatMetric(evalResults?.precisionAt10 ?? null) : 'Planned'
  const recallLabel = hasComputedMetrics ? formatMetric(evalResults?.recallAt10 ?? null) : 'Planned'
  const precisionSub = metricSubtitle(hasComputedMetrics, evalResults)
  const recallSub = metricSubtitle(hasComputedMetrics, evalResults)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">AI Analytics Panel</h1>
        <p className="text-muted-foreground">Monitor recommendation system performance and embedding metrics.</p>
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
            <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
            <BrainCircuit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Planned</div>
            <p className="text-xs text-muted-foreground">Not part of offline eval pipeline</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qdrant Vector DB</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Planned</div>
            <p className="text-xs text-muted-foreground">Status unavailable</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Model Performance Trends</CardTitle>
            <CardDescription>Precision and Recall over time</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              {hasComputedMetrics ? 'Historical trend logging is planned.' : 'Insufficient data — run offline evaluation first.'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recommendation Match Distribution</CardTitle>
            <CardDescription>Distribution of match scores for all recommendations</CardDescription>
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
