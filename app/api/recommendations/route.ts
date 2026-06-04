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
import { normalizeStringArray } from '@/lib/normalize-string-array'
import { normalizeVacancySkills } from '@/lib/normalize-vacancy-skills'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'

function truncateText(text: string, max: number): string {
  const t = (text ?? '').trim()
  if (t.length <= max) return t
  return `${t.slice(0, max).trimEnd()}…`
}

/** Heuristic overlap between resume text and vacancy skill phrases — not a replacement for embedding score. */
function matchedSkillsFromResumeAndVacancy(
  resumeBlob: string,
  skillsRequired: string,
  requirements: unknown,
): string[] {
  const resumeLower = resumeBlob.toLowerCase()
  const phrases = [
    ...normalizeVacancySkills(skillsRequired),
    ...normalizeStringArray(requirements).flatMap((r) => normalizeVacancySkills(r)),
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

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

function resolveLocale(raw: string | undefined): Locale {
  return raw === 'ru' || raw === 'kk' ? raw : 'en'
}

function translateBehaviourExplanation(line: string, dict: ReturnType<typeof getDictionary>): string {
  const t = dict.employeeDashboard
  const preferredSkill = line.match(/^Matched preferred skill:\s*(.+)$/)
  if (preferredSkill?.[1]) {
    return formatMessage(t.matchedPreferredSkill, { value: preferredSkill[1] })
  }

  const keyword = line.match(/^Matched keyword:\s*(.+)$/)
  if (keyword?.[1]) {
    return formatMessage(t.matchedKeyword, { value: keyword[1] })
  }

  const category = line.match(/^Matched category:\s*(.+?)(?:\s+\(.+\))?$/)
  if (category?.[1]) {
    return formatMessage(t.matchedCategory, { value: category[1] })
  }

  if (line.startsWith('Raw behaviour contribution')) return t.rawBehaviourCap
  if (line.startsWith('No overlap')) return t.noBehaviourOverlap
  return line
}

function buildSemanticMatchNote(semanticScore: number, dict: ReturnType<typeof getDictionary>): string {
  const pct = Math.round(semanticScore * 100)
  return formatMessage(dict.employeeDashboard.semanticMatchNote, { pct })
}

function buildHybridRankingNote(
  semanticScore: number,
  behaviourScore: number,
  finalScore: number,
  behaviourBullets: string[],
  dict: ReturnType<typeof getDictionary>,
): string {
  const finPct = Math.round(finalScore * 100)
  const semPct = Math.round(semanticScore * 100)
  const t = dict.employeeDashboard
  const parts = [
    formatMessage(t.hybridRankingNote, {
      semanticWeight: HYBRID_SEMANTIC_WEIGHT,
      behaviourWeight: HYBRID_BEHAVIOUR_WEIGHT,
      finalPct: finPct,
      semanticPct: semPct,
      behaviourScore: behaviourScore.toFixed(3),
    }),
  ]
  const hits = behaviourBullets.filter(
    (b) => b.startsWith('Matched ') && !b.includes('exceeded cap') && !b.includes('No overlap'),
  )
  if (hits.length > 0) {
    parts.push(`${t.behaviourSignalsPrefix} ${hits.slice(0, 3).map((line) => translateBehaviourExplanation(line, dict)).join(' ')}`)
  } else if (behaviourScore <= 0) {
    parts.push(t.noBehaviourBoost)
  } else {
    parts.push(t.behaviourAdjustmentApplied)
  }
  return parts.join(' ')
}

function buildTextOverlapNote(matched: string[], dict: ReturnType<typeof getDictionary>): string | null {
  if (matched.length === 0) return null
  const list = matched.slice(0, 5).join(', ')
  return formatMessage(dict.employeeDashboard.textOverlapNote, { list })
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
  const locale = resolveLocale(request.cookies.get('NEXT_LOCALE')?.value)
  const dict = getDictionary(locale)
  let requestedLimit = DEFAULT_LIMIT
  if (rawLimit !== null && rawLimit !== '') {
    const parsed = Number.parseInt(rawLimit, 10)
    if (Number.isFinite(parsed)) {
      requestedLimit = Math.min(MAX_LIMIT, Math.max(1, parsed))
    }
  }

  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: dict.employeeDashboard.signInToSeeRecommendations }, { status: 401 })
  }

  if (session.user.role !== 'EMPLOYEE') {
    return NextResponse.json({ error: dict.employeeDashboard.jobSeekersOnly }, { status: 403 })
  }

  await dbConnect()

  const resume = (await getActiveResumeLeanForUser(session.user.id)) as any
  if (!resume) {
    return NextResponse.json({ error: dict.employeeDashboard.createResumeToUnlock }, { status: 404 })
  }

  if (!Array.isArray((resume as any).embedding) || (resume as any).embedding.length === 0) {
    return NextResponse.json(
      {
        error: dict.employeeDashboard.resumeSavedNeedMatch,
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

    const behaviourSession = buildBehaviourSessionInsights(behaviourProfile, locale)
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
      const requirements = normalizeStringArray(v?.requirements)
      const matchedSkills = matchedSkillsFromResumeAndVacancy(resumeBlob, skillsRequired, requirements)
      const behaviourExplanations = normalizeStringArray(r.behaviourExplanations)
      const translatedBehaviourExplanations = behaviourExplanations.map((line) =>
        translateBehaviourExplanation(line, dict),
      )
      return {
        vacancyId: r.vacancyId,
        title: r.title,
        company: r.company,
        score: r.score,
        semanticScore: r.semanticScore,
        behaviourScore: r.behaviourScore,
        finalScore: r.finalScore,
        description: description || dict.employeeDashboard.noShortDescription,
        matchedSkills,
        semanticMatchNote: buildSemanticMatchNote(r.semanticScore, dict),
        textOverlapNote: buildTextOverlapNote(matchedSkills, dict),
        hybridRankingNote: buildHybridRankingNote(r.semanticScore, r.behaviourScore, r.finalScore, behaviourExplanations, dict),
        behaviourExplanations: translatedBehaviourExplanations,
        cardAdaptationHint: resolveCardAdaptationHint(cold, r.behaviourScore),
        behaviourCardTagline: pickBehaviourCardTagline(cold, r.behaviourScore, behaviourExplanations, locale),
      }
    })

    const body: RecommendationsApiSuccessBody = { recommendations: enriched, behaviourSession }
    return NextResponse.json(body, { status: 200 })
  } catch (e) {
    console.warn('[JobFlow] Recommendations generation failed.', e)
    return NextResponse.json(
      {
        error: dict.employeeDashboard.couldntLoadRecs,
        code: 'RANKING_SERVICE_ERROR',
      },
      { status: 503 },
    )
  }
}

