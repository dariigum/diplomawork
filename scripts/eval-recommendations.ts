/**

 * Offline recommendation evaluation from real MongoDB interaction data.

 * Compares keyword vs semantic-only vs production hybrid on the same users, holdout, and corpus.

 * Run: npm run eval:recommendations

 */

import "./bootstrap-demo-env";

import fs from "fs";

import path from "path";

import mongoose from "mongoose";

import dbConnect from "../lib/db/mongoose";

import { getActiveResumeLeanForUser } from "../lib/active-resume";

import { getTopRecommendations } from "../lib/recommendation";

import { rankEvalCandidates } from "../lib/recommendation-eval-ranking";

import { rankKeywordEvalCandidates } from "../lib/recommendation-eval-keyword";

import {
  computeRecommendationRankMetrics,
  distributionStats,
  mean,
  roundMetric,
  type RecommendationRankMetrics,
} from "../lib/recommendation-eval-metrics";

import {
  Response,
  SavedVacancy,
  User,
  VacancyBehaviourEvent,
  type VacancyBehaviourEventType,
} from "../lib/db/schema";

import type {
  RecommendationEvalAnalysis,
  RecommendationEvalResults,
  RecommendationEvalVariantMetrics,
} from "../lib/recommendation-eval-results";

const TOP_K = 10;

const HOLDOUT_FRACTION = 0.2;

const RESULTS_PATH = path.join(process.cwd(), "scripts", "eval-results.json");

const GROUND_TRUTH_EVENT_TYPES: VacancyBehaviourEventType[] = [
  "VACANCY_SAVED",
  "VACANCY_APPLIED",
];

type EvalVariantKey = "keyword" | "semanticOnly" | "hybrid";

const METHODOLOGY_OK = [
  "Offline evaluation on EMPLOYEE users with an active resume embedding and at least one holdout relevant vacancy.",

  "Ground-truth relevance: union of saved vacancies (SavedVacancy), job applications (Response), and behaviour events VACANCY_SAVED / VACANCY_APPLIED.",

  "Holdout: most recent 20% of relevant vacancies per user (minimum 1) excluded from behaviour profile when ranking hybrid; same holdout set for all variants.",

  "Corpus: all vacancies with embeddings; semantic cosine > 0 (identical candidate pool per user for keyword, semantic-only, and hybrid eval ranking).",

  "Variant keyword: skill-token Jaccard overlap between resume and vacancy structured/text fields; no embeddings.",

  "Variant semanticOnly: finalScore = semanticScore; behaviour ignored.",

  "Variant hybrid: production getTopRecommendations (semantic×0.85 + behaviour×0.15), top 10.",

  "Metrics per user at K=10: Precision@10 = |recommended∩holdout|/K; Recall@10 = |recommended∩holdout|/|holdout|; MRR = 1/rank of first relevant (0 if none); nDCG@10 = DCG/IDCG with binary relevance.",

  "Reported values: arithmetic mean across evaluated users per variant.",
].join(" ");

const METHODOLOGY_INSUFFICIENT = [
  "Evaluation could not be computed: no eligible EMPLOYEE users met all requirements",

  "(active resume embedding, ≥1 holdout relevant vacancy, recommendable vacancy corpus).",

  "Populate real interactions (save/apply) and embeddings, then re-run npm run eval:recommendations.",
].join(" ");

type RelevantItem = {
  vacancyId: string;

  occurredAt: Date;
};

type PerUserVariantMetrics = Record<EvalVariantKey, RecommendationRankMetrics>;

function dedupeRelevant(items: RelevantItem[]): RelevantItem[] {
  const byId = new Map<string, RelevantItem>();

  for (const item of items) {
    const prev = byId.get(item.vacancyId);

    if (!prev || item.occurredAt.getTime() > prev.occurredAt.getTime()) {
      byId.set(item.vacancyId, item);
    }
  }

  return [...byId.values()];
}

async function collectRelevantItems(userId: string): Promise<RelevantItem[]> {
  const uid = new mongoose.Types.ObjectId(userId);

  const items: RelevantItem[] = [];

  const saved = await SavedVacancy.find({ userId: uid })
    .select("vacancyId")
    .lean();

  for (const row of saved) {
    items.push({
      vacancyId: String(row.vacancyId),

      occurredAt: new Date(0),
    });
  }

  const responses = await Response.find({ userId: uid })
    .select("vacancyId createdAt")
    .lean();

  for (const row of responses) {
    items.push({
      vacancyId: String(row.vacancyId),

      occurredAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
    });
  }

  const events = await VacancyBehaviourEvent.find({
    userId: uid,

    eventType: { $in: GROUND_TRUTH_EVENT_TYPES },
  })

    .select("vacancyId occurredAt")

    .lean();

  for (const row of events) {
    items.push({
      vacancyId: String(row.vacancyId),

      occurredAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(),
    });
  }

  return dedupeRelevant(items);
}

