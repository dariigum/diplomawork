/**
 * Evaluation cohort seed — 50 EMPLOYEE users @eval.jobflow.local, 105 EVAL vacancies, interactions.
 *
 * Prerequisites (recommended):
 *   npm run seed:demo
 *   npm run ingestion:demo
 *   (ML embedding service running)
 *
 * Usage:
 *   npm run seed:eval-cohort
 *   npm run seed:eval-cohort -- --skip-clear
 */

import './bootstrap-demo-env'

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

import dbConnect from '../lib/db/mongoose'
import { buildResumeEmbeddingText, buildVacancyEmbeddingText } from '../lib/embedding-text'
import {
  DEFAULT_EVAL_COHORT_PASSWORD,
  EVAL_EMAIL_DOMAIN,
  EVAL_EMPLOYER_EMAIL,
  EVAL_EMPLOYEE_FIXTURES,
  TARGET_EVAL_USER_COUNT,
} from '../lib/demo/eval-cohort-fixtures'
import {
  countGroundTruthVacancies,
  getEvalCohortInteractionPlans,
  summarizeEvalCohortInteractionPlans,
} from '../lib/demo/eval-cohort-interactions'
import {
  EVAL_COHORT_VACANCIES,
  TARGET_EVAL_VACANCY_COUNT,
} from '../lib/demo/eval-cohort-vacancies'
import { getEmbedding } from '../lib/ml'
import { getTopRecommendations } from '../lib/recommendation'
import {
  Response,
  Resume,
  SavedVacancy,
  User,
  Vacancy,
  VacancyBehaviourEvent,
} from '../lib/db/schema'

const SKIP_CLEAR = process.argv.includes('--skip-clear')
const MIN_CORPUS_EMBEDDINGS = 80

function evalEmailRegex(): RegExp {
  return new RegExp(`@${EVAL_EMAIL_DOMAIN.replace(/\./g, '\\.')}$`)
}

function daysAgoToDate(daysAgo: number): Date {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - daysAgo)
  d.setUTCHours(12, 0, 0, 0)
  return d
}

async function clearEvalCohortData(): Promise<void> {
  const emailRegex = evalEmailRegex()
  const evalUsers = await User.find({ email: { $regex: emailRegex } }).select('_id').lean()
  const evalUserIds = evalUsers.map((u) => u._id)

  if (evalUserIds.length > 0) {
    await Response.deleteMany({ userId: { $in: evalUserIds } })
    await SavedVacancy.deleteMany({ userId: { $in: evalUserIds } })
    await VacancyBehaviourEvent.deleteMany({ userId: { $in: evalUserIds } })
    await Resume.deleteMany({ userId: { $in: evalUserIds } })
    await User.deleteMany({ _id: { $in: evalUserIds } })
    console.log(`[seed:eval-cohort] Removed ${evalUserIds.length} eval user(s) and related rows.`)
  } else {
    console.log(`[seed:eval-cohort] No prior eval users (${EVAL_EMAIL_DOMAIN}).`)
  }

  const evalVacancies = await Vacancy.find({ source: 'EVAL' }).select('_id').lean()
  const evalVacancyIds = evalVacancies.map((v) => v._id)
  if (evalVacancyIds.length > 0) {
    await Response.deleteMany({ vacancyId: { $in: evalVacancyIds } })
    await SavedVacancy.deleteMany({ vacancyId: { $in: evalVacancyIds } })
    await VacancyBehaviourEvent.deleteMany({ vacancyId: { $in: evalVacancyIds } })
    await Vacancy.deleteMany({ _id: { $in: evalVacancyIds } })
    console.log(`[seed:eval-cohort] Removed ${evalVacancyIds.length} EVAL vacancy row(s).`)
  }
}

