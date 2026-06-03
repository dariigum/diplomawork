/**
 * Offline evaluation metrics — not used by production recommendation paths.
 */

export type RecommendationRankMetrics = {
  precision: number;
  recall: number;
  mrr: number;
  ndcgAt10: number;
};

export type MetricDistribution = {
  min: number;
  median: number;
  max: number;
};

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function distributionStats(values: number[]): MetricDistribution {
  if (values.length === 0) {
    return { min: 0, median: 0, max: 0 };
  }
  return {
    min: Math.min(...values),
    median: median(values),
    max: Math.max(...values),
  };
}

/**
 * Precision@K = |recommended ∩ relevant| / K
 * Recall@K = |recommended ∩ relevant| / |relevant|
 */
export function computeRecommendationRankMetrics(
  recommendedIds: string[],
  holdout: Set<string>,
  k = 10,
): RecommendationRankMetrics {
  const topK = recommendedIds.slice(0, k);
  const hits = topK.filter((id) => holdout.has(id)).length;

  const precision = k > 0 ? hits / k : 0;
  const recall = holdout.size > 0 ? hits / holdout.size : 0;

  let mrr = 0;
  for (let i = 0; i < topK.length; i += 1) {
    if (holdout.has(topK[i])) {
      mrr = 1 / (i + 1);
      break;
    }
  }

  const relevances = topK.map((id) => (holdout.has(id) ? 1 : 0));
  const dcg = relevances.reduce(
    (sum, rel, index) => sum + rel / Math.log2(index + 2),
    0,
  );

  const idealRelevantCount = Math.min(holdout.size, k);
  let idcg = 0;
  for (let i = 0; i < idealRelevantCount; i += 1) {
    idcg += 1 / Math.log2(i + 2);
  }

  const ndcgAt10 = idcg > 0 ? dcg / idcg : 0;

  return { precision, recall, mrr, ndcgAt10 };
}

export function roundMetric(value: number, digits = 6): number {
  return Number(value.toFixed(digits));
}
