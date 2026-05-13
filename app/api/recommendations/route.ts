import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { getSession } from '@/lib/auth'
import { Resume, Vacancy } from '@/lib/db/schema'
import { getTopRecommendations } from '@/lib/recommendation'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import type { RecommendationApiItem } from '@/lib/recommendations-api-types'

function truncateText(text: string, max: number): string {
  const t = (text ?? '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

/** Heuristic overlap between resume text and vacancy skill phrases — not a replacement for embedding score. */
function matchedSkillsFromResumeAndVacancy(
  resumeBlob: string,
  skillsRequired: string,
  requirements: string[],
): string[] {
  const resumeLower = resumeBlob.toLowerCase()
  const phrases = [
    ...skillsRequired
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    ...requirements.flatMap((r) =>
      String(r)
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
  const out: string[] = []
  const seen = new Set<string>()
  for (const phrase of phrases) {
    const pl = phrase.toLowerCase()
    if (pl.length < 2) continue
    const words = pl.split(/\s+/).filter((w) => w.length > 2)
    const hit =
      resumeLower.includes(pl) || words.some((w) => w.length > 2 && resumeLower.includes(w))
    if (hit) {
      const key = pl
      if (!seen.has(key)) {
        seen.add(key)
        out.push(phrase)
      }
    }
    if (out.length >= 8) break
  }
  return out
}

function buildSemanticMatchNote(score: number): string {
  const pct = Math.round(score * 100)
  return `Ordered by embedding cosine similarity only. This listing is at ${pct}% on the same [0–100] scale as the bar above (geometry in vector space, not a calibrated probability).`
}

function buildTextOverlapNote(matched: string[]): string | null {
  if (matched.length === 0) return null
  const list = matched.slice(0, 5).join(', ')
  return `Separate text check: your resume text lines up with these JD phrases — ${list}. This hint is for readability only; it does not change the embedding score or sort order.`
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

export async function GET(request: NextRequest) {
  const rawLimit = request.nextUrl.searchParams.get('limit')
  let requestedLimit = DEFAULT_LIMIT
  if (rawLimit !== null && rawLimit !== '') {
    const parsed = Number.parseInt(rawLimit, 10)
    if (Number.isFinite(parsed)) {
      requestedLimit = Math.min(MAX_LIMIT, Math.max(1, parsed))
    }
  }

  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (session.user.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: 'Only employees can get recommendations' }, { status: 403 })
  }

  await dbConnect()

  const resume = (await getActiveResumeLeanForUser(session.user.id)) as any
  if (!resume) {
    return NextResponse.json({ error: 'No resume found. Create a resume to get recommendations.' }, { status: 404 })
  }

  if (!Array.isArray((resume as any).embedding) || (resume as any).embedding.length === 0) {
    return NextResponse.json(
      {
        error:
          'Your resume is saved but has no embedding vector yet. Save again from the resume editor while the embedding service is online.',
        code: 'NO_EMBEDDING',
      },
      { status: 422 },
    )
  }

  const resumeBlob = [
    (resume as any).title,
    (resume as any).skills,
    (resume as any).experience,
    (resume as any).education,
  ]
    .filter(Boolean)
    .join(' ')

  try {
    const recs = await getTopRecommendations({ userId: session.user.id, limit: requestedLimit })
    if (recs.length === 0) {
      return NextResponse.json([], { status: 200 })
    }

    const ids = recs.map((r) => new mongoose.Types.ObjectId(r.vacancyId))
    const docs = await Vacancy.find({ _id: { $in: ids } })
      .select('description skillsRequired requirements responsibilities title')
      .lean()

    const byId = new Map<string, (typeof docs)[0]>()
    for (const d of docs) {
      byId.set(String(d._id), d)
    }

    const enriched: RecommendationApiItem[] = recs.map((r) => {
      const v = byId.get(r.vacancyId)
      const description = truncateText(String(v?.description ?? ''), 280)
      const skillsRequired = String(v?.skillsRequired ?? '')
      const requirements = Array.isArray(v?.requirements) ? (v.requirements as string[]) : []
      const matchedSkills = matchedSkillsFromResumeAndVacancy(resumeBlob, skillsRequired, requirements)
      return {
        vacancyId: r.vacancyId,
        title: r.title,
        company: r.company,
        score: r.score,
        description: description || 'No short description available for this listing.',
        matchedSkills,
        semanticMatchNote: buildSemanticMatchNote(r.score),
        textOverlapNote: buildTextOverlapNote(matchedSkills),
      }
    })

    return NextResponse.json(enriched, { status: 200 })
  } catch (e) {
    console.warn('[JobFlow] Recommendations generation failed.', e)
    return NextResponse.json(
      {
        error: 'Recommendation ranking could not be completed. Try again shortly.',
        code: 'RANKING_SERVICE_ERROR',
      },
      { status: 503 },
    )
  }
}

