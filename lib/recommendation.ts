import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import { buildUserBehaviourProfile } from '@/lib/behaviour-profile'
import { computeVacancyBehaviourScore, type BehaviourProfileForScore } from '@/lib/behaviour-score'
import { computeHybridFinalScore } from '@/lib/hybrid-recommendation-score'

export function cosineSimilarity(a: unknown, b: unknown): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0
  if (a.length === 0 || b.length === 0) return 0
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    const av = typeof a[i] === 'number' ? (a[i] as number) : Number(a[i])
    const bv = typeof b[i] === 'number' ? (b[i] as number) : Number(b[i])

    if (!Number.isFinite(av) || !Number.isFinite(bv)) return 0

    dot += av * bv
    normA += av * av
    normB += bv * bv
  }

  if (normA <= 0 || normB <= 0) return 0

  const cos = dot / (Math.sqrt(normA) * Math.sqrt(normB))
  // Map [-1, 1] -> [0, 1] and clamp.
  const mapped = (cos + 1) / 2
  if (!Number.isFinite(mapped)) return 0
  return Math.max(0, Math.min(1, mapped))
}

export type RecommendationItem = {
  vacancyId: string
  title: string
  company: string
  /** Hybrid final score (semantic-first); same as `finalScore` — list sort key. */
  score: number
  /** Cosine-derived [0,1] only — unchanged mapping from `cosineSimilarity`. */
  semanticScore: number
  /** From `computeVacancyBehaviourScore` (capped small). */
  behaviourScore: number
  /** semanticScore×0.85 + behaviourScore×0.15 */
  finalScore: number
  /** Short explainability lines for behaviour layer (truncated in pipeline). */
  behaviourExplanations: string[]
}

const MAX_BEHAVIOUR_EXPLANATIONS = 8

function emptyBehaviourProfile(): BehaviourProfileForScore {
  return { preferredSkills: [], preferredKeywords: [], preferredCategories: [] }
}

export async function getTopRecommendations(params: { userId: string; limit?: number }): Promise<RecommendationItem[]> {
  const limit = params.limit ?? 10

  await dbConnect()

  const resume = (await getActiveResumeLeanForUser(params.userId)) as any
  if (!resume) {
    return []
  }

  const resumeEmbedding = resume.embedding as number[] | undefined
  if (!Array.isArray(resumeEmbedding) || resumeEmbedding.length === 0) {
    return []
  }

  const vacancies = await Vacancy.find({ embedding: { $exists: true, $ne: null } })
    .populate('employerId', 'name')
    .lean() as any[]

  type Row = {
    vacancyId: string
    title: string
    company: string
    semanticScore: number
    skillsRequired: string
    description: string
  }

  const rows = vacancies
    .map((v) => {
      const embedding = v.embedding as number[] | undefined
      if (!Array.isArray(embedding) || embedding.length === 0) return null

      const semanticScore = cosineSimilarity(resumeEmbedding, embedding)
      if (semanticScore <= 0) return null

      return {
        vacancyId: v._id.toString(),
        title: String(v.title ?? ''),
        company: String(v.employerId?.name ?? 'Unknown Company'),
        semanticScore,
        skillsRequired: String(v.skillsRequired ?? ''),
        description: String(v.description ?? ''),
      } satisfies Row
    })
    .filter(Boolean) as Row[]

  let profile: BehaviourProfileForScore = emptyBehaviourProfile()
  try {
    const built = await buildUserBehaviourProfile(params.userId)
    profile = {
      preferredSkills: built.preferredSkills,
      preferredKeywords: built.preferredKeywords,
      preferredCategories: built.preferredCategories,
    }
  } catch (e) {
    console.warn('[JobFlow] Behaviour profile skipped for recommendations; using semantic-only blend.', e)
    profile = emptyBehaviourProfile()
  }

  const scored: RecommendationItem[] = rows.map((r) => {
    const behaviour = computeVacancyBehaviourScore(profile, {
      title: r.title,
      skillsRequired: r.skillsRequired,
      description: r.description,
    })
    const finalScore = computeHybridFinalScore(r.semanticScore, behaviour.score)
    return {
      vacancyId: r.vacancyId,
      title: r.title,
      company: r.company,
      score: finalScore,
      semanticScore: r.semanticScore,
      behaviourScore: behaviour.score,
      finalScore,
      behaviourExplanations: behaviour.explanations.slice(0, MAX_BEHAVIOUR_EXPLANATIONS),
    }
  })

  scored.sort((x, y) => y.finalScore - x.finalScore)
  return scored.slice(0, limit)
}

