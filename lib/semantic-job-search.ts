import { getEmbedding } from '@/lib/ml'
import { cosineSimilarity } from '@/lib/recommendation'
import {
  emptySemanticScoreBandCounts,
  incrementSemanticScoreBandCount,
  semanticScoreBand,
  type SemanticScoreBand,
  type SemanticScoreBandCounts,
} from '@/lib/semantic-score-bands'

export {
  SEMANTIC_SCORE_BAND_RELATED,
  SEMANTIC_SCORE_BAND_SOLID,
  SEMANTIC_SCORE_BAND_STRONG,
  semanticMatchStrengthLabel,
  semanticScoreBand,
  type SemanticScoreBand,
  type SemanticScoreBandCounts,
} from '@/lib/semantic-score-bands'

/**
 * Minimal vacancy shape for semantic ranking (e.g. Mongoose lean docs).
 * Embeddings must match the dimension returned by `getEmbedding` for the same ML service.
 */
export type SemanticVacancyInput = {
  _id: string | { toString(): string }
  title?: string
  embedding?: number[] | null | undefined
  employmentType?: string
  workMode?: 'REMOTE' | 'ONSITE' | string
  city?: string
  country?: string
  address?: string
  /** Populated employer `{ name?: string }` or raw id */
  employerId?: unknown
}

export type SemanticJobSearchRankedItem = {
  vacancyId: string
  semanticScore: number
  title: string
  company: string
  location: string
  employmentType: string
  workMode: 'REMOTE' | 'ONSITE'
  explanation: string
}

function vacancyIdString(id: SemanticVacancyInput['_id']): string {
  if (typeof id === 'string') return id
  return id.toString()
}

function companyNameFromEmployer(employerId: unknown): string {
  if (employerId && typeof employerId === 'object' && 'name' in employerId) {
    const n = (employerId as { name?: unknown }).name
    if (typeof n === 'string' && n.trim()) return n
  }
  return 'Unknown Company'
}

function normalizeWorkMode(raw: unknown): 'REMOTE' | 'ONSITE' {
  return raw === 'ONSITE' ? 'ONSITE' : 'REMOTE'
}

function formatLocation(v: SemanticVacancyInput): string {
  const mode = normalizeWorkMode(v.workMode)
  if (mode === 'REMOTE') return 'Remote'
  const parts = [v.city, v.country].map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  const addr = typeof v.address === 'string' ? v.address.trim() : ''
  return addr || 'Remote'
}

/**
 * Honest, deterministic copy for semantic-only search (embedding cosine, no behaviour layer).
 */
export function buildSemanticSearchExplanation(params: { semanticScore: number }): string {
  const s = params.semanticScore
  if (!Number.isFinite(s) || s <= 0) {
    return 'No usable semantic similarity for this vacancy (missing embedding vector, length mismatch, or zero cosine).'
  }

  const base =
    'Semantic overlap is scored with embedding-based retrieval: cosine similarity on vectors, mapped to 0–1 — not keyword matching alone.'

  if (s < 0.35) {
    return `${base} Match strength on that scale is low.`
  }
  if (s < 0.55) {
    return `${base} Match strength on that scale is moderate.`
  }
  if (s < 0.75) {
    return `${base} Match strength on that scale is relatively strong; related vacancy wording may align even when keywords differ.`
  }
  return `${base} Match strength on that scale is high; the vacancy embedding is close to the query embedding in vector space.`
}

function isValidEmbeddingForQuery(emb: unknown, queryDim: number): emb is number[] {
  if (!Array.isArray(emb) || emb.length === 0) return false
  if (queryDim <= 0 || emb.length !== queryDim) return false
  for (let i = 0; i < emb.length; i++) {
    const v = emb[i]
    if (typeof v !== 'number' || !Number.isFinite(v)) return false
  }
  return true
}

export type RankVacanciesBySemanticQueryParams = {
  query: string
  vacancies: ReadonlyArray<SemanticVacancyInput>
  /** If omitted or invalid, all ranked matches are returned (after filtering). */
  limit?: number
}

export type RankVacanciesBySemanticQueryFromEmbeddingParams = {
  queryEmbedding: number[]
  vacancies: ReadonlyArray<SemanticVacancyInput>
  /** If omitted or invalid, all ranked matches are returned (after filtering). */
  limit?: number
}

export type SemanticRetrievalStats = {
  checkedEmbeddings: number
  compatibleEmbeddings: number
  topSemanticScore: number | null
  bandCounts: SemanticScoreBandCounts
}

export type RankVacanciesBySemanticQueryFromEmbeddingResult = {
  results: SemanticJobSearchRankedItem[]
  stats: SemanticRetrievalStats
}

