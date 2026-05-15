import { normalizeStringArray } from '@/lib/normalize-string-array'

function sanitizeRecommendationItem(item: unknown): RecommendationApiItem | null {
  if (!item || typeof item !== 'object') return null
  const r = item as Record<string, unknown>
  if (typeof r.vacancyId !== 'string' || typeof r.title !== 'string' || typeof r.company !== 'string') {
    return null
  }
  return {
    ...(item as RecommendationApiItem),
    matchedSkills: normalizeStringArray(r.matchedSkills),
    behaviourExplanations: normalizeStringArray(r.behaviourExplanations),
  }
}

function sanitizeBehaviourSession(session: unknown): BehaviourSessionInsights | null {
  if (!session || typeof session !== 'object') return null
  const s = session as BehaviourSessionInsights
  return {
    ...s,
    dashboardLines: normalizeStringArray(s.dashboardLines),
  }
}

/**
 * Session-level behaviour copy for dashboard / headers (API + UI).
 * All strings are produced from tracked events + profile heuristics only.
 */
export type BehaviourActivitySummary = {
  viewed: number
  saved: number
  applied: number
}

export type BehaviourSessionInsights = {
  coldStart: boolean
  activitySummary: BehaviourActivitySummary
  dashboardLines: string[]
  productBadge: string | null
  neutralSemanticLine: string
}

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
  /** UX-only: whether this card shows activity-informed chrome. */
  cardAdaptationHint: 'semantic_only' | 'behaviour_adjusted'
  /** UX-only: one honest line from real behaviour match strings, or null. */
  behaviourCardTagline: string | null
}

/** Successful GET /api/recommendations JSON body (ranking unchanged; extra session insights for UI). */
export type RecommendationsApiSuccessBody = {
  recommendations: RecommendationApiItem[]
  behaviourSession: BehaviourSessionInsights
}

/** Error JSON for non-2xx GET /api/recommendations (not used for 200 + []). */
export type RecommendationsApiErrorBody = {
  error: string
  code: 'NO_EMBEDDING' | 'RANKING_SERVICE_ERROR'
}

/** Parse GET /api/recommendations JSON (supports legacy array-only responses). */
export function parseRecommendationsApiPayload(json: unknown): {
  recommendations: RecommendationApiItem[]
  behaviourSession: BehaviourSessionInsights | null
} {
  if (Array.isArray(json)) {
    return {
      recommendations: json
        .map(sanitizeRecommendationItem)
        .filter((r): r is RecommendationApiItem => r != null),
      behaviourSession: null,
    }
  }
  if (
    json &&
    typeof json === 'object' &&
    Array.isArray((json as RecommendationsApiSuccessBody).recommendations)
  ) {
    const body = json as RecommendationsApiSuccessBody
    return {
      recommendations: body.recommendations
        .map(sanitizeRecommendationItem)
        .filter((r): r is RecommendationApiItem => r != null),
      behaviourSession: sanitizeBehaviourSession(body.behaviourSession),
    }
  }
  return { recommendations: [], behaviourSession: null }
}
