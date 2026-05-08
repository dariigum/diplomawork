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
  explanation: string
}
