import {
  normalizeBehaviourToken,
  splitVacancySkillPhrases,
  splitVacancyTitleWords,
} from '@/lib/behaviour-profile'
import { formatEmployerName } from '@/lib/format-employer-name'
import { SEMANTIC_SCORE_BAND_RELATED } from '@/lib/semantic-score-bands'

/** Vacancy fields used for deterministic text overlap (no embeddings). */
export type KeywordFallbackVacancyInput = {
  _id: string | { toString(): string }
  title?: string
  skillsRequired?: string
  description?: string
  employmentType?: string
  workMode?: 'REMOTE' | 'ONSITE' | string
  city?: string
  country?: string
  address?: string
  employerId?: unknown
}

export type KeywordFallbackRankedItem = {
  vacancyId: string
  textScore: number
  title: string
  company: string
  location: string
  employmentType: string
  workMode: 'REMOTE' | 'ONSITE'
  explanation: string
}

export type SemanticKeywordFallbackReason =
  | 'No strong semantic matches'
  | 'Low semantic overlap'
  | 'Sparse embedding overlap'

const TITLE_WEIGHT = 3
const SKILLS_WEIGHT = 3
const DESCRIPTION_WEIGHT = 1
const DEFAULT_DESC_SLICE = 800

function vacancyIdString(id: KeywordFallbackVacancyInput['_id']): string {
  if (typeof id === 'string') return id
  return id.toString()
}

function normalizeWorkMode(raw: unknown): 'REMOTE' | 'ONSITE' {
  return raw === 'ONSITE' ? 'ONSITE' : 'REMOTE'
}

function formatLocation(v: KeywordFallbackVacancyInput): string {
  const mode = normalizeWorkMode(v.workMode)
  if (mode === 'REMOTE') return 'Remote'
  const parts = [v.city, v.country].map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
  if (parts.length > 0) return parts.join(', ')
  const addr = typeof v.address === 'string' ? v.address.trim() : ''
  return addr || 'Remote'
}

/** Query terms for overlap (normalized tokens and skill phrases). */
export function tokenizeKeywordFallbackQuery(query: string): Set<string> {
  const terms = new Set<string>()
  const q = query.trim()
  if (!q) return terms
  for (const w of splitVacancyTitleWords(q)) {
    const n = normalizeBehaviourToken(w)
    if (n) terms.add(n)
  }
  for (const p of splitVacancySkillPhrases(q)) {
    const n = normalizeBehaviourToken(p)
    if (n) terms.add(n)
  }
  return terms
}

function collectFieldTerms(title: string, skills: unknown, description: string): {
  titleTerms: Set<string>
  skillTerms: Set<string>
  descTerms: Set<string>
} {
  const titleTerms = new Set<string>()
  const skillTerms = new Set<string>()
  const descTerms = new Set<string>()

  for (const w of splitVacancyTitleWords(title)) {
    const n = normalizeBehaviourToken(w)
    if (n) titleTerms.add(n)
  }
  for (const p of splitVacancySkillPhrases(title)) {
    const n = normalizeBehaviourToken(p)
    if (n) titleTerms.add(n)
  }
  for (const p of splitVacancySkillPhrases(skills)) {
    const n = normalizeBehaviourToken(p)
    if (n) skillTerms.add(n)
  }
  const descSlice = description.slice(0, DEFAULT_DESC_SLICE)
  for (const w of splitVacancyTitleWords(descSlice)) {
    const n = normalizeBehaviourToken(w)
    if (n) descTerms.add(n)
  }
  for (const p of splitVacancySkillPhrases(descSlice)) {
    const n = normalizeBehaviourToken(p)
    if (n) descTerms.add(n)
  }

  return { titleTerms, skillTerms, descTerms }
}

function countSetOverlap(a: Set<string>, b: Set<string>): number {
  let n = 0
  for (const t of a) {
    if (b.has(t)) n += 1
  }
  return n
}