function splitHoldout(all: RelevantItem[]): Set<string> {
  if (all.length === 0) return new Set();

  const sorted = [...all].sort((a, b) => {
    const dt = b.occurredAt.getTime() - a.occurredAt.getTime();

    if (dt !== 0) return dt;

    return a.vacancyId.localeCompare(b.vacancyId);
  });

  const holdoutCount = Math.max(1, Math.ceil(sorted.length * HOLDOUT_FRACTION));

  return new Set(sorted.slice(0, holdoutCount).map((item) => item.vacancyId));
}

async function userHasActiveResumeEmbedding(userId: string): Promise<boolean> {
  const resume = (await getActiveResumeLeanForUser(userId)) as {
    embedding?: number[];
  } | null;

  return Boolean(
    resume && Array.isArray(resume.embedding) && resume.embedding.length > 0,
  );
}

function writeResults(results: RecommendationEvalResults): void {
  fs.writeFileSync(
    RESULTS_PATH,
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
}

function buildVariantMetrics(
  values: RecommendationRankMetrics[],
): RecommendationEvalVariantMetrics {
  return {
    precisionAt10: roundMetric(mean(values.map((v) => v.precision))),

    recallAt10: roundMetric(mean(values.map((v) => v.recall))),

    mrr: roundMetric(mean(values.map((v) => v.mrr))),

    ndcgAt10: roundMetric(mean(values.map((v) => v.ndcgAt10))),
  };
}

function pickBestMethodByNdcg(perUser: PerUserVariantMetrics): EvalVariantKey {
  const entries: Array<[EvalVariantKey, number]> = [
    ["keyword", perUser.keyword.ndcgAt10],

    ["semanticOnly", perUser.semanticOnly.ndcgAt10],

    ["hybrid", perUser.hybrid.ndcgAt10],
  ];

  entries.sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];

    return a[0].localeCompare(b[0]);
  });

  return entries[0][0];
}