async function resolveVacancyKeyMap(): Promise<Map<string, mongoose.Types.ObjectId>> {
  const map = new Map<string, mongoose.Types.ObjectId>()
  const rows = await Vacancy.find({
    $or: [{ source: 'EVAL' }, { source: 'SEED' }],
  })
    .select('_id source externalId')
    .lean()

  for (const row of rows) {
    const externalId = typeof row.externalId === 'string' ? row.externalId.trim() : ''
    if (!externalId) continue
    const id = row._id as mongoose.Types.ObjectId
    map.set(externalId, id)
    const source = typeof row.source === 'string' ? row.source : ''
    if (source) map.set(`${source}:${externalId}`, id)
  }

  return map
}

async function upsertEvalVacancies(employerId: mongoose.Types.ObjectId): Promise<{
  embeddedOk: number
  embeddedFail: number
}> {
  let embeddedOk = 0
  let embeddedFail = 0

  for (const row of EVAL_COHORT_VACANCIES) {
    let embedding: number[] | undefined
    try {
      const text = buildVacancyEmbeddingText({
        title: row.title,
        description: row.description,
        skillsRequired: row.skillsRequired,
        requirements: row.requirements,
        responsibilities: row.responsibilities,
      })
      embedding = await getEmbedding(text)
      embeddedOk++
    } catch (e) {
      embeddedFail++
      console.warn(
        `[seed:eval-cohort] Embedding skipped → ${row.externalId}:`,
        e instanceof Error ? e.message : e,
      )
    }

    await Vacancy.findOneAndUpdate(
      { source: 'EVAL', externalId: row.externalId },
      {
        $set: {
          employerId,
          title: row.title,
          description: row.description,
          skillsRequired: row.skillsRequired,
          salaryMin: row.salaryMin,
          salaryMax: row.salaryMax,
          experience: row.experience,
          employmentType: row.employmentType,
          workMode: row.workMode,
          country: row.country,
          city: row.city,
          address: row.address,
          requirements: row.requirements,
          responsibilities: row.responsibilities,
          source: 'EVAL',
          externalId: row.externalId,
          sourceUrl: `https://eval.jobflow.local/vacancy/${row.externalId}`,
          ...(embedding && embedding.length > 0 ? { embedding } : {}),
        },
      },
      { upsert: true, returnDocument: 'after' },
    )
  }

  return { embeddedOk, embeddedFail }
}

