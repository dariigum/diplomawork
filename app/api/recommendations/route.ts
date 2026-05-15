import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { getSession } from '@/lib/auth'
import { Resume, Vacancy } from '@/lib/db/schema'
import { getTopRecommendations } from '@/lib/recommendation'
import { getActiveResumeLeanForUser } from '@/lib/active-resume'
import type { RecommendationApiItem, RecommendationsApiSuccessBody } from '@/lib/recommendations-api-types'
import { HYBRID_BEHAVIOUR_WEIGHT, HYBRID_SEMANTIC_WEIGHT } from '@/lib/hybrid-recommendation-score'
import { buildUserBehaviourProfile, type UserBehaviourProfile } from '@/lib/behaviour-profile'
import {
  buildBehaviourSessionInsights,
  pickBehaviourCardTagline,
  resolveCardAdaptationHint,
} from '@/lib/behaviour-ui-explanations'
import { normalizeVacancySkills } from '@/lib/normalize-vacancy-skills'

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
    ...normalizeVacancySkills(skillsRequired),
    ...requirements.flatMap((r) => normalizeVacancySkills(r)),
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

function buildSemanticMatchNote(semanticScore: number): string {
  const pct = Math.round(semanticScore * 100)
  return `Semantic match (embedding cosine, semantic-only layer): ~${pct}% on a 0–100 display scale. This is the primary signal in semantic-first adaptive ranking.`
}

function buildHybridRankingNote(
  semanticScore: number,
  behaviourScore: number,
  finalScore: number,
  behaviourBullets: string[],
): string {
  const finPct = Math.round(finalScore * 100)
  const semPct = Math.round(semanticScore * 100)
  const parts = [
    `Adaptive rank combines semantic (${HYBRID_SEMANTIC_WEIGHT}×) and behaviour (${HYBRID_BEHAVIOUR_WEIGHT}×): final ~${finPct}% (semantic-only would be ~${semPct}%). Behaviour term is capped (${behaviourScore.toFixed(3)}).`,
  ]
  const hits = behaviourBullets.filter(
    (b) => b.startsWith('Matched ') && !b.includes('exceeded cap') && !b.includes('No overlap'),
  )
  if (hits.length > 0) {
    parts.push(`Behaviour signals: ${hits.slice(0, 3).join(' ')}`)
  } else if (behaviourScore <= 0) {
    parts.push('No behaviour boost here (cold profile or no overlap); ordering follows the semantic layer.')
  } else {
    parts.push('Behaviour adjustment applied (see explanation lines on the card).')
  }
  return parts.join(' ')
}

function buildTextOverlapNote(matched: string[]): string | null {
  if (matched.length === 0) return null
  const list = matched.slice(0, 5).join(', ')
  return `Resume text overlap with JD phrases: ${list}. Readability hint only — does not change embedding cosine or adaptive rank.`
}

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

const EMPTY_BEHAVIOUR_PROFILE: UserBehaviourProfile = {
  preferredSkills: [],
  preferredKeywords: [],
  preferredCategories: [],
  interactionSummary: { viewed: 0, saved: 0, applied: 0 },
  explanations: { weighting: '', categories: '', skills: '' },
}

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

    let behaviourProfile: UserBehaviourProfile = EMPTY_BEHAVIOUR_PROFILE
    try {
      behaviourProfile = await buildUserBehaviourProfile(session.user.id)
    } catch (e) {
      console.warn('[JobFlow] Behaviour profile fetch for UI insights failed; using neutral copy.', e)
    }

    const behaviourSession = buildBehaviourSessionInsights(behaviourProfile)
    const cold = behaviourSession.coldStart

    if (recs.length === 0) {
      const body: RecommendationsApiSuccessBody = { recommendations: [], behaviourSession }
      return NextResponse.json(body, { status: 200 })
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
      const behaviourExplanations = Array.isArray(r.behaviourExplanations) ? r.behaviourExplanations : []
      return {
        vacancyId: r.vacancyId,
        title: r.title,
        company: r.company,
        score: r.score,
        semanticScore: r.semanticScore,
        behaviourScore: r.behaviourScore,
        finalScore: r.finalScore,
        description: description || 'No short description available for this listing.',
        matchedSkills,
        semanticMatchNote: buildSemanticMatchNote(r.semanticScore),
        textOverlapNote: buildTextOverlapNote(matchedSkills),
        hybridRankingNote: buildHybridRankingNote(r.semanticScore, r.behaviourScore, r.finalScore, behaviourExplanations),
        behaviourExplanations,
        cardAdaptationHint: resolveCardAdaptationHint(cold, r.behaviourScore),
        behaviourCardTagline: pickBehaviourCardTagline(cold, r.behaviourScore, behaviourExplanations),
      }
    })

    const body: RecommendationsApiSuccessBody = { recommendations: enriched, behaviourSession }
    return NextResponse.json(body, { status: 200 })
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

