import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { Vacancy, VacancyBehaviourEvent, type VacancyBehaviourEventType } from '@/lib/db/schema'
import {
  BEHAVIOUR_EVENT_WEIGHTS,
  buildUserBehaviourProfile,
  inferVacancyCategoryIds,
  splitVacancySkillPhrases,
} from '@/lib/behaviour-profile'
import { getBehaviourCategoryDisplayName } from '@/lib/behaviour-ui-explanations'

/** Window for weighted category/skill aggregation (bounded reads). */
const AGGREGATION_LOOKBACK_MS = 90 * 24 * 60 * 60 * 1000
const MAX_VACANCIES_FOR_AGG = 140

const POSITIVE_EVENT_TYPES: VacancyBehaviourEventType[] = [
  'VACANCY_VIEWED',
  'VACANCY_SAVED',
  'VACANCY_APPLIED',
]

function weightForEventType(t: VacancyBehaviourEventType): number {
  if (t === 'VACANCY_VIEWED') return BEHAVIOUR_EVENT_WEIGHTS.VACANCY_VIEWED
  if (t === 'VACANCY_SAVED') return BEHAVIOUR_EVENT_WEIGHTS.VACANCY_SAVED
  if (t === 'VACANCY_APPLIED') return BEHAVIOUR_EVENT_WEIGHTS.VACANCY_APPLIED
  return 0
}

export type BehaviourInteractionWindowCounts = {
  viewed: number
  saved: number
  applied: number
}

export type BehaviourInteractionWindows = {
  last7Days: BehaviourInteractionWindowCounts
  last30Days: BehaviourInteractionWindowCounts
  allTime: BehaviourInteractionWindowCounts & { unsaved: number }
}

export type BehaviourCategoryRankRow = {
  id: string
  label: string
  /** Sum of distributed interaction weights (not a probability). */
  weight: number
}

export type BehaviourSkillRankRow = {
  skill: string
  weight: number
}

export type BehaviourAnalyticsSnapshot = {
  coldStart: boolean
  windows: BehaviourInteractionWindows
  categoryRanked: BehaviourCategoryRankRow[]
  skillRanked: BehaviourSkillRankRow[]
  /** Cross-check: top signals from the same profile builder used in recommendations context. */
  profileTopCategories: string[]
  profileTopSkills: string[]
  summaryLines: string[]
  footnote: string
}

async function countWindow(
  userId: mongoose.Types.ObjectId,
  since: Date,
): Promise<BehaviourInteractionWindowCounts> {
  const [viewed, saved, applied] = await Promise.all([
    VacancyBehaviourEvent.countDocuments({
      userId,
      eventType: 'VACANCY_VIEWED',
      occurredAt: { $gte: since },
    }),
    VacancyBehaviourEvent.countDocuments({
      userId,
      eventType: 'VACANCY_SAVED',
      occurredAt: { $gte: since },
    }),
    VacancyBehaviourEvent.countDocuments({
      userId,
      eventType: 'VACANCY_APPLIED',
      occurredAt: { $gte: since },
    }),
  ])
  return { viewed, saved, applied }
}

function topRowsFromMap(m: Map<string, number>, labelFn: (k: string) => string, limit: number) {
  return [...m.entries()]
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k, weight]) => ({ id: k, label: labelFn(k), weight }))
}

/**
 * Read-only aggregates for dashboards. Does not call recommendation / hybrid / embedding code.
 */
