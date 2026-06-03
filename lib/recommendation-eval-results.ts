import fs from "fs";

import path from "path";

export type RecommendationEvalVariantMetrics = {
  precisionAt10: number | null;

  recallAt10: number | null;

  mrr: number | null;

  ndcgAt10: number | null;
};

export type RecommendationEvalMetricDistribution = {
  min: number;

  median: number;

  max: number;
};

export type RecommendationEvalAnalysis = {
  bestMethodByNdcg: {
    keyword: number;

    semanticOnly: number;

    hybrid: number;
  };

  metricDistributions: {
    keyword: Record<
      "precisionAt10" | "recallAt10" | "mrr" | "ndcgAt10",
      RecommendationEvalMetricDistribution
    >;

    semanticOnly: Record<
      "precisionAt10" | "recallAt10" | "mrr" | "ndcgAt10",
      RecommendationEvalMetricDistribution
    >;

    hybrid: Record<
      "precisionAt10" | "recallAt10" | "mrr" | "ndcgAt10",
      RecommendationEvalMetricDistribution
    >;
  };

  pairedMeanDeltas: {
    semanticOnlyMinusKeyword: Record<
      "precisionAt10" | "recallAt10" | "mrr" | "ndcgAt10",
      number
    >;

    hybridMinusSemanticOnly: Record<
      "precisionAt10" | "recallAt10" | "mrr" | "ndcgAt10",
      number
    >;
  };
};

export type RecommendationEvalResults = {
  /** Legacy top-level metrics = hybrid variant (admin UI compatibility). */

  precisionAt10: number | null;

  recallAt10: number | null;

  evaluatedUsers: number;

  generatedAt: string;

  methodology: string;

  variants?: {
    keyword: RecommendationEvalVariantMetrics;

    semanticOnly: RecommendationEvalVariantMetrics;

    hybrid: RecommendationEvalVariantMetrics;
  };

  analysis?: RecommendationEvalAnalysis;
};

const RESULTS_FILE = path.join(process.cwd(), "scripts", "eval-results.json");

export function getRecommendationEvalResultsPath(): string {
  return RESULTS_FILE;
}

export function loadRecommendationEvalResults(): RecommendationEvalResults | null {
  try {
    if (!fs.existsSync(RESULTS_FILE)) {
      return null;
    }

    const raw = fs.readFileSync(RESULTS_FILE, "utf8");

    const parsed = JSON.parse(raw) as RecommendationEvalResults;

    if (
      typeof parsed.evaluatedUsers !== "number" ||
      typeof parsed.methodology !== "string"
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function variantMetricsValid(
  m: RecommendationEvalVariantMetrics | undefined,
): boolean {
  if (!m) return false;

  const nums = [m.precisionAt10, m.recallAt10, m.mrr, m.ndcgAt10];

  return nums.every((v) => typeof v === "number" && Number.isFinite(v));
}

export function hasComputedEvalMetrics(
  results: RecommendationEvalResults | null,
): boolean {
  if (!results) return false;

  if (results.evaluatedUsers <= 0) return false;

  if (results.variants) {
    return variantMetricsValid(results.variants.hybrid);
  }

  return (
    typeof results.precisionAt10 === "number" &&
    Number.isFinite(results.precisionAt10) &&
    typeof results.recallAt10 === "number" &&
    Number.isFinite(results.recallAt10)
  );
}
