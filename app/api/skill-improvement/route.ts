import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { getSession } from '@/lib/auth'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import { Response, SavedVacancy, Vacancy } from '@/lib/db/schema'
import { generateSkillImprovementReport, type SkillImprovementVacancy } from '@/lib/skill-recommendation-engine'

type VacancyLeanDoc = {
  _id: string | { toString(): string }
  title: string
  description?: string
  skillsRequired?: string | string[]
  requirements?: string | string[]
  responsibilities?: string | string[]
}

const VACANCY_PROJECTION = 'title description skillsRequired requirements responsibilities'
const MARKET_SAMPLE_LIMIT = 180

function toStringSafe(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toSkillInputVacancy(doc: VacancyLeanDoc): SkillImprovementVacancy {
  return {
    _id: doc._id,
    title: toStringSafe(doc.title),
    description: toStringSafe(doc.description),
    skillsRequired: doc.skillsRequired,
    requirements: doc.requirements,
    responsibilities: doc.responsibilities,
  }
}

/**
 * GET /api/skill-improvement
 * Analyzes user's current skills and generates improvement recommendations.
 */
export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'EMPLOYEE') {
      return NextResponse.json({ error: 'Only employees can use this feature' }, { status: 403 })
    }

    if (!mongoose.Types.ObjectId.isValid(session.user.id)) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 })
    }

    await dbConnect()

    const resume = await getActiveResumeLeanForUser(session.user.id)
    if (!resume) {
      return NextResponse.json(
        { error: 'No active resume found. Please create or activate a resume first.' },
        { status: 400 },
      )
    }

    const resumeText = [
      toStringSafe(resume.title),
      toStringSafe(resume.skills),
      toStringSafe(resume.experience),
      toStringSafe(resume.education),
    ]
      .filter(Boolean)
      .join('\n')

    const userObjectId = new mongoose.Types.ObjectId(session.user.id)

    const [savedLinks, responses] = await Promise.all([
      SavedVacancy.find({ userId: userObjectId }).select('vacancyId').lean(),
      Response.find({ userId: userObjectId }).select('vacancyId').sort({ createdAt: -1 }).lean(),
    ])

    const savedIds = savedLinks
      .map((doc) => String(doc.vacancyId ?? ''))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))

    const appliedIds = responses
      .map((doc) => String(doc.vacancyId ?? ''))
      .filter((id) => mongoose.Types.ObjectId.isValid(id))

    const focusIds = Array.from(new Set([...savedIds, ...appliedIds]))
    const focusObjectIds = focusIds.map((id) => new mongoose.Types.ObjectId(id))

    const focusVacanciesDocs = focusObjectIds.length
      ? await Vacancy.find({ _id: { $in: focusObjectIds } })
          .select(VACANCY_PROJECTION)
          .lean<VacancyLeanDoc[]>()
      : []

    const focusVacanciesById = new Map(focusVacanciesDocs.map((doc) => [String(doc._id), doc]))

    const savedVacancies = savedIds
      .map((id) => focusVacanciesById.get(id))
      .filter((doc): doc is VacancyLeanDoc => Boolean(doc))
      .map(toSkillInputVacancy)

    const appliedVacancies = appliedIds
      .map((id) => focusVacanciesById.get(id))
      .filter((doc): doc is VacancyLeanDoc => Boolean(doc))
      .map(toSkillInputVacancy)

    const marketQuery = focusObjectIds.length > 0
      ? { _id: { $nin: focusObjectIds } }
      : {}

    const marketVacanciesDocs = await Vacancy.find(marketQuery)
      .select(VACANCY_PROJECTION)
      .sort({ createdAt: -1 })
      .limit(MARKET_SAMPLE_LIMIT)
      .lean<VacancyLeanDoc[]>()

    const report = await generateSkillImprovementReport({
      resumeText,
      savedVacancies,
      appliedVacancies,
      marketVacancies: marketVacanciesDocs.map(toSkillInputVacancy),
    })

    return NextResponse.json(report)
  } catch (error) {
    console.error('Skill improvement analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze skills' },
      { status: 500 },
    )
  }
}