async function main(): Promise<void> {
  console.log('[seed:eval-cohort] Starting…')
  await dbConnect()

  if (!SKIP_CLEAR) {
    await clearEvalCohortData()
  } else {
    console.log('[seed:eval-cohort] --skip-clear: not removing existing eval cohort.')
  }

  const corpusEmbeddings = await Vacancy.countDocuments({
    embedding: { $exists: true, $ne: null },
  })
  if (corpusEmbeddings < MIN_CORPUS_EMBEDDINGS) {
    console.warn(
      `[seed:eval-cohort] Warning: only ${corpusEmbeddings} vacancies with embeddings in DB (recommended ≥${MIN_CORPUS_EMBEDDINGS}).`,
    )
    console.warn('[seed:eval-cohort] Run: npm run seed:demo && npm run ingestion:demo first.')
  }

  const password =
    process.env.JOBFLOW_EVAL_COHORT_PASSWORD?.trim() || DEFAULT_EVAL_COHORT_PASSWORD
  const passwordHash = await bcrypt.hash(password, 10)

  let employer = await User.findOne({ email: EVAL_EMPLOYER_EMAIL })
  if (!employer) {
    employer = await User.create({
      email: EVAL_EMPLOYER_EMAIL,
      passwordHash,
      name: 'JobFlow Eval Cohort Employer',
      role: 'EMPLOYER',
      industry: 'Technology',
      description: 'Synthetic employer for evaluation dataset vacancies.',
      location: 'Remote',
      logoUrl: 'EV',
    })
    console.log(`[seed:eval-cohort] Created eval employer: ${EVAL_EMPLOYER_EMAIL}`)
  }

  const { embeddedOk, embeddedFail } = await upsertEvalVacancies(employer._id)
  console.log(
    `[seed:eval-cohort] EVAL vacancies upserted: ${EVAL_COHORT_VACANCIES.length}, embeddings ok=${embeddedOk}, fail=${embeddedFail}`,
  )

  const userIdByKey = new Map<string, string>()
  let resumesEmbedded = 0
  let resumesFailed = 0

  for (const fixture of EVAL_EMPLOYEE_FIXTURES) {
    let user = await User.findOne({ email: fixture.email })
    if (!user) {
      user = await User.create({
        email: fixture.email,
        passwordHash,
        name: fixture.name,
        role: 'EMPLOYEE',
      })
    } else {
      user.passwordHash = passwordHash
      await user.save()
    }
    userIdByKey.set(fixture.key, user._id.toString())

    await Resume.deleteMany({ userId: user._id })

    let resumeEmbedding: number[] | undefined
    try {
      const resumeText = buildResumeEmbeddingText(fixture.resume)
      resumeEmbedding = await getEmbedding(resumeText)
      resumesEmbedded++
    } catch (e) {
      resumesFailed++
      console.warn(
        `[seed:eval-cohort] Resume embedding failed for ${fixture.key}:`,
        e instanceof Error ? e.message : e,
      )
    }

    await Resume.create({
      userId: user._id,
      title: fixture.resume.title,
      skills: fixture.resume.skills,
      experience: fixture.resume.experience,
      education: fixture.resume.education,
      activeForAi: true,
      ...(resumeEmbedding && resumeEmbedding.length > 0 ? { embedding: resumeEmbedding } : {}),
    })
  }

  console.log(
    `[seed:eval-cohort] Employees: ${EVAL_EMPLOYEE_FIXTURES.length}, resume embeddings ok=${resumesEmbedded}, fail=${resumesFailed}`,
  )

  const vacancyMap = await resolveVacancyKeyMap()
  const plans = getEvalCohortInteractionPlans()
  const gtSummary = summarizeEvalCohortInteractionPlans()
  console.log(
    `[seed:eval-cohort] Interaction plans: users=${gtSummary.users}, GT/user min=${gtSummary.minGt} max=${gtSummary.maxGt}, planned behaviour events=${gtSummary.behaviourEvents}`,
  )

  if (EVAL_EMPLOYEE_FIXTURES.length !== TARGET_EVAL_USER_COUNT) {
    console.warn(
      `[seed:eval-cohort] Expected ${TARGET_EVAL_USER_COUNT} fixtures, got ${EVAL_EMPLOYEE_FIXTURES.length}.`,
    )
  }
  if (EVAL_COHORT_VACANCIES.length !== TARGET_EVAL_VACANCY_COUNT) {
    console.warn(
      `[seed:eval-cohort] Expected ${TARGET_EVAL_VACANCY_COUNT} EVAL vacancies, got ${EVAL_COHORT_VACANCIES.length}.`,
    )
  }

  let savedCount = 0
  let responseCount = 0
  let eventCount = 0
  let missingKeys = 0

  for (const plan of plans) {
    const userId = userIdByKey.get(plan.userKey)
    if (!userId) continue
    const uid = new mongoose.Types.ObjectId(userId)
    const resume = await Resume.findOne({ userId: uid, activeForAi: true }).select('_id').lean()
    if (!resume?._id) {
      console.warn(`[seed:eval-cohort] No active resume for ${plan.userKey}`)
      continue
    }

    for (const key of plan.savedVacancyKeys) {
      const vacancyId = vacancyMap.get(key)
      if (!vacancyId) {
        missingKeys++
        console.warn(`[seed:eval-cohort] Missing vacancy for save: ${key} (${plan.userKey})`)
        continue
      }
      await SavedVacancy.findOneAndUpdate(
        { userId: uid, vacancyId },
        { $setOnInsert: { userId: uid, vacancyId } },
        { upsert: true },
      )
      savedCount++
    }

    for (const row of plan.responses) {
      const vacancyId = vacancyMap.get(row.vacancyKey)
      if (!vacancyId) {
        missingKeys++
        console.warn(`[seed:eval-cohort] Missing vacancy for response: ${row.vacancyKey}`)
        continue
      }
      const createdAt = daysAgoToDate(row.daysAgo)
      const existing = await Response.findOne({ userId: uid, vacancyId }).lean()
      if (existing) {
        await Response.updateOne({ _id: existing._id }, { $set: { createdAt } })
      } else {
        await Response.create({
          userId: uid,
          vacancyId,
          resumeId: resume._id,
          status: 'PENDING',
          createdAt,
        })
      }
      responseCount++
    }

    for (const row of plan.events) {
      const vacancyId = vacancyMap.get(row.vacancyKey)
      if (!vacancyId) {
        missingKeys++
        console.warn(`[seed:eval-cohort] Missing vacancy for event: ${row.vacancyKey}`)
        continue
      }
      const occurredAt = daysAgoToDate(row.daysAgo)
      await VacancyBehaviourEvent.create({
        userId: uid,
        vacancyId,
        eventType: row.eventType,
        occurredAt,
        source: 'eval-seed',
      })
      eventCount++
    }

    const gt = countGroundTruthVacancies(plan)
    if (gt < 5) {
      console.warn(`[seed:eval-cohort] Low GT count for ${plan.userKey}: ${gt} (need ≥5)`)
    }
  }

  if (missingKeys > 0) {
    console.warn(
      `[seed:eval-cohort] ${missingKeys} interaction reference(s) skipped — run ingestion:demo for SEED keys.`,
    )
  }

  const evalUserIds = [...userIdByKey.values()].map((id) => new mongoose.Types.ObjectId(id))

  console.log('[seed:eval-cohort] ── Verification ──')
  console.log(`[seed:eval-cohort] Eval users: ${evalUserIds.length}`)
  console.log(
    `[seed:eval-cohort] Eval resumes (activeForAi): ${await Resume.countDocuments({
      userId: { $in: evalUserIds },
      activeForAi: true,
    })}`,
  )
  console.log(
    `[seed:eval-cohort] Eval resumes with embedding: ${await Resume.countDocuments({
      userId: { $in: evalUserIds },
      activeForAi: true,
      embedding: { $exists: true, $ne: null },
    })}`,
  )
  console.log(`[seed:eval-cohort] EVAL vacancies: ${await Vacancy.countDocuments({ source: 'EVAL' })}`)
  console.log(
    `[seed:eval-cohort] All vacancies with embedding (corpus): ${await Vacancy.countDocuments({
      embedding: { $exists: true, $ne: null },
    })}`,
  )
  console.log(
    `[seed:eval-cohort] Eval saved vacancies: ${await SavedVacancy.countDocuments({
      userId: { $in: evalUserIds },
    })}`,
  )
  console.log(
    `[seed:eval-cohort] Eval responses: ${await Response.countDocuments({
      userId: { $in: evalUserIds },
    })}`,
  )
  console.log(
    `[seed:eval-cohort] Eval behaviour events: ${await VacancyBehaviourEvent.countDocuments({
      userId: { $in: evalUserIds },
    })}`,
  )

  const smokeKeys = [
    EVAL_EMPLOYEE_FIXTURES[0]!.key,
    EVAL_EMPLOYEE_FIXTURES[Math.floor(EVAL_EMPLOYEE_FIXTURES.length / 2)]!.key,
    EVAL_EMPLOYEE_FIXTURES[EVAL_EMPLOYEE_FIXTURES.length - 1]!.key,
  ]
  for (const key of smokeKeys) {
    const userId = userIdByKey.get(key)
    if (!userId) continue
    try {
      const recs = await getTopRecommendations({ userId, limit: 10 })
      console.log(
        `[seed:eval-cohort] Smoke getTopRecommendations(${key}): ${recs.length} recommendation(s).`,
      )
      if (recs[0]) {
        console.log(
          `[seed:eval-cohort]   Top: "${recs[0].title}" final=${recs[0].finalScore.toFixed(4)} semantic=${recs[0].semanticScore.toFixed(4)}`,
        )
      }
    } catch (e) {
      console.warn(
        `[seed:eval-cohort] Smoke failed for ${key}:`,
        e instanceof Error ? e.message : e,
      )
    }
  }

  console.log('[seed:eval-cohort] Done.')
}

main()
  .catch((e) => {
    console.error('[seed:eval-cohort] Fatal:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {})
  })