export async function buildBehaviourAnalytics(userId: string): Promise<BehaviourAnalyticsSnapshot> {
  const footnote =
    'From saved interaction events and vacancy text (keyword buckets). Not model training or hidden personalization.'

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      coldStart: true,
      windows: {
        last7Days: { viewed: 0, saved: 0, applied: 0 },
        last30Days: { viewed: 0, saved: 0, applied: 0 },
        allTime: { viewed: 0, saved: 0, applied: 0, unsaved: 0 },
      },
      categoryRanked: [],
      skillRanked: [],
      profileTopCategories: [],
      profileTopSkills: [],
      summaryLines: ['No analytics: invalid user context.'],
      footnote,
    }
  }

  await dbConnect()
  const uid = new mongoose.Types.ObjectId(userId)

  const now = Date.now()
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000)
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000)

  const [last7Days, last30Days, allViewed, allSaved, allApplied, allUnsaved] = await Promise.all([
    countWindow(uid, d7),
    countWindow(uid, d30),
    VacancyBehaviourEvent.countDocuments({ userId: uid, eventType: 'VACANCY_VIEWED' }),
    VacancyBehaviourEvent.countDocuments({ userId: uid, eventType: 'VACANCY_SAVED' }),
    VacancyBehaviourEvent.countDocuments({ userId: uid, eventType: 'VACANCY_APPLIED' }),
    VacancyBehaviourEvent.countDocuments({ userId: uid, eventType: 'VACANCY_UNSAVED' }),
  ])

  const windows: BehaviourInteractionWindows = {
    last7Days,
    last30Days,
    allTime: { viewed: allViewed, saved: allSaved, applied: allApplied, unsaved: allUnsaved },
  }

  const coldStart = allViewed + allSaved + allApplied === 0

  let profileTopCategories: string[] = []
  let profileTopSkills: string[] = []
  try {
    const profile = await buildUserBehaviourProfile(userId, { maxCategories: 6, maxSkills: 10 })
    profileTopCategories = profile.preferredCategories
    profileTopSkills = profile.preferredSkills
  } catch (e) {
    console.warn('[JobFlow] Behaviour analytics: profile builder failed.', e)
  }

  if (coldStart) {
    return {
      coldStart: true,
      windows,
      categoryRanked: [],
      skillRanked: [],
      profileTopCategories,
      profileTopSkills,
      summaryLines: [
        'No behavioural trends yet — interaction insights will appear after you view, save, or apply to jobs.',
        'Recommendations can still use semantic resume matching in parallel.',
      ],
      footnote,
    }
  }

  const sinceAgg = new Date(now - AGGREGATION_LOOKBACK_MS)
  const events = await VacancyBehaviourEvent.find({
    userId: uid,
    eventType: { $in: POSITIVE_EVENT_TYPES },
    occurredAt: { $gte: sinceAgg },
  })
    .select('vacancyId eventType')
    .limit(800)
    .lean()

  const vacancyWeight = new Map<string, number>()
  for (const ev of events as { vacancyId: mongoose.Types.ObjectId; eventType: VacancyBehaviourEventType }[]) {
    const w = weightForEventType(ev.eventType)
    if (w <= 0) continue
    const id = String(ev.vacancyId)
    vacancyWeight.set(id, (vacancyWeight.get(id) ?? 0) + w)
  }

  const sortedVacancyIds = [...vacancyWeight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_VACANCIES_FOR_AGG)
    .map(([id]) => new mongoose.Types.ObjectId(id))

  const categoryScores = new Map<string, number>()
  const skillScores = new Map<string, number>()

  if (sortedVacancyIds.length > 0) {
    const vacancies = await Vacancy.find({ _id: { $in: sortedVacancyIds } })
      .select('title skillsRequired description')
      .lean()

    for (const doc of vacancies as {
      _id: mongoose.Types.ObjectId
      title?: string
      skillsRequired?: string
      description?: string
    }[]) {
      const id = String(doc._id)
      const w = vacancyWeight.get(id) ?? 0
      if (w <= 0) continue

      const title = String(doc.title ?? '')
      const skillsRequired = String(doc.skillsRequired ?? '')
      const description = String(doc.description ?? '')

      const cats = inferVacancyCategoryIds({ title, skillsRequired, description })
      if (cats.length > 0) {
        const share = w / cats.length
        for (const c of cats) {
          categoryScores.set(c, (categoryScores.get(c) ?? 0) + share)
        }
      }

      const skills = splitVacancySkillPhrases(skillsRequired)
      if (skills.length > 0) {
        const share = w / skills.length
        for (const s of skills) {
          skillScores.set(s, (skillScores.get(s) ?? 0) + share)
        }
      }
    }
  }

  const categoryRanked: BehaviourCategoryRankRow[] = topRowsFromMap(
    categoryScores,
    getBehaviourCategoryDisplayName,
    8,
  ).map((r) => ({ id: r.id, label: r.label, weight: Math.round(r.weight * 100) / 100 }))

  const skillRanked: BehaviourSkillRankRow[] = topRowsFromMap(skillScores, (k) => k, 10).map((r) => ({
    skill: r.id,
    weight: Math.round(r.weight * 100) / 100,
  }))

  const summaryLines: string[] = []
  summaryLines.push(
    `All-time: ${allViewed} views · ${allSaved} saves · ${allApplied} applies${allUnsaved ? ` · ${allUnsaved} unsaves` : ''}.`,
  )
  summaryLines.push(
    `Last 7 days: ${last7Days.viewed} / ${last7Days.saved} / ${last7Days.applied}. Last 30 days: ${last30Days.viewed} / ${last30Days.saved} / ${last30Days.applied}.`,
  )

  if (categoryRanked[0]) {
    summaryLines.push(`Strongest inferred category (~90d weighted): ${categoryRanked[0].label}.`)
  }
  if (skillRanked[0]) {
    summaryLines.push(`Top weighted skill phrase from those roles: ${skillRanked[0].skill}.`)
  }

  return {
    coldStart: false,
    windows,
    categoryRanked,
    skillRanked,
    profileTopCategories,
    profileTopSkills,
    summaryLines: summaryLines.slice(0, 5),
    footnote,
  }
}
