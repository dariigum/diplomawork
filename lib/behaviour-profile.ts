import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { Vacancy, VacancyBehaviourEvent, type VacancyBehaviourEventType } from '@/lib/db/schema'

/** Weights: weak (view) < medium (save) < strong (apply). Tunable constants, no ML. */
export const BEHAVIOUR_EVENT_WEIGHTS: Record<
  'VACANCY_VIEWED' | 'VACANCY_SAVED' | 'VACANCY_APPLIED',
  number
> = {
  VACANCY_VIEWED: 1,
  VACANCY_SAVED: 3,
  VACANCY_APPLIED: 6,
}

const PROFILE_EVENT_TYPES: VacancyBehaviourEventType[] = [
  'VACANCY_VIEWED',
  'VACANCY_SAVED',
  'VACANCY_APPLIED',
]

export type BehaviourInteractionSummary = {
  viewed: number
  saved: number
  applied: number
}

export type UserBehaviourProfile = {
  preferredSkills: string[]
  preferredKeywords: string[]
  /** Inferred role buckets from title/skills/description keyword rules (no DB category field on Vacancy). */
  preferredCategories: string[]
  interactionSummary: BehaviourInteractionSummary
  /**
   * Short human-readable hints for dashboards / future AI explainability.
   * Not used for ranking.
   */
  explanations: {
    weighting: string
    categories: string
    skills: string
  }
}

const DEFAULT_MAX_EVENTS = 500

const STOPWORDS = new Set(
  [
    'the',
    'and',
    'for',
    'with',
    'you',
    'our',
    'are',
    'will',
    'this',
    'that',
    'from',
    'your',
    'all',
    'any',
    'has',
    'have',
    'been',
    'was',
    'were',
    'not',
    'but',
    'can',
    'may',
    'who',
    'how',
    'what',
    'when',
    'where',
    'into',
    'over',
    'more',
    'than',
    'such',
    'also',
    'using',
    'use',
    'used',
    'new',
    'job',
    'role',
    'team',
    'work',
    'remote',
    'full',
    'time',
    'part',
    'senior',
    'junior',
    'mid',
    'level',
    'experience',
    'years',
    'year',
    'looking',
    'seeking',
    'developer',
    'engineer',
    'software',
    'компания',
    'команд',
    'опыт',
    'работ',
    'удален',
    'полная',
    'занятость',
  ].map((w) => w.toLowerCase()),
)

/** Category id → substrings / whole words matched in lowercased vacancy text (explainable heuristics). */
const CATEGORY_RULES: { id: string; needles: string[] }[] = [
  {
    id: 'frontend',
    needles: [
      'react',
      'vue',
      'angular',
      'svelte',
      'next.js',
      'nextjs',
      'webpack',
      'vite',
      'css',
      'scss',
      'sass',
      'tailwind',
      'redux',
      'frontend',
      'front-end',
      'ui engineer',
      'typescript',
    ],
  },
  {
    id: 'backend',
    needles: [
      'backend',
      'back-end',
      'api design',
      'rest api',
      'graphql',
      'microservice',
      'django',
      'flask',
      'fastapi',
      'express',
      'nestjs',
      'spring boot',
      'spring',
      '.net',
      'asp.net',
      'ruby on rails',
      'rails',
      'laravel',
      'kafka',
      'rabbitmq',
    ],
  },
  {
    id: 'ai_ml',
    needles: [
      'machine learning',
      'deep learning',
      'nlp',
      'llm',
      'pytorch',
      'tensorflow',
      'keras',
      'hugging face',
      'computer vision',
      'data scientist',
      'ml engineer',
      'ai engineer',
      'recommendation system',
      'neural',
    ],
  },
  {
    id: 'mobile',
    needles: ['ios', 'android', 'swift', 'kotlin', 'flutter', 'react native', 'mobile developer', 'xamarin'],
  },
  {
    id: 'devops',
    needles: [
      'devops',
      'sre',
      'kubernetes',
      'k8s',
      'docker',
      'terraform',
      'ansible',
      'jenkins',
      'ci/cd',
      'github actions',
      'aws',
      'gcp',
      'azure',
      'helm',
      'prometheus',
      'grafana',
    ],
  },
  {
    id: 'data',
    needles: [
      'data engineer',
      'etl',
      'dbt',
      'snowflake',
      'bigquery',
      'redshift',
      'spark',
      'airflow',
      'data warehouse',
      'analytics engineer',
    ],
  },
]

