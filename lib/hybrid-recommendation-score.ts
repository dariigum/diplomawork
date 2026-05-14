import { BEHAVIOUR_SCORE_CAP } from '@/lib/behaviour-score'

/** Semantic cosine (mapped [0,1]) stays primary in the blend. */
export const HYBRID_SEMANTIC_WEIGHT = 0.85 as const

/** Bounded behaviour layer from `computeVacancyBehaviourScore` (≤ BEHAVIOUR_SCORE_CAP). */
export const HYBRID_BEHAVIOUR_WEIGHT = 0.15 as const

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/**
 * Deterministic hybrid score for ranking. Does not read embeddings.
 * `behaviourScore` is expected in [0, BEHAVIOUR_SCORE_CAP] from behaviour scoring.
 */
export function computeHybridFinalScore(semanticScore: number, behaviourScore: number): number {
  const s = clamp01(semanticScore)
  const b = Math.max(0, Math.min(BEHAVIOUR_SCORE_CAP, behaviourScore))
  const raw = s * HYBRID_SEMANTIC_WEIGHT + b * HYBRID_BEHAVIOUR_WEIGHT
  return Math.max(0, Math.min(1, raw))
}
