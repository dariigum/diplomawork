import type {
  SemanticJobSearchRankedItem,
  SemanticRetrievalStats,
  WeakSemanticRecoveryReason,
} from '@/lib/semantic-job-search'
import type {
  KeywordFallbackRankedItem,
  SemanticKeywordFallbackReason,
} from '@/lib/semantic-keyword-fallback'

/** Concept row returned with semantic search (matches domain `SemanticConceptEntry` shape). */
export type SemanticSearchConceptItem = {
  concept: string
  weight: number
}

/** One row in GET /api/jobs/semantic-search success body — semantic-only fields. */
export type SemanticSearchApiResultItem = SemanticJobSearchRankedItem

export type SemanticSearchApiFallbackItem = KeywordFallbackRankedItem

/** Text-based recovery layer — separate from embedding semantic results. */
export type SemanticSearchApiFallback = {
  enabled: boolean
  reason: SemanticKeywordFallbackReason | ''
  results: SemanticSearchApiFallbackItem[]
}

export type SemanticSearchApiWeakSemanticItem = SemanticJobSearchRankedItem

/** Weak semantic recovery (loose band) — never merged into `results`. */
export type SemanticSearchApiWeakSemantic = {
  enabled: boolean
  reason: WeakSemanticRecoveryReason | ''
  results: SemanticSearchApiWeakSemanticItem[]
}

/** Stable JSON body for 200 responses. */
export type SemanticSearchApiSuccessBody = {
  query: string
  semantic: true
  count: number
  results: SemanticSearchApiResultItem[]
  /** Deterministic retrieval diagnostics (embedding pass counts and score-band tallies). */
  stats: SemanticRetrievalStats
  /** Optional loose-band semantic recovery (never merged into `results`). */
  weakSemantic?: SemanticSearchApiWeakSemantic
  /** Optional transparent keyword/text fallback (never merged into `results`). */
  fallback?: SemanticSearchApiFallback
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
  if (o.fallback !== undefined && !isSemanticSearchApiFallback(o.fallback)) return false
  if (o.weakSemantic !== undefined && !isSemanticSearchApiWeakSemantic(o.weakSemantic)) return false
  return true
}

function isSemanticSearchApiWeakSemanticItem(value: unknown): value is SemanticSearchApiWeakSemanticItem {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  if (typeof r.vacancyId !== 'string' || typeof r.semanticScore !== 'number' || !Number.isFinite(r.semanticScore)) {
    return false
  }
  if (r.semanticScore <= 0 || r.semanticScore >= 0.35) return false
  if (typeof r.title !== 'string' || typeof r.company !== 'string') return false
  if (typeof r.location !== 'string' || typeof r.employmentType !== 'string') return false
  if (r.workMode !== 'REMOTE' && r.workMode !== 'ONSITE') return false
  if (typeof r.explanation !== 'string' || r.explanation.length === 0) return false
  if ('textScore' in r) return false
  return true
}

export function isSemanticSearchApiWeakSemantic(value: unknown): value is SemanticSearchApiWeakSemantic {
  if (!value || typeof value !== 'object') return false
  const w = value as Record<string, unknown>
  if (typeof w.enabled !== 'boolean') return false
  if (typeof w.reason !== 'string') return false
  if (!Array.isArray(w.results)) return false
  for (const row of w.results) {
    if (!isSemanticSearchApiWeakSemanticItem(row)) return false
  }
  if (w.enabled && w.reason === '') return false
  return true
}

function isSemanticSearchApiFallbackItem(value: unknown): value is SemanticSearchApiFallbackItem {
  if (!value || typeof value !== 'object') return false
  const r = value as Record<string, unknown>
  if (typeof r.vacancyId !== 'string' || typeof r.textScore !== 'number' || !Number.isFinite(r.textScore)) {
    return false
  }
  if (r.textScore <= 0) return false
  if (typeof r.title !== 'string' || typeof r.company !== 'string') return false
  if (typeof r.location !== 'string' || typeof r.employmentType !== 'string') return false
  if (r.workMode !== 'REMOTE' && r.workMode !== 'ONSITE') return false
  if (typeof r.explanation !== 'string' || r.explanation.length === 0) return false
  if ('semanticScore' in r) return false
  return true
}

export function isSemanticSearchApiFallback(value: unknown): value is SemanticSearchApiFallback {
  if (!value || typeof value !== 'object') return false
  const f = value as Record<string, unknown>
  if (typeof f.enabled !== 'boolean') return false
  if (typeof f.reason !== 'string') return false
  if (!Array.isArray(f.results)) return false
  for (const row of f.results) {
    if (!isSemanticSearchApiFallbackItem(row)) return false
  }
  if (f.enabled && f.reason === '') return false
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
