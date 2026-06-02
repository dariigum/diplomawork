import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { getSession } from '@/lib/auth'
import { Vacancy, Response, Chat } from '@/lib/db/schema'
import { cosineSimilarity } from '@/lib/recommendation'
import { isValidEmbeddingVector } from '@/lib/job-ingestion/embeddings/embedding-vector-guards'
import { buildResumeEmbeddingText, buildVacancyEmbeddingText } from '@/lib/embedding-text'
import { computeOverlapSkills, employerMatchFitLevel, matchScorePercent } from '@/lib/employer-candidate-matching'

function parseLimit(raw: string | null): number {
  if (!raw) return 20
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return 20
  return Math.min(80, Math.max(1, n))
}

export async function GET(req: Request, ctx: { params: Promise<{ vacancyId: string }> }) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'EMPLOYER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { vacancyId } = await ctx.params
    if (!vacancyId || !mongoose.Types.ObjectId.isValid(vacancyId)) {
      return NextResponse.json({ error: 'Invalid vacancyId' }, { status: 400 })
    }

    const url = new URL(req.url)
    const limit = parseLimit(url.searchParams.get('limit'))

    await dbConnect()

    const vacancy = (await Vacancy.findOne({ _id: vacancyId, employerId: session.user.id })
      .select('title description skillsRequired requirements responsibilities embedding')
      .lean()) as any

    if (!vacancy) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const vacancyEmbedding = vacancy.embedding as unknown
    if (!isValidEmbeddingVector(vacancyEmbedding)) {
      return NextResponse.json({ error: 'Vacancy embedding is not available' }, { status: 400 })
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

    const responses = (await Response.find({ vacancyId: new mongoose.Types.ObjectId(vacancyId) })
      .populate('userId', 'name logoUrl')
      .populate('resumeId', 'title cvFile skills embedding')
      .sort({ createdAt: -1 })
      .lean()) as any[]

    type RankedRow = {
      applicationId: string
      employee: { id: string; name: string; image?: string | null }
      resume: { id: string; title: string; cvFile?: string; skillsPreview: string } | null
      match: { semanticScore: number; matchScore: number; fitLevel: string } | null
      overlapSkills: string[]
      status: string
      appliedAt: string
      chat: { id: string | null; unreadCount: number; lastMessagePreview: string }
      _sort: { hasScore: boolean; semanticScore: number }
    }

    const rows: RankedRow[] = responses.map((r) => {
      const employee = r.userId
      const resume = r.resumeId

      let match: RankedRow['match'] = null
      let overlapSkills: string[] = []

      if (resume?.embedding && isValidEmbeddingVector(resume.embedding) && resume.embedding.length === vacancyEmbedding.length) {
        const semanticScore = cosineSimilarity(vacancyEmbedding, resume.embedding)
        if (Number.isFinite(semanticScore) && semanticScore > 0) {
          const matchScore = matchScorePercent(semanticScore)
          const resumeSkillText = buildResumeEmbeddingText({
            title: resume.title,
            skills: resume.skills,
            experience: '',
            education: '',
          })
          overlapSkills = computeOverlapSkills(vacancySkillText, resumeSkillText).slice(0, 8)
          match = {
            semanticScore,
            matchScore,
            fitLevel: employerMatchFitLevel(matchScore),
          }
        }
      }

      return {
        applicationId: String(r._id),
        employee: {
          id: String(employee?._id ?? ''),
          name: String(employee?.name ?? 'Candidate'),
          image: employee?.logoUrl ?? null,
        },
        resume: resume
          ? {
              id: String(resume._id),
              title: String(resume.title ?? ''),
              cvFile: typeof resume.cvFile === 'string' ? resume.cvFile : '',
              skillsPreview: String(resume.skills ?? '').slice(0, 160),
            }
          : null,
        match,
        overlapSkills,
        status: String(r.status ?? ''),
        appliedAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
        chat: { id: null, unreadCount: 0, lastMessagePreview: '' },
        _sort: { hasScore: !!match, semanticScore: match?.semanticScore ?? 0 },
      }
    })

    // Preserve current chat behavior: ensure chat exists and attach read/unread metadata.
    for (const row of rows) {
      // Mimic existing applicant flow: chat is uniquely identified by (employeeId, vacancyId)
      if (!row.employee.id) continue
      const chat = (await Chat.findOne({
        employeeId: new mongoose.Types.ObjectId(row.employee.id),
        vacancyId: new mongoose.Types.ObjectId(vacancyId),
      })
        .select('unreadCountEmployer lastMessagePreview')
        .lean()) as any

      if (chat) {
        row.chat = {
          id: String(chat._id),
          unreadCount: Number(chat.unreadCountEmployer ?? 0),
          lastMessagePreview: String(chat.lastMessagePreview ?? ''),
        }
      }
    }

    rows.sort((a, b) => {
      if (a._sort.hasScore !== b._sort.hasScore) return a._sort.hasScore ? -1 : 1
      return b._sort.semanticScore - a._sort.semanticScore
    })

    const candidates = rows.slice(0, limit).map(({ _sort, ...rest }) => rest)
    const rankedCount = rows.filter((r) => r._sort.hasScore).length

    return NextResponse.json({
      vacancy: {
        id: String(vacancy._id),
        title: String(vacancy.title ?? ''),
        applicantsTotal: responses.length,
        rankedCount,
        unrankedCount: responses.length - rankedCount,
      },
      candidates,
      meta: {
        limit,
        sortedBy: 'semanticScore_desc',
        scoring: 'cosineSimilarity(vacancy.embedding, resume.embedding) mapped to [0..1], displayed as 0..100',
      },
    })
  } catch (e: any) {
    console.error('[ranked-applicants]', e)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