function eventWeight(t: VacancyBehaviourEventType): number {
  if (t === 'VACANCY_VIEWED') return BEHAVIOUR_EVENT_WEIGHTS.VACANCY_VIEWED
  if (t === 'VACANCY_SAVED') return BEHAVIOUR_EVENT_WEIGHTS.VACANCY_SAVED
  if (t === 'VACANCY_APPLIED') return BEHAVIOUR_EVENT_WEIGHTS.VACANCY_APPLIED
  return 0
}

export function normalizeBehaviourToken(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Shared vacancy skill split (comma/semicolon/etc.) — used by profile builder and behaviour scoring. */
export function splitVacancySkillPhrases(skillsRequired: string): string[] {
  return skillsRequired
    .split(/[,;/|]/)
    .map((s) => normalizeBehaviourToken(s))
    .filter((s) => s.length >= 2 && s.length <= 80)
}

/** Title word tokens for deterministic keyword/concept pipelines (length ≥3, stopword-filtered). */
export function splitVacancyTitleWords(title: string): string[] {
  const raw = title.toLowerCase().split(/[^a-zа-яё0-9+#.]+/)
  const out: string[] = []
  for (const w of raw) {
    const t = w.replace(/^\.+|\.+$/g, '')
    if (t.length < 3 || STOPWORDS.has(t)) continue
    out.push(t)
  }
  return out
}

/** Lowercased text bundle for keyword/category heuristics (aligned with profile extraction). */
export function buildVacancyHaystack(v: {
  title: string
  skillsRequired: string
  description: string
}): string {
  const desc = (v.description || '').slice(0, 800).toLowerCase()
  return `${(v.title || '').toLowerCase()} ${(v.skillsRequired || '').toLowerCase()} ${desc}`
}

function scoreCategories(haystack: string): Map<string, number> {
  const scores = new Map<string, number>()
  for (const rule of CATEGORY_RULES) {
    let hit = 0
    for (const needle of rule.needles) {
      const n = needle.toLowerCase()
      if (n.length <= 2) continue
      if (haystack.includes(n)) hit += 1
    }
    if (hit > 0) scores.set(rule.id, hit)
  }
  return scores
}

/** Category bucket ids currently matched in vacancy text (same rules as profile `preferredCategories`). */
export function inferVacancyCategoryIds(v: {
  title: string
  skillsRequired: string
  description: string
}): string[] {
  return [...scoreCategories(buildVacancyHaystack(v)).keys()]
}

function topKeysByScore(m: Map<string, number>, limit: number): string[] {
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([k]) => k)
}

export type BuildUserBehaviourProfileOptions = {
  /** Cap how many recent events are scanned (performance). */
  maxEvents?: number
  maxSkills?: number
  maxKeywords?: number
  maxCategories?: number
}

/**
 * Passive preference layer from VacancyBehaviourEvent + Vacancy text.
 * Does not read embeddings and does not affect semantic ranking.
 */
export async function buildUserBehaviourProfile(
  userId: string,
  options: BuildUserBehaviourProfileOptions = {},
): Promise<UserBehaviourProfile> {
  const maxEvents = options.maxEvents ?? DEFAULT_MAX_EVENTS
  const maxSkills = options.maxSkills ?? 24
  const maxKeywords = options.maxKeywords ?? 28
  const maxCategories = options.maxCategories ?? 6

  const emptySummary: BehaviourInteractionSummary = { viewed: 0, saved: 0, applied: 0 }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return {
      preferredSkills: [],
      preferredKeywords: [],
      preferredCategories: [],
      interactionSummary: emptySummary,
      explanations: {
        weighting: 'Invalid user id; no events read.',
        categories: 'Vacancy has no dedicated category field; buckets are keyword rules on title/skills/description.',
        skills: 'No events processed.',
      },
    }
  }

  await dbConnect()
  const uid = new mongoose.Types.ObjectId(userId)

  const events = await VacancyBehaviourEvent.find({
    userId: uid,
    eventType: { $in: PROFILE_EVENT_TYPES },
  })
    .sort({ occurredAt: -1 })
    .limit(maxEvents)
    .select('vacancyId eventType')
    .lean()

  const summary: BehaviourInteractionSummary = { ...emptySummary }
  const vacancyWeight = new Map<string, number>()

  for (const ev of events as { vacancyId: mongoose.Types.ObjectId; eventType: VacancyBehaviourEventType }[]) {
    const vid = String(ev.vacancyId)
    const w = eventWeight(ev.eventType)
    if (w <= 0) continue

    if (ev.eventType === 'VACANCY_VIEWED') summary.viewed += 1
    else if (ev.eventType === 'VACANCY_SAVED') summary.saved += 1
    else if (ev.eventType === 'VACANCY_APPLIED') summary.applied += 1

    vacancyWeight.set(vid, (vacancyWeight.get(vid) ?? 0) + w)
  }

  if (vacancyWeight.size === 0) {
    return {
      preferredSkills: [],
      preferredKeywords: [],
      preferredCategories: [],
      interactionSummary: summary,
      explanations: {
        weighting: `Signals use fixed weights: VIEW=${BEHAVIOUR_EVENT_WEIGHTS.VACANCY_VIEWED}, SAVE=${BEHAVIOUR_EVENT_WEIGHTS.VACANCY_SAVED}, APPLY=${BEHAVIOUR_EVENT_WEIGHTS.VACANCY_APPLIED} (summed per vacancy).`,
        categories:
          'No vacancy ids from events. Categories would come from keyword rules on vacancy text when events exist.',
        skills: 'No vacancy-linked interactions in the scanned window.',
      },
    }
  }

  const ids = [...vacancyWeight.keys()].map((id) => new mongoose.Types.ObjectId(id))
  const vacancies = await Vacancy.find({ _id: { $in: ids } })
    .select('title skillsRequired description')
    .lean()

  const skillScores = new Map<string, number>()
  const keywordScores = new Map<string, number>()
  const categoryScores = new Map<string, number>()

  for (const doc of vacancies as {
    _id: mongoose.Types.ObjectId
    title?: string
    skillsRequired?: string
    description?: string
  }[]) {
    const vid = String(doc._id)
    const w = vacancyWeight.get(vid) ?? 0
    if (w <= 0) continue

    const title = String(doc.title ?? '')
    const skillsRequired = String(doc.skillsRequired ?? '')
    const description = String(doc.description ?? '')

    for (const skill of splitVacancySkillPhrases(skillsRequired)) {
      skillScores.set(skill, (skillScores.get(skill) ?? 0) + w)
    }

    for (const kw of splitVacancyTitleWords(title)) {
      keywordScores.set(kw, (keywordScores.get(kw) ?? 0) + w * 0.75)
    }
    for (const phrase of splitVacancySkillPhrases(skillsRequired)) {
      if (phrase.includes(' ')) {
        keywordScores.set(phrase, (keywordScores.get(phrase) ?? 0) + w)
      }
    }

    const hay = buildVacancyHaystack({ title, skillsRequired, description })
    for (const [cat, score] of scoreCategories(hay)) {
      categoryScores.set(cat, (categoryScores.get(cat) ?? 0) + score * w)
    }
  }

  const preferredSkills = topKeysByScore(skillScores, maxSkills)
  const preferredKeywords = topKeysByScore(keywordScores, maxKeywords)
  const preferredCategories = topKeysByScore(categoryScores, maxCategories)

  const weightingExplain = `Per-event weights summed by vacancy: VIEW=${BEHAVIOUR_EVENT_WEIGHTS.VACANCY_VIEWED}, SAVE=${BEHAVIOUR_EVENT_WEIGHTS.VACANCY_SAVED}, APPLY=${BEHAVIOUR_EVENT_WEIGHTS.VACANCY_APPLIED}. UNSAVE is ignored for positive preferences. Scanned up to ${maxEvents} recent events.`

  return {
    preferredSkills,
    preferredKeywords,
    preferredCategories,
    interactionSummary: summary,
    explanations: {
      weighting: weightingExplain,
      categories:
        'Vacancy has no category column; preferredCategories are keyword buckets (frontend, backend, ai_ml, mobile, devops, data) matched in title/skills/description.',
      skills:
        'preferredSkills come from comma-split skillsRequired on vacancies tied to your views/saves/applies, ranked by weighted frequency.',
    },
  }
}
