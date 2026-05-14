import type { SemanticJobSearchRankedItem } from '@/lib/semantic-job-search'

/** One row in GET /api/jobs/semantic-search success body — semantic-only fields. */
export type SemanticSearchApiResultItem = SemanticJobSearchRankedItem

/** Stable JSON body for 200 responses. */
export type SemanticSearchApiSuccessBody = {
  query: string
  semantic: true
  count: number
  results: SemanticSearchApiResultItem[]
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
  return true
}