function emptySemanticRetrievalStats(): SemanticRetrievalStats {
  return {
    checkedEmbeddings: 0,
    compatibleEmbeddings: 0,
    topSemanticScore: null,
    bandCounts: emptySemanticScoreBandCounts(),
  }
}

function applyResultLimit(
  ranked: SemanticJobSearchRankedItem[],
  limit: number | undefined,
): SemanticJobSearchRankedItem[] {
  const lim = limit
  if (lim !== undefined && Number.isFinite(lim) && lim > 0) {
    return ranked.slice(0, Math.floor(lim))
  }
  return ranked
}

/**
 * Rank vacancies and collect retrieval diagnostics in one pass (same cosine rules as ranking-only path).
 */
export function rankVacanciesBySemanticQueryFromEmbeddingWithStats(
  params: RankVacanciesBySemanticQueryFromEmbeddingParams,
): RankVacanciesBySemanticQueryFromEmbeddingResult {
  const queryEmbedding = params.queryEmbedding
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return { results: [], stats: emptySemanticRetrievalStats() }
  }

  const queryDim = queryEmbedding.length
  for (let i = 0; i < queryDim; i++) {
    const v = queryEmbedding[i]
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return { results: [], stats: emptySemanticRetrievalStats() }
    }
  }

  const rows: SemanticJobSearchRankedItem[] = []
  const bandCounts = emptySemanticScoreBandCounts()
  let checkedEmbeddings = 0
  let compatibleEmbeddings = 0

  for (const v of params.vacancies) {
    checkedEmbeddings += 1
    const emb = v.embedding
    if (!isValidEmbeddingForQuery(emb, queryDim)) {
      continue
    }
    compatibleEmbeddings += 1

    const semanticScore = cosineSimilarity(queryEmbedding, emb)
    if (!Number.isFinite(semanticScore) || semanticScore <= 0) {
      continue
    }

    const band = semanticScoreBand(semanticScore)
    if (band) incrementSemanticScoreBandCount(bandCounts, band)

    const vacancyId = vacancyIdString(v._id)
    const title = typeof v.title === 'string' && v.title.trim() ? v.title.trim() : 'Untitled vacancy'
    const workMode = normalizeWorkMode(v.workMode)
    const employmentType =
      typeof v.employmentType === 'string' && v.employmentType.trim()
        ? v.employmentType.trim()
        : 'Full-time'

    rows.push({
      vacancyId,
      semanticScore,
      title,
      company: companyNameFromEmployer(v.employerId),
      location: formatLocation(v),
      employmentType,
      workMode,
      explanation: buildSemanticSearchExplanation({ semanticScore }),
    })
  }

  rows.sort((a, b) => {
    if (b.semanticScore !== a.semanticScore) {
      return b.semanticScore - a.semanticScore
    }
    return a.vacancyId.localeCompare(b.vacancyId)
  })

  const topSemanticScore = rows.length > 0 ? rows[0]!.semanticScore : null
  const stats: SemanticRetrievalStats = {
    checkedEmbeddings,
    compatibleEmbeddings,
    topSemanticScore,
    bandCounts,
  }

  return {
    results: applyResultLimit(rows, params.limit),
    stats,
  }
}

/**
 * Rank vacancies using a precomputed query embedding (same rules as {@link rankVacanciesBySemanticQuery}).
 * Synchronous: use when the query vector is already available (e.g. API layer handles ML errors separately).
 */
export function rankVacanciesBySemanticQueryFromEmbedding(
  params: RankVacanciesBySemanticQueryFromEmbeddingParams,
): SemanticJobSearchRankedItem[] {
  return rankVacanciesBySemanticQueryFromEmbeddingWithStats(params).results
}

/**
 * Rank vacancies by cosine similarity between the query embedding and each vacancy embedding.
 * Semantic-only: no behaviour, hybrid, or recommendation pipeline.
 *
 * Deterministic: same query + same vacancy list → same order (stable tie-break on `vacancyId`).
 */
export async function rankVacanciesBySemanticQuery(
  params: RankVacanciesBySemanticQueryParams,
): Promise<SemanticJobSearchRankedItem[]> {
  const raw = params.query ?? ''
  const query = raw.trim()
  if (!query) {
    return []
  }

  let queryEmbedding: number[]
  try {
    queryEmbedding = await getEmbedding(query)
  } catch {
    return []
  }

  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return []
  }

  return rankVacanciesBySemanticQueryFromEmbedding({
    queryEmbedding,
    vacancies: params.vacancies,
    limit: params.limit,
  })
}
