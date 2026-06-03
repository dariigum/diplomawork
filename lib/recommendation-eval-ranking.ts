/**
 * Offline evaluation ranking only — not used by production API.
 * Reuses production primitives (cosine, behaviour, hybrid blend) without calling getTopRecommendations.
 */

import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import { buildUserBehaviourProfile } from '@/lib/behaviour-profile'
import { computeVacancyBehaviourScore, type BehaviourProfileForScore } from '@/lib/behaviour-score'
import { computeHybridFinalScore } from '@/lib/hybrid-recommendation-score'
import { cosineSimilarity } from '@/lib/recommendation'

export type EvalRankingVariant = 'semanticOnly' | 'hybrid'

export type EvalRankedVacancy = {
  vacancyId: string
  semanticScore: number
  behaviourScore: number
  finalScore: number
}

type EvalCandidateRow = {
  vacancyId: string
  title: string
  semanticScore: number
  skillsRequired: string
  description: string
}

function emptyBehaviourProfile(): BehaviourProfileForScore {
  return { preferredSkills: [], preferredKeywords: [], preferredCategories: [] }
}

/** Same vacancy corpus + semantic cosine filter as production recommendations. */
export async function buildEvalCandidateRows(userId: string): Promise<EvalCandidateRow[] | null> {
  await dbConnect()

  const resume = (await getActiveResumeLeanForUser(userId)) as { embedding?: number[] } | null
  if (!resume) return null

  const resumeEmbedding = resume.embedding
  if (!Array.isArray(resumeEmbedding) || resumeEmbedding.length === 0) return null

  const vacancies = (await Vacancy.find({ embedding: { $exists: true, $ne: null } })
    .select('_id title skillsRequired description embedding')
    .lean()) as Array<{
    _id: unknown
    title?: string
    skillsRequired?: string
    description?: string
    embedding?: number[]
  }>

  const rows: EvalCandidateRow[] = []

  for (const v of vacancies) {
    const embedding = v.embedding
    if (!Array.isArray(embedding) || embedding.length === 0) continue

    const semanticScore = cosineSimilarity(resumeEmbedding, embedding)
    if (semanticScore <= 0) continue

    rows.push({
      vacancyId: String(v._id),
      title: String(v.title ?? ''),
      semanticScore,
      skillsRequired: String(v.skillsRequired ?? ''),
      description: String(v.description ?? ''),
    })
  }

  return rows
}

function scoreCandidates(
  rows: EvalCandidateRow[],
  variant: EvalRankingVariant,
  profile: BehaviourProfileForScore,
): EvalRankedVacancy[] {
  return rows.map((r) => {
    if (variant === 'semanticOnly') {
      return {
        vacancyId: r.vacancyId,
        semanticScore: r.semanticScore,
        behaviourScore: 0,
        finalScore: r.semanticScore,
      }
    }

    const behaviour = computeVacancyBehaviourScore(profile, {
      title: r.title,
      skillsRequired: r.skillsRequired,
      description: r.description,
    })
    const finalScore = computeHybridFinalScore(r.semanticScore, behaviour.score)
    return {
      vacancyId: r.vacancyId,
      semanticScore: r.semanticScore,
      behaviourScore: behaviour.score,
      finalScore,
    }
  })
}

/**
 * Rank the shared candidate pool for offline A/B (semantic-only vs hybrid formula).
 * Hybrid variant here mirrors production math; production path uses getTopRecommendations in eval script.
 */
export async function rankEvalCandidates(params: {
  userId: string
  variant: EvalRankingVariant
  limit?: number
  excludeVacancyIdsFromBehaviour?: string[]
}): Promise<EvalRankedVacancy[]> {
  const limit = params.limit ?? 10
  const rows = await buildEvalCandidateRows(params.userId)
  if (!rows || rows.length === 0) return []

  let profile = emptyBehaviourProfile()
  if (params.variant === 'hybrid') {
    try {
      const built = await buildUserBehaviourProfile(params.userId, {
        excludeVacancyIds: params.excludeVacancyIdsFromBehaviour,
      })
      profile = {
        preferredSkills: built.preferredSkills,
        preferredKeywords: built.preferredKeywords,
        preferredCategories: built.preferredCategories,
      }
    } catch {
      profile = emptyBehaviourProfile()
    }
  }

  const scored = scoreCandidates(rows, params.variant, profile)
  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore
    return a.vacancyId.localeCompare(b.vacancyId)
  })
  return scored.slice(0, limit)
}
