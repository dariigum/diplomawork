import type { UserBehaviourProfile } from '@/lib/behaviour-profile'
import {
  buildVacancyHaystack,
  inferVacancyCategoryIds,
  normalizeBehaviourToken,
  splitVacancySkillPhrases,
} from '@/lib/behaviour-profile'

/** Upper bound for behaviour signal; hybrid stages can blend e.g. semantic * 0.85 + behaviour * 0.15. */
export const BEHAVIOUR_SCORE_CAP = 0.15 as const

const SKILL_UNIT = 0.042
const SKILL_BLOCK_CAP = 0.084

const KEYWORD_UNIT = 0.01
const KEYWORD_BLOCK_CAP = 0.042

const CATEGORY_UNIT = 0.036
const CATEGORY_BLOCK_CAP = 0.054

const CATEGORY_DISPLAY: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  ai_ml: 'AI/ML',
  mobile: 'Mobile',
  devops: 'DevOps',
  data: 'Data',
}

export type VacancyBehaviourScoreInput = {
  title: string
  skillsRequired: string
  description: string
}

export type BehaviourProfileForScore = Pick<
  UserBehaviourProfile,
  'preferredSkills' | 'preferredKeywords' | 'preferredCategories'
>

export type VacancyBehaviourScoreResult = {
  /** Bounded [0, BEHAVIOUR_SCORE_CAP]; does not include semantic score. */
  score: number
  matchedSkills: string[]
  matchedKeywords: string[]
  matchedCategories: string[]
  explanations: string[]
  /** Raw sum before cap (for debugging / dashboards). */
  rawScoreBeforeCap: number
}

function categoryLabel(id: string): string {
  return CATEGORY_DISPLAY[id] ?? id
}

function phraseMatchesVacancySkill(vacPhrase: string, pref: string): boolean {
  const v = normalizeBehaviourToken(vacPhrase)
  const p = normalizeBehaviourToken(pref)
  if (!p || !v) return false
  if (v === p) return true
  if (p.length >= 3 && (v.includes(p) || p.includes(v))) return true
  return false
}

function collectMatchedSkills(
  preferred: string[],
  vacSkillPhrases: string[],
  haystack: string,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const pref of preferred) {
    const p = normalizeBehaviourToken(pref)
    if (p.length < 2) continue
    const inList = vacSkillPhrases.some((vs) => phraseMatchesVacancySkill(vs, p))
    const inHay = p.length >= 3 && haystack.includes(p)
    if (inList || inHay) {
      const key = p
      if (!seen.has(key)) {
        seen.add(key)
        out.push(pref.trim())
      }
    }
  }
  return out
}

function collectMatchedKeywords(preferred: string[], haystack: string, skipLower: Set<string>): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const kw of preferred) {
    const k = normalizeBehaviourToken(kw)
    if (k.length < 3) continue
    if (skipLower.has(k)) continue
    if (!haystack.includes(k)) continue
    if (!seen.has(k)) {
      seen.add(k)
      out.push(kw.trim())
    }
  }
  return out
}

function collectMatchedCategories(preferred: string[], vacancyCategoryIds: string[]): string[] {
  const vac = new Set(vacancyCategoryIds)
  const out: string[] = []
  const seen = new Set<string>()
  for (const c of preferred) {
    const id = c.trim().toLowerCase()
    if (!id || !vac.has(id)) continue
    if (!seen.has(id)) {
      seen.add(id)
      out.push(id)
    }
  }
  return out
}

/**
 * Deterministic behaviour-only score for one vacancy vs a behaviour profile.
 * No embeddings; does not call the semantic recommendation engine.
 */
export function computeVacancyBehaviourScore(
  profile: BehaviourProfileForScore,
  vacancy: VacancyBehaviourScoreInput,
): VacancyBehaviourScoreResult {
  const explanations: string[] = []

  const hasPrefs =
    profile.preferredSkills.length > 0 ||
    profile.preferredKeywords.length > 0 ||
    profile.preferredCategories.length > 0

  if (!hasPrefs) {
    return {
      score: 0,
      matchedSkills: [],
      matchedKeywords: [],
      matchedCategories: [],
      explanations: ['No behaviour preferences in profile; behaviour score is 0.'],
      rawScoreBeforeCap: 0,
    }
  }

  const haystack = buildVacancyHaystack({
    title: vacancy.title ?? '',
    skillsRequired: vacancy.skillsRequired ?? '',
    description: vacancy.description ?? '',
  })

  const vacSkills = splitVacancySkillPhrases(vacancy.skillsRequired ?? '')
  const matchedSkills = collectMatchedSkills(profile.preferredSkills, vacSkills, haystack)
  for (const s of matchedSkills) {
    explanations.push(`Matched preferred skill: ${s}`)
  }

  const skillKeysLower = new Set(matchedSkills.map((s) => normalizeBehaviourToken(s)))
  const matchedKeywords = collectMatchedKeywords(profile.preferredKeywords, haystack, skillKeysLower)
  for (const k of matchedKeywords) {
    explanations.push(`Matched keyword: ${k}`)
  }

  const vacancyCats = inferVacancyCategoryIds({
    title: vacancy.title ?? '',
    skillsRequired: vacancy.skillsRequired ?? '',
    description: vacancy.description ?? '',
  })
  const matchedCategories = collectMatchedCategories(profile.preferredCategories, vacancyCats)
  for (const c of matchedCategories) {
    explanations.push(`Matched category: ${categoryLabel(c)} (${c})`)
  }

  const skillBlock = Math.min(matchedSkills.length * SKILL_UNIT, SKILL_BLOCK_CAP)
  const kwBlock = Math.min(matchedKeywords.length * KEYWORD_UNIT, KEYWORD_BLOCK_CAP)
  const catBlock = Math.min(matchedCategories.length * CATEGORY_UNIT, CATEGORY_BLOCK_CAP)

  const rawScoreBeforeCap = skillBlock + kwBlock + catBlock
  const score = Math.min(BEHAVIOUR_SCORE_CAP, Math.max(0, rawScoreBeforeCap))

  if (rawScoreBeforeCap > BEHAVIOUR_SCORE_CAP) {
    explanations.push(
      `Raw behaviour contribution ${rawScoreBeforeCap.toFixed(3)} exceeded cap ${BEHAVIOUR_SCORE_CAP}; score clamped to ${BEHAVIOUR_SCORE_CAP}.`,
    )
  }

  if (matchedSkills.length === 0 && matchedKeywords.length === 0 && matchedCategories.length === 0) {
    explanations.push('No overlap between this vacancy and behaviour preferences.')
  }

  explanations.push(
    `Behaviour score uses additive blocks (skills ≤${SKILL_BLOCK_CAP}, keywords ≤${KEYWORD_BLOCK_CAP}, categories ≤${CATEGORY_BLOCK_CAP}) then cap ${BEHAVIOUR_SCORE_CAP}.`,
  )

  return {
    score,
    matchedSkills,
    matchedKeywords,
    matchedCategories,
    explanations,
    rawScoreBeforeCap,
  }
}
