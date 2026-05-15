import type { SemanticJobSearchRankedItem, SemanticRetrievalStats } from '@/lib/semantic-job-search'

/** Concept row returned with semantic search (matches domain `SemanticConceptEntry` shape). */
export type SemanticSearchConceptItem = {
  concept: string
  weight: number
}

/** One row in GET /api/jobs/semantic-search success body — semantic-only fields. */
export type SemanticSearchApiResultItem = SemanticJobSearchRankedItem

/** Stable JSON body for 200 responses. */
export type SemanticSearchApiSuccessBody = {
  query: string
  semantic: true
  count: number
  results: SemanticSearchApiResultItem[]
  /** Deterministic retrieval diagnostics (embedding pass counts and score-band tallies). */
  stats: SemanticRetrievalStats
  /** Present when `count > 0`: aggregated from matched vacancy text only (server-side). */
  concepts?: SemanticSearchConceptItem[]
  conceptExplanation?: string
}

export type SemanticSearchApiErrorCode = 'EMPTY_QUERY' | 'SEMANTIC_SEARCH_UNAVAILABLE'

/** Error JSON for 4xx/5xx semantic search responses. */
export type SemanticSearchApiErrorBody = {
  error: string
  code: SemanticSearchApiErrorCode
}

export function isSemanticSearchApiSuccessBody(json: unknown): json is SemanticSearchApiSuccessBody {
  if (!json || typeof json !== 'object') return false
  const o = json as Record<string, unknown>
  if (typeof o.query !== 'string' || o.semantic !== true) return false
  if (typeof o.count !== 'number' || !Number.isFinite(o.count) || o.count < 0) return false
  if (!Array.isArray(o.results)) return false
  if (o.concepts !== undefined) {
    if (!Array.isArray(o.concepts)) return false
    for (const row of o.concepts) {
      if (!row || typeof row !== 'object') return false
      const r = row as Record<string, unknown>
      if (typeof r.concept !== 'string' || typeof r.weight !== 'number' || !Number.isFinite(r.weight)) return false
    }
  }
  if (o.conceptExplanation !== undefined && typeof o.conceptExplanation !== 'string') return false
  if (!isSemanticRetrievalStats(o.stats)) return false
  return true
}

function isSemanticScoreBandCounts(value: unknown): value is SemanticRetrievalStats['bandCounts'] {
  if (!value || typeof value !== 'object') return false
  const b = value as Record<string, unknown>
  for (const key of ['strong', 'solid', 'related', 'loose'] as const) {
    const n = b[key]
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return false
  }
  return true
}

export function isSemanticRetrievalStats(value: unknown): value is SemanticRetrievalStats {
  if (!value || typeof value !== 'object') return false
  const s = value as Record<string, unknown>
  const checked = s.checkedEmbeddings
  const compatible = s.compatibleEmbeddings
  if (typeof checked !== 'number' || !Number.isFinite(checked) || checked < 0 || !Number.isInteger(checked)) {
    return false
  }
  if (
    typeof compatible !== 'number' ||
    !Number.isFinite(compatible) ||
    compatible < 0 ||
    !Number.isInteger(compatible)
  ) {
    return false
  }
  const top = s.topSemanticScore
  if (top !== null && (typeof top !== 'number' || !Number.isFinite(top) || top <= 0)) return false
  if (!isSemanticScoreBandCounts(s.bandCounts)) return false
  return true
}