function buildAnalysis(
  perUserMetrics: PerUserVariantMetrics[],
): RecommendationEvalAnalysis {
  const keywordWins = { keyword: 0, semanticOnly: 0, hybrid: 0 };

  const keywordPrecision: number[] = [];

  const keywordRecall: number[] = [];

  const keywordMrr: number[] = [];

  const keywordNdcg: number[] = [];

  const semanticPrecision: number[] = [];

  const semanticRecall: number[] = [];

  const semanticMrr: number[] = [];

  const semanticNdcg: number[] = [];

  const hybridPrecision: number[] = [];

  const hybridRecall: number[] = [];

  const hybridMrr: number[] = [];

  const hybridNdcg: number[] = [];

  const semanticMinusKeywordPrecision: number[] = [];

  const semanticMinusKeywordRecall: number[] = [];

  const semanticMinusKeywordMrr: number[] = [];

  const semanticMinusKeywordNdcg: number[] = [];

  const hybridMinusSemanticPrecision: number[] = [];

  const hybridMinusSemanticRecall: number[] = [];

  const hybridMinusSemanticMrr: number[] = [];

  const hybridMinusSemanticNdcg: number[] = [];

  for (const row of perUserMetrics) {
    const best = pickBestMethodByNdcg(row);

    keywordWins[best] += 1;

    keywordPrecision.push(row.keyword.precision);

    keywordRecall.push(row.keyword.recall);

    keywordMrr.push(row.keyword.mrr);

    keywordNdcg.push(row.keyword.ndcgAt10);

    semanticPrecision.push(row.semanticOnly.precision);

    semanticRecall.push(row.semanticOnly.recall);

    semanticMrr.push(row.semanticOnly.mrr);

    semanticNdcg.push(row.semanticOnly.ndcgAt10);

    hybridPrecision.push(row.hybrid.precision);

    hybridRecall.push(row.hybrid.recall);

    hybridMrr.push(row.hybrid.mrr);

    hybridNdcg.push(row.hybrid.ndcgAt10);

    semanticMinusKeywordPrecision.push(
      row.semanticOnly.precision - row.keyword.precision,
    );

    semanticMinusKeywordRecall.push(
      row.semanticOnly.recall - row.keyword.recall,
    );

    semanticMinusKeywordMrr.push(row.semanticOnly.mrr - row.keyword.mrr);

    semanticMinusKeywordNdcg.push(
      row.semanticOnly.ndcgAt10 - row.keyword.ndcgAt10,
    );

    hybridMinusSemanticPrecision.push(
      row.hybrid.precision - row.semanticOnly.precision,
    );

    hybridMinusSemanticRecall.push(row.hybrid.recall - row.semanticOnly.recall);

    hybridMinusSemanticMrr.push(row.hybrid.mrr - row.semanticOnly.mrr);

    hybridMinusSemanticNdcg.push(
      row.hybrid.ndcgAt10 - row.semanticOnly.ndcgAt10,
    );
  }

  return {
    bestMethodByNdcg: keywordWins,

    metricDistributions: {
      keyword: {
        precisionAt10: distributionStats(keywordPrecision),

        recallAt10: distributionStats(keywordRecall),

        mrr: distributionStats(keywordMrr),

        ndcgAt10: distributionStats(keywordNdcg),
      },

      semanticOnly: {
        precisionAt10: distributionStats(semanticPrecision),

        recallAt10: distributionStats(semanticRecall),

        mrr: distributionStats(semanticMrr),

        ndcgAt10: distributionStats(semanticNdcg),
      },

      hybrid: {
        precisionAt10: distributionStats(hybridPrecision),

        recallAt10: distributionStats(hybridRecall),

        mrr: distributionStats(hybridMrr),

        ndcgAt10: distributionStats(hybridNdcg),
      },
    },

    pairedMeanDeltas: {
      semanticOnlyMinusKeyword: {
        precisionAt10: roundMetric(mean(semanticMinusKeywordPrecision)),

        recallAt10: roundMetric(mean(semanticMinusKeywordRecall)),

        mrr: roundMetric(mean(semanticMinusKeywordMrr)),

        ndcgAt10: roundMetric(mean(semanticMinusKeywordNdcg)),
      },

      hybridMinusSemanticOnly: {
        precisionAt10: roundMetric(mean(hybridMinusSemanticPrecision)),

        recallAt10: roundMetric(mean(hybridMinusSemanticRecall)),

        mrr: roundMetric(mean(hybridMinusSemanticMrr)),

        ndcgAt10: roundMetric(mean(hybridMinusSemanticNdcg)),
      },
    },
  };
}

function printComparisonTable(
  variants: NonNullable<RecommendationEvalResults["variants"]>,
): void {
  const header =
    "| Method        | Precision@10 | Recall@10 | MRR    | nDCG@10 |";

  const sep = "| ------------- | ------------ | --------- | ------ | ------- |";

  const row = (method: string, m: RecommendationEvalVariantMetrics) =>
    `| ${method.padEnd(13)} | ${String(m.precisionAt10 ?? "—").padEnd(12)} | ${String(m.recallAt10 ?? "—").padEnd(9)} | ${String(m.mrr ?? "—").padEnd(6)} | ${String(m.ndcgAt10 ?? "—").padEnd(7)} |`;

  console.log("");

  console.log(header);

  console.log(sep);

  console.log(row("Keyword", variants.keyword));

  console.log(row("Semantic Only", variants.semanticOnly));

  console.log(row("Hybrid", variants.hybrid));

  console.log("");
}

function printDistributionTable(
  label: string,

  dist: RecommendationEvalAnalysis["metricDistributions"]["keyword"],
): void {
  console.log(
    `[eval:recommendations] ${label} distribution (per-user min / median / max):`,
  );

  for (const metric of [
    "precisionAt10",
    "recallAt10",
    "mrr",
    "ndcgAt10",
  ] as const) {
    const d = dist[metric];

    console.log(
      `  ${metric}: ${d.min.toFixed(6)} / ${d.median.toFixed(6)} / ${d.max.toFixed(6)}`,
    );
  }
}

