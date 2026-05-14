/**
 * Public shape of GET /api/recommendations after enrichment for the UI.
 * `score` / `finalScore` = hybrid rank (semantic×0.85 + behaviour×0.15); `semanticScore` = cosine only.
 */
export type RecommendationApiItem = {
  vacancyId: string
  title: string
  company: string
  /** Hybrid final (primary sort). Same as `finalScore`. */
  score: number
  /** Cosine-only [0,1] — primary signal in hybrid formula. */
  semanticScore: number
  behaviourScore: number
  finalScore: number
  description: string
  matchedSkills: string[]
  /** Embedding cosine explanation (semantic-only bar). */
  semanticMatchNote: string
  /** Optional plain-text overlap hints from resume vs JD phrases; display-only. */
  textOverlapNote: string | null
  /** How hybrid score was composed; separate from embedding copy. */
  hybridRankingNote: string
  /** Behaviour layer detail lines (may be empty). */
  behaviourExplanations: string[]
}

/** Error JSON for non-2xx GET /api/recommendations (not used for 200 + []). */
export type RecommendationsApiErrorBody = {
  error: string
  code: 'NO_EMBEDDING' | 'RANKING_SERVICE_ERROR'
}
