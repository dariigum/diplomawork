import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'

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
  score: number
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

  const scored = vacancies
    .map(v => {
      const embedding = v.embedding as number[] | undefined
      if (!Array.isArray(embedding) || embedding.length === 0) return null

      const score = cosineSimilarity(resumeEmbedding, embedding)
      if (score <= 0) return null

      return {
        vacancyId: v._id.toString(),
        title: String(v.title ?? ''),
        company: String(v.employerId?.name ?? 'Unknown Company'),
        score,
      } satisfies RecommendationItem
    })
    .filter(Boolean) as RecommendationItem[]

  scored.sort((x, y) => y.score - x.score)
  return scored.slice(0, limit)
}