async function main(): Promise<void> {
  await dbConnect();

  const employees = await User.find({ role: "EMPLOYEE" }).select("_id").lean();

  const perUserMetrics: PerUserVariantMetrics[] = [];

  let skippedNoResume = 0;

  let skippedNoRelevant = 0;

  let skippedNoHoldout = 0;

  for (const user of employees) {
    const userId = String(user._id);

    if (!(await userHasActiveResumeEmbedding(userId))) {
      skippedNoResume += 1;

      continue;
    }

    const relevant = await collectRelevantItems(userId);

    if (relevant.length === 0) {
      skippedNoRelevant += 1;

      continue;
    }

    const holdout = splitHoldout(relevant);

    if (holdout.size === 0) {
      skippedNoHoldout += 1;

      continue;
    }

    const holdoutExclude = [...holdout];

    const keywordRanked = await rankKeywordEvalCandidates({
      userId,
      limit: TOP_K,
    });

    const keywordMetrics = computeRecommendationRankMetrics(
      keywordRanked.map((r) => r.vacancyId),

      holdout,

      TOP_K,
    );

    const semanticRanked = await rankEvalCandidates({
      userId,

      variant: "semanticOnly",

      limit: TOP_K,
    });

    const semanticMetrics = computeRecommendationRankMetrics(
      semanticRanked.map((r) => r.vacancyId),

      holdout,

      TOP_K,
    );

    const hybridRecs = await getTopRecommendations({
      userId,

      limit: TOP_K,

      excludeVacancyIdsFromBehaviour: holdoutExclude,
    });

    const hybridMetrics = computeRecommendationRankMetrics(
      hybridRecs.map((r) => r.vacancyId),

      holdout,

      TOP_K,
    );

    perUserMetrics.push({
      keyword: keywordMetrics,

      semanticOnly: semanticMetrics,

      hybrid: hybridMetrics,
    });
  }

  const evaluatedUsers = perUserMetrics.length;

  const generatedAt = new Date().toISOString();

  if (evaluatedUsers === 0) {
    if (fs.existsSync(RESULTS_PATH)) {
      console.log(
        "[eval:recommendations] Insufficient data — no users evaluated; existing eval-results.json left unchanged.",
      );
    } else {
      const insufficient: RecommendationEvalResults = {
        precisionAt10: null,
        recallAt10: null,
        evaluatedUsers: 0,
        generatedAt,
        methodology: METHODOLOGY_INSUFFICIENT,
      };
      writeResults(insufficient);
      console.log(
        "[eval:recommendations] Insufficient data — no users evaluated.",
      );
    }
    console.log(
      `[eval:recommendations] Skipped: no resume embedding=${skippedNoResume}, no relevant=${skippedNoRelevant}, no holdout=${skippedNoHoldout}`,
    );
    return;
  }

  const keyword = buildVariantMetrics(perUserMetrics.map((u) => u.keyword));

  const semanticOnly = buildVariantMetrics(
    perUserMetrics.map((u) => u.semanticOnly),
  );

  const hybrid = buildVariantMetrics(perUserMetrics.map((u) => u.hybrid));

  const analysis = buildAnalysis(perUserMetrics);

  const results: RecommendationEvalResults = {
    precisionAt10: hybrid.precisionAt10,

    recallAt10: hybrid.recallAt10,

    evaluatedUsers,

    generatedAt,

    methodology: METHODOLOGY_OK,

    variants: {
      keyword,

      semanticOnly,

      hybrid,
    },

    analysis,
  };

  writeResults(results);

  console.log(
    "[eval:recommendations] Evaluation complete (keyword vs semantic-only vs hybrid).",
  );

  console.log(JSON.stringify(results, null, 2));

  printComparisonTable(results.variants!);

  console.log(
    `[eval:recommendations] Best method by per-user nDCG@10: keyword=${analysis.bestMethodByNdcg.keyword}, semanticOnly=${analysis.bestMethodByNdcg.semanticOnly}, hybrid=${analysis.bestMethodByNdcg.hybrid}`,
  );

  printDistributionTable("Keyword", analysis.metricDistributions.keyword);

  printDistributionTable(
    "Semantic Only",
    analysis.metricDistributions.semanticOnly,
  );

  printDistributionTable("Hybrid", analysis.metricDistributions.hybrid);

  console.log(
    "[eval:recommendations] Paired mean deltas (semanticOnly − keyword):",

    analysis.pairedMeanDeltas.semanticOnlyMinusKeyword,
  );

  console.log(
    "[eval:recommendations] Paired mean deltas (hybrid − semanticOnly):",

    analysis.pairedMeanDeltas.hybridMinusSemanticOnly,
  );

  console.log(
    `[eval:recommendations] Skipped: no resume embedding=${skippedNoResume}, no relevant=${skippedNoRelevant}, no holdout=${skippedNoHoldout}`,
  );
}

main()
  .catch((error) => {
    console.error("[eval:recommendations] Fatal:", error);

    process.exitCode = 1;
  })

  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
