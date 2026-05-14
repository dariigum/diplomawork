import { getEmbedding } from '@/lib/ml'
import { cosineSimilarity } from '@/lib/recommendation'

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
    return 'No usable embedding similarity for this vacancy (missing vector, length mismatch, or zero cosine).'
  }

  const base =
    'Semantic similarity is computed from embedding vectors (cosine similarity mapped to 0–1), not from keyword matching alone.'

  if (s < 0.35) {
    return `${base} Here the match strength is low on that scale.`
  }
  if (s < 0.55) {
    return `${base} Here the match strength is moderate on that scale.`
  }
  if (s < 0.75) {
    return `${base} Here the match strength is relatively strong on that scale; related wording may align even when keywords differ.`
  }
  return `${base} Here the match strength is high on that scale; the vacancy embedding is close to the query embedding in vector space.`
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

/**
 * Rank vacancies using a precomputed query embedding (same rules as {@link rankVacanciesBySemanticQuery}).
 * Synchronous: use when the query vector is already available (e.g. API layer handles ML errors separately).
 */
export function rankVacanciesBySemanticQueryFromEmbedding(
  params: RankVacanciesBySemanticQueryFromEmbeddingParams,
): SemanticJobSearchRankedItem[] {
  const queryEmbedding = params.queryEmbedding
  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    return []
  }

  const queryDim = queryEmbedding.length
  for (let i = 0; i < queryDim; i++) {
    const v = queryEmbedding[i]
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return []
    }
  }

  const rows: SemanticJobSearchRankedItem[] = []

  for (const v of params.vacancies) {
    const emb = v.embedding
    if (!isValidEmbeddingForQuery(emb, queryDim)) {
      continue
    }

    const semanticScore = cosineSimilarity(queryEmbedding, emb)
    if (!Number.isFinite(semanticScore) || semanticScore <= 0) {
      continue
    }

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

  const ranked = rows

  const lim = params.limit
  if (lim !== undefined && Number.isFinite(lim) && lim > 0) {
    return ranked.slice(0, Math.floor(lim))
  }

  return ranked
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
