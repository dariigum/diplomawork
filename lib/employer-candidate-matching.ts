import dbConnect from '@/lib/db/mongoose'
import { Vacancy, Resume } from '@/lib/db/schema'
import { cosineSimilarity } from '@/lib/recommendation'
import { buildVacancyEmbeddingText, buildResumeEmbeddingText } from '@/lib/embedding-text'
import {
  normalizeBehaviourToken,
  splitVacancySkillPhrases,
  splitVacancyTitleWords,
} from '@/lib/behaviour-profile'
import { isValidEmbeddingVector } from '@/lib/job-ingestion/embeddings/embedding-vector-guards'
import mongoose from 'mongoose'
import { resolveEmployerCvForApi } from '@/lib/employer-cv-url.server'

export type EmployerMatchFitLevel = 'Strong Fit' | 'Related' | 'Exploratory'

export type EmployerMatchCandidate = {
  userId: string
  resumeId: string
  candidateName: string
  matchScore: number
  fitLevel: EmployerMatchFitLevel
  overlapSkills: string[]
  /** Safe local /uploads/resumes/ path or verified external URL. */
  cvFile?: string
  /** DB had a CV reference but file is missing or path is invalid. */
  cvUnavailable?: boolean
  cvLink?: string
}

const DEFAULT_LIMIT = 10

export function matchScorePercent(semanticScore: number): number {
  if (!Number.isFinite(semanticScore) || semanticScore <= 0) return 0
  return Math.round(Math.max(0, Math.min(1, semanticScore)) * 100)
}

/** Deterministic fit labels from mapped cosine score (0–100). */
export function employerMatchFitLevel(matchScore: number): EmployerMatchFitLevel {
  if (matchScore >= 80) return 'Strong Fit'
  if (matchScore >= 60) return 'Related'
  return 'Exploratory'
}

function normalizedSkillTerms(text: string): Set<string> {
  const terms = new Set<string>()
  for (const phrase of splitVacancySkillPhrases(text)) {
    const n = normalizeBehaviourToken(phrase)
    if (n) terms.add(n)
  }
  for (const word of splitVacancyTitleWords(text)) {
    const n = normalizeBehaviourToken(word)
    if (n && n.length >= 2) terms.add(n)
  }
  return terms
}

/** Deterministic skill overlap (no LLM) using existing vacancy/resume text tokenization. */
export function computeOverlapSkills(vacancyText: string, resumeText: string): string[] {
  const vacancyTerms = normalizedSkillTerms(vacancyText)
  const resumePhrases = [
    ...splitVacancySkillPhrases(resumeText),
    ...splitVacancySkillPhrases(resumeText.replace(/\n/g, ',')),
  ]
  const seen = new Set<string>()
  const display: string[] = []

  for (const phrase of resumePhrases) {
    const trimmed = phrase.trim()
    if (!trimmed) continue
    const norm = normalizeBehaviourToken(trimmed)
    if (!norm || !vacancyTerms.has(norm) || seen.has(norm)) continue
    seen.add(norm)
    display.push(trimmed)
  }

  return display.slice(0, 12)
}

type VacancyLean = {
  _id: mongoose.Types.ObjectId
  employerId: mongoose.Types.ObjectId
  title?: string
  description?: string
  skillsRequired?: string
  requirements?: string | string[]
  responsibilities?: string | string[]
  embedding?: number[]
}

type ResumeLean = {
  _id: mongoose.Types.ObjectId
  userId: { _id?: mongoose.Types.ObjectId; name?: string } | mongoose.Types.ObjectId
  title?: string
  skills?: string
  experience?: string
  education?: string
  embedding?: number[]
}

/**
 * Semantic candidate ranking for an employer-owned vacancy (vacancy.embedding × resume.embedding).
 * Reuses `cosineSimilarity` from the employee recommendation pipeline — no new embedding calls.
 */
export async function getTopMatchingCandidatesForVacancy(params: {
  employerId: string
  vacancyId: string
  limit?: number
}): Promise<EmployerMatchCandidate[]> {
  const limit = params.limit ?? DEFAULT_LIMIT

  if (!mongoose.Types.ObjectId.isValid(params.vacancyId)) {
    throw new Error('Invalid vacancy id')
  }

  await dbConnect()

  const vacancy = (await Vacancy.findOne({
    _id: params.vacancyId,
    employerId: params.employerId,
  })
    .select('title description skillsRequired requirements responsibilities embedding employerId')
    .lean()) as VacancyLean | null

  if (!vacancy) {
    throw new Error('Vacancy not found')
  }

  const vacancyEmbedding = vacancy.embedding
  if (!isValidEmbeddingVector(vacancyEmbedding)) {
    throw new Error('Vacancy has no embedding')
  }

  const vacancySkillText = buildVacancyEmbeddingText({
    title: vacancy.title,
    description: vacancy.description,
    skillsRequired: vacancy.skillsRequired,
    requirements: Array.isArray(vacancy.requirements)
      ? vacancy.requirements
      : vacancy.requirements
        ? [String(vacancy.requirements)]
        : [],
    responsibilities: Array.isArray(vacancy.responsibilities)
      ? vacancy.responsibilities
      : vacancy.responsibilities
        ? [String(vacancy.responsibilities)]
        : [],
  })

  const resumes = (await Resume.find({
    activeForAi: true,
    embedding: { $exists: true, $ne: null },
  })
    .select('userId title skills experience education embedding cvFile cvLink')
    .populate('userId', 'name')
    .lean()) as ResumeLean[]

  type Scored = EmployerMatchCandidate & { semanticScore: number }

  const scored: Scored[] = []

  for (const resume of resumes) {
    const emb = resume.embedding
    if (!isValidEmbeddingVector(emb)) continue
    if (emb.length !== vacancyEmbedding.length) continue

    const semanticScore = cosineSimilarity(vacancyEmbedding, emb)
    if (!Number.isFinite(semanticScore) || semanticScore <= 0) continue

    const matchScore = matchScorePercent(semanticScore)
    const resumeSkillText = buildResumeEmbeddingText({
      title: resume.title,
      skills: resume.skills,
      experience: resume.experience,
      education: resume.education,
    })

    const userRef = resume.userId
    const userId =
      typeof userRef === 'object' && userRef !== null && '_id' in userRef
        ? String(userRef._id)
        : String(userRef)
    const candidateName =
      typeof userRef === 'object' && userRef !== null && 'name' in userRef && userRef.name
        ? String(userRef.name)
        : 'Candidate'

    scored.push({
      userId,
      resumeId: String(resume._id),
      candidateName,
      matchScore,
      fitLevel: employerMatchFitLevel(matchScore),
      overlapSkills: computeOverlapSkills(vacancySkillText, resumeSkillText),
      ...resolveEmployerCvForApi(resume.cvFile, resume.cvLink),
      cvLink: typeof resume.cvLink === 'string' && resume.cvLink.trim() ? resume.cvLink.trim() : undefined,
      semanticScore,
    })
  }

  scored.sort((a, b) => b.semanticScore - a.semanticScore)

  return scored.slice(0, limit).map(({ semanticScore: _s, ...row }) => row)
}
