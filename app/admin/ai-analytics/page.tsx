import {
  hasComputedEvalMetrics,
  loadRecommendationEvalResults,
} from '@/lib/recommendation-eval-results'
import { AdminAiAnalyticsView } from './admin-ai-analytics-view'

export default function AdminAiAnalyticsPage() {
  const evalResults = loadRecommendationEvalResults()
  const hasComputedMetrics = hasComputedEvalMetrics(evalResults)

  return <AdminAiAnalyticsView evalResults={evalResults} hasComputedMetrics={hasComputedMetrics} />
}