export function buildKeywordFallbackExplanation(params: {
  titleHits: number
  skillHits: number
  descHits: number
}): string {
  const parts: string[] = []
  if (params.titleHits > 0) {
    parts.push(
      params.titleHits === 1 ? 'matching title keyword' : `matching title keywords (${params.titleHits})`,
    )
  }
  if (params.skillHits > 0) {
    parts.push(
      params.skillHits === 1 ? 'overlapping skill phrase' : `overlapping skills (${params.skillHits})`,
    )
  }
  if (params.descHits > 0) {
    parts.push(
      params.descHits === 1 ? 'shared description phrase' : `shared description text (${params.descHits})`,
    )
  }
  if (parts.length === 0) {
    return 'Text overlap on listing fields — not embedding-based semantic retrieval.'
  }
  return `Text overlap: ${parts.join('; ')}. Not embedding-based semantic retrieval.`
}

export type RankVacanciesByKeywordFallbackParams = {
  query: string
  vacancies: ReadonlyArray<KeywordFallbackVacancyInput>
  /** Vacancy ids already returned by semantic retrieval (excluded from fallback). */
  excludeVacancyIds?: ReadonlySet<string>
  limit?: number
}

/**
 * Deterministic keyword/text overlap ranking (title, skills, description).
 * Separate from semantic cosine scores — no ML, no probabilities.
 */
export function rankVacanciesByKeywordFallback(
  params: RankVacanciesByKeywordFallbackParams,
): KeywordFallbackRankedItem[] {
  const queryTerms = tokenizeKeywordFallbackQuery(params.query)
  if (queryTerms.size === 0) return []

  const exclude = params.excludeVacancyIds ?? new Set<string>()
  const rows: KeywordFallbackRankedItem[] = []

  for (const v of params.vacancies) {
    const vacancyId = vacancyIdString(v._id)
    if (exclude.has(vacancyId)) continue

    const title = typeof v.title === 'string' ? v.title.trim() : ''
    const skillsInput = v.skillsRequired
    const description = typeof v.description === 'string' ? v.description.trim() : ''
    const hasSkills =
      (typeof skillsInput === 'string' && skillsInput.trim().length > 0) ||
      (Array.isArray(skillsInput) && skillsInput.length > 0)
    if (!title && !hasSkills && !description) continue

    const { titleTerms, skillTerms, descTerms } = collectFieldTerms(title, skillsInput, description)
    const titleHits = countSetOverlap(queryTerms, titleTerms)
    const skillHits = countSetOverlap(queryTerms, skillTerms)
    const descHits = countSetOverlap(queryTerms, descTerms)
    const textScore = titleHits * TITLE_WEIGHT + skillHits * SKILLS_WEIGHT + descHits * DESCRIPTION_WEIGHT
    if (textScore <= 0) continue

    const workMode = normalizeWorkMode(v.workMode)
    const employmentType =
      typeof v.employmentType === 'string' && v.employmentType.trim()
        ? v.employmentType.trim()
        : 'Full-time'

    rows.push({
      vacancyId,
      textScore,
      title: title || 'Untitled vacancy',
      company: formatEmployerName(v.employerId),
      location: formatLocation(v),
      employmentType,
      workMode,
      explanation: buildKeywordFallbackExplanation({ titleHits, skillHits, descHits }),
    })
  }

  rows.sort((a, b) => {
    if (b.textScore !== a.textScore) return b.textScore - a.textScore
    return a.vacancyId.localeCompare(b.vacancyId)
  })

  const lim = params.limit
  if (lim !== undefined && Number.isFinite(lim) && lim > 0) {
    return rows.slice(0, Math.floor(lim))
  }
  return rows
}

export type ShouldEnableKeywordFallbackParams = {
  semanticCount: number
  topSemanticScore: number | null
  compatibleEmbeddings: number
  checkedEmbeddings: number
}

export type KeywordFallbackActivation = {
  enabled: boolean
  reason: SemanticKeywordFallbackReason | null
}

/**
 * Fallback runs when semantic results are empty or top semantic score is below the related band (0.35).
 */
export function resolveKeywordFallbackActivation(
  params: ShouldEnableKeywordFallbackParams,
): KeywordFallbackActivation {
  if (params.semanticCount === 0) {
    if (
      params.checkedEmbeddings > 0 &&
      params.compatibleEmbeddings === 0
    ) {
      return { enabled: true, reason: 'Sparse embedding overlap' }
    }
    return { enabled: true, reason: 'No strong semantic matches' }
  }

  const top = params.topSemanticScore
  if (top === null || top < SEMANTIC_SCORE_BAND_RELATED) {
    return { enabled: true, reason: 'Low semantic overlap' }
  }

  return { enabled: false, reason: null }
}
