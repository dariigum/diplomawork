/**
 * Offline recommendation evaluation from real MongoDB interaction data.
 * Run: npm run eval:recommendations
 */

import './bootstrap-demo-env'

import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'

import dbConnect from '../lib/db/mongoose'
import { getActiveResumeLeanForUser } from '../lib/active-resume'
import { getTopRecommendations } from '../lib/recommendation'
import {
  Response,
  SavedVacancy,
  User,
  VacancyBehaviourEvent,
  type VacancyBehaviourEventType,
} from '../lib/db/schema'
import type { RecommendationEvalResults } from '../lib/recommendation-eval-results'

const TOP_K = 10
const HOLDOUT_FRACTION = 0.2
const RESULTS_PATH = path.join(process.cwd(), 'scripts', 'eval-results.json')

const GROUND_TRUTH_EVENT_TYPES: VacancyBehaviourEventType[] = ['VACANCY_SAVED', 'VACANCY_APPLIED']

const METHODOLOGY_OK = [
  'Offline evaluation on EMPLOYEE users with an active resume embedding and at least one holdout relevant vacancy.',
  'Ground-truth relevance: union of saved vacancies (SavedVacancy), job applications (Response), and behaviour events VACANCY_SAVED / VACANCY_APPLIED.',
  'Holdout: most recent 20% of relevant vacancies per user (minimum 1) excluded from behaviour profile when ranking; metrics computed on holdout only.',
  'Recommendations: production getTopRecommendations hybrid rank (semantic cosine + behaviour), top 10.',
  'Per user: Precision@10 = |recommended∩holdout|/10; Recall@10 = |recommended∩holdout|/|holdout|.',
  'Reported values: arithmetic mean across evaluated users.',
].join(' ')

const METHODOLOGY_INSUFFICIENT = [
  'Evaluation could not be computed: no eligible EMPLOYEE users met all requirements',
  '(active resume embedding, ≥1 holdout relevant vacancy, recommendable vacancy corpus).',
  'Populate real interactions (save/apply) and embeddings, then re-run npm run eval:recommendations.',
].join(' ')

type RelevantItem = {
  vacancyId: string
  occurredAt: Date
}

function dedupeRelevant(items: RelevantItem[]): RelevantItem[] {
  const byId = new Map<string, RelevantItem>()
  for (const item of items) {
    const prev = byId.get(item.vacancyId)
    if (!prev || item.occurredAt.getTime() > prev.occurredAt.getTime()) {
      byId.set(item.vacancyId, item)
    }
  }
  return [...byId.values()]
}

async function collectRelevantItems(userId: string): Promise<RelevantItem[]> {
  const uid = new mongoose.Types.ObjectId(userId)
  const items: RelevantItem[] = []

  const saved = await SavedVacancy.find({ userId: uid }).select('vacancyId').lean()
  for (const row of saved) {
    items.push({
      vacancyId: String(row.vacancyId),
      occurredAt: new Date(0),
    })
  }

  const responses = await Response.find({ userId: uid }).select('vacancyId createdAt').lean()
  for (const row of responses) {
    items.push({
      vacancyId: String(row.vacancyId),
      occurredAt: row.createdAt instanceof Date ? row.createdAt : new Date(),
    })
  }

  const events = await VacancyBehaviourEvent.find({
    userId: uid,
    eventType: { $in: GROUND_TRUTH_EVENT_TYPES },
  })
    .select('vacancyId occurredAt')
    .lean()

  for (const row of events) {
    items.push({
      vacancyId: String(row.vacancyId),
      occurredAt: row.occurredAt instanceof Date ? row.occurredAt : new Date(),
    })
  }

  return dedupeRelevant(items)
}

function splitHoldout(all: RelevantItem[]): Set<string> {
  if (all.length === 0) return new Set()
  const sorted = [...all].sort((a, b) => {
    const dt = b.occurredAt.getTime() - a.occurredAt.getTime()
    if (dt !== 0) return dt
    return a.vacancyId.localeCompare(b.vacancyId)
  })
  const holdoutCount = Math.max(1, Math.ceil(sorted.length * HOLDOUT_FRACTION))
  return new Set(sorted.slice(0, holdoutCount).map((item) => item.vacancyId))
}

async function userHasActiveResumeEmbedding(userId: string): Promise<boolean> {
  const resume = (await getActiveResumeLeanForUser(userId)) as { embedding?: number[] } | null
  return Boolean(resume && Array.isArray(resume.embedding) && resume.embedding.length > 0)
}

function writeResults(results: RecommendationEvalResults): void {
  fs.writeFileSync(RESULTS_PATH, `${JSON.stringify(results, null, 2)}\n`, 'utf8')
}

async function main(): Promise<void> {
  await dbConnect()

  const employees = await User.find({ role: 'EMPLOYEE' }).select('_id').lean()
  const perUserPrecision: number[] = []
  const perUserRecall: number[] = []
  let skippedNoResume = 0
  let skippedNoRelevant = 0
  let skippedNoHoldout = 0

  for (const user of employees) {
    const userId = String(user._id)

    if (!(await userHasActiveResumeEmbedding(userId))) {
      skippedNoResume += 1
      continue
    }

    const relevant = await collectRelevantItems(userId)
    if (relevant.length === 0) {
      skippedNoRelevant += 1
      continue
    }

    const holdout = splitHoldout(relevant)
    if (holdout.size === 0) {
      skippedNoHoldout += 1
      continue
    }

    const recommendations = await getTopRecommendations({
      userId,
      limit: TOP_K,
      excludeVacancyIdsFromBehaviour: [...holdout],
    })

    const recommendedIds = recommendations.map((r) => r.vacancyId)
    const hits = recommendedIds.filter((id) => holdout.has(id)).length

    perUserPrecision.push(hits / TOP_K)
    perUserRecall.push(hits / holdout.size)
  }

  const evaluatedUsers = perUserPrecision.length
  const generatedAt = new Date().toISOString()

  if (evaluatedUsers === 0) {
    const insufficient: RecommendationEvalResults = {
      precisionAt10: null,
      recallAt10: null,
      evaluatedUsers: 0,
      generatedAt,
      methodology: METHODOLOGY_INSUFFICIENT,
    }
    writeResults(insufficient)
    console.log('[eval:recommendations] Insufficient data — no users evaluated.')
    console.log(
      `[eval:recommendations] Skipped: no resume embedding=${skippedNoResume}, no relevant=${skippedNoRelevant}, no holdout=${skippedNoHoldout}`,
    )
    return
  }

  const precisionAt10 =
    perUserPrecision.reduce((sum, v) => sum + v, 0) / evaluatedUsers
  const recallAt10 = perUserRecall.reduce((sum, v) => sum + v, 0) / evaluatedUsers

  const results: RecommendationEvalResults = {
    precisionAt10: Number(precisionAt10.toFixed(6)),
    recallAt10: Number(recallAt10.toFixed(6)),
    evaluatedUsers,
    generatedAt,
    methodology: METHODOLOGY_OK,
  }

  writeResults(results)
  console.log('[eval:recommendations] Evaluation complete.')
  console.log(JSON.stringify(results, null, 2))
  console.log(
    `[eval:recommendations] Skipped: no resume embedding=${skippedNoResume}, no relevant=${skippedNoRelevant}, no holdout=${skippedNoHoldout}`,
  )
}

main()
  .catch((error) => {
    console.error('[eval:recommendations] Fatal:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {})
  })
