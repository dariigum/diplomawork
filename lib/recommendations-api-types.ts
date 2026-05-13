/**
 * Public shape of GET /api/recommendations after enrichment for the UI.
 * Core `score` comes from the semantic engine (cosine); extra fields are for display only.
 */
export type RecommendationApiItem = {
  vacancyId: string
  title: string
  company: string
  /** Cosine-derived match in [0, 1] from lib/recommendation */
  score: number
  description: string
  matchedSkills: string[]
  /** Cosine / embedding ranking only — not keyword overlap. */
  semanticMatchNote: string
  /** Optional plain-text overlap hints from resume vs JD phrases; does not affect `score`. */
  textOverlapNote: string | null
}

/** Error JSON for non-2xx GET /api/recommendations (not used for 200 + []). */
export type RecommendationsApiErrorBody = {
  error: string
  code: 'NO_EMBEDDING' | 'RANKING_SERVICE_ERROR'
}
