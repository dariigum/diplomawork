import {
  normalizeBehaviourToken,
  splitVacancySkillPhrases,
  splitVacancyTitleWords,
} from '@/lib/behaviour-profile'

/**
 * Vacancy text fields used for deterministic concept extraction (no embeddings, no LLM).
 */
export type SemanticConceptVacancyInput = {
  title?: string
  skillsRequired?: string
  description?: string
}

export type SemanticConceptEntry = {
  concept: string
  weight: number
}

const DEFAULT_DESC_SLICE = 800
const DEFAULT_MAX_CONCEPTS = 48

/**
 * Normalize a single concept token/phrase for deduplication and display.
 * Delegates to behaviour-layer normalization so rules stay aligned.
 */
export function normalizeSemanticConcept(s: string): string {
  return normalizeBehaviourToken(s)
}

/**
 * Deterministic concept aggregation from vacancy text only.
 * Per vacancy: each concept keeps the maximum weight among sources (skills vs title vs description),
 * then weights are summed across vacancies. No inferred categories beyond what appears in text tokens/phrases.
 */
export function extractSemanticConceptsFromVacancies(
  vacancies: ReadonlyArray<SemanticConceptVacancyInput>,
  options?: { maxDescriptionChars?: number; maxConcepts?: number },
): SemanticConceptEntry[] {
  const maxDesc = Math.min(2000, Math.max(0, options?.maxDescriptionChars ?? DEFAULT_DESC_SLICE))
  const maxOut = Math.min(200, Math.max(1, options?.maxConcepts ?? DEFAULT_MAX_CONCEPTS))

  if (!Array.isArray(vacancies) || vacancies.length === 0) {
    return []
  }

  const globalWeights = new Map<string, number>()

  for (const v of vacancies) {
    if (!v || typeof v !== 'object') continue

    const title = String(v.title ?? '')
    const skills = String(v.skillsRequired ?? '')
    const desc = String(v.description ?? '').slice(0, maxDesc)

    const best = new Map<string, number>()

    const add = (raw: string, w: number) => {
      const k = normalizeSemanticConcept(raw)
      if (!k || k.length < 2 || k.length > 80) return
      if (!Number.isFinite(w) || w <= 0) return
      best.set(k, Math.max(best.get(k) ?? 0, w))
    }

    for (const p of splitVacancySkillPhrases(skills)) {
      add(p, 3)
    }
    for (const p of splitVacancySkillPhrases(title)) {
      add(p, 2)
    }
    for (const w of splitVacancyTitleWords(title)) {
      add(w, 2)
    }
    for (const p of splitVacancySkillPhrases(desc)) {
      add(p, 1)
    }
    for (const w of splitVacancyTitleWords(desc)) {
      add(w, 1)
    }

    for (const [k, w] of best) {
      globalWeights.set(k, (globalWeights.get(k) ?? 0) + w)
    }
  }

  return [...globalWeights.entries()]
    .map(([concept, weight]) => ({ concept, weight }))
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight
      return a.concept.localeCompare(b.concept)
    })
    .slice(0, maxOut)
}

/**
 * Honest, deterministic copy for UI or API headers around concept lists.
 */
export function buildSemanticConceptExplanation(params: {
  conceptCount: number
  topConcepts?: readonly string[]
}): string {
  const n = params.conceptCount
  if (!Number.isFinite(n) || n <= 0) {
    return 'No related semantic concepts were extracted from vacancy titles, skills lines, or descriptions for this result set.'
  }

  const base =
    'Related semantic concepts were detected from matched vacancy text (skills, titles, and truncated descriptions).'
  const honest =
    'Concepts reflect deterministic phrase and word splitting with normalization only — not generated summaries or autonomous expansion.'
  const top = (params.topConcepts ?? []).filter((s) => typeof s === 'string' && s.trim()).slice(0, 3)
  if (top.length === 0) {
    return `${base} ${honest}`
  }
  return `${base} Examples in this set: ${top.join(', ')}. ${honest}`
}
