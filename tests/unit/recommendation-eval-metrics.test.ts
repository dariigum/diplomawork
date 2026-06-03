import { describe, expect, it } from 'vitest'
import {
  computeRecommendationRankMetrics,
  distributionStats,
  mean,
} from '@/lib/recommendation-eval-metrics'

describe('computeRecommendationRankMetrics', () => {
  it('computes precision, recall, MRR, and nDCG@10 for a ranked list', () => {
    const holdout = new Set(['b', 'd'])
    const metrics = computeRecommendationRankMetrics(['a', 'b', 'c', 'd', 'e'], holdout, 10)

    expect(metrics.precision).toBe(0.2)
    expect(metrics.recall).toBe(1)
    expect(metrics.mrr).toBe(0.5)
    expect(metrics.ndcgAt10).toBeGreaterThan(0)
    expect(metrics.ndcgAt10).toBeLessThanOrEqual(1)
  })

  it('returns zero MRR and nDCG when no relevant items appear in top-K', () => {
    const holdout = new Set(['z'])
    const metrics = computeRecommendationRankMetrics(['a', 'b', 'c'], holdout, 10)

    expect(metrics.mrr).toBe(0)
    expect(metrics.ndcgAt10).toBe(0)
    expect(metrics.precision).toBe(0)
    expect(metrics.recall).toBe(0)
  })
})

describe('distributionStats', () => {
  it('returns min, median, max', () => {
    expect(distributionStats([0.1, 0.5, 0.9])).toEqual({
      min: 0.1,
      median: 0.5,
      max: 0.9,
    })
  })
})

describe('mean', () => {
  it('averages values', () => {
    expect(mean([0.2, 0.4])).toBeCloseTo(0.3)
  })
})
