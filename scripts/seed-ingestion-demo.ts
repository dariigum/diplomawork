/**
 * Offline ingestion demo seed — uses the SAME pipeline as production ingestion:
 * validate → Mongo upsert (source SEED + externalId) → getEmbedding → save when ML is up.
 *
 * Prerequisite for recommendation smoke: run `npm run seed:demo` once so the demo employee + resume exist.
 *
 * Usage:
 *   npm run ingestion:demo
 *   npm run ingestion:demo -- --skip-clear   (append new SEED rows without deleting old SEED — not usually needed)
 */

import './bootstrap-demo-env'

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'

import { DEMO_EMPLOYEE_EMAIL } from '../lib/demo/seed-fixtures'
import dbConnect from '../lib/db/mongoose'
import { User, Vacancy, Response, SavedVacancy, VacancyBehaviourEvent } from '../lib/db/schema'
import { persistIngestionVacancyWithEmbedding } from '../lib/job-ingestion/embeddings/persist-with-embedding'
import { loadOfflineDemoVacancyInputs } from '../lib/job-ingestion/mock/load-offline-demo-dataset'
import { getTopRecommendations } from '../lib/recommendation'

const SKIP_CLEAR = process.argv.includes('--skip-clear')

async function clearPreviousSeededIngestion() {
  const vacancies = await Vacancy.find({ source: 'SEED' }).select('_id employerId').lean()
  const ids = vacancies.map((v) => v._id)
  const employerIdStrings = [...new Set(vacancies.map((v) => String(v.employerId)))]

  if (ids.length === 0) {
    console.log('[ingestion:demo] No prior SEED vacancies to remove.')
  } else {
    await Response.deleteMany({ vacancyId: { $in: ids } })
    await SavedVacancy.deleteMany({ vacancyId: { $in: ids } })
    await VacancyBehaviourEvent.deleteMany({ vacancyId: { $in: ids } })
    await Vacancy.deleteMany({ _id: { $in: ids } })
    console.log(`[ingestion:demo] Removed ${ids.length} SEED vacancy row(s).`)
  }

  for (const empHex of employerIdStrings) {
    const empId = new mongoose.Types.ObjectId(empHex)
    const remaining = await Vacancy.countDocuments({ employerId: empId })
    if (remaining > 0) continue
    const res = await User.deleteOne({
      _id: empId,
      email: { $regex: /^ing\+.*@jobflow\.ingestion$/ },
    })
    if (res.deletedCount) {
      console.log(`[ingestion:demo] Removed orphan synthetic employer ${empHex}`)
    }
  }
}

async function main() {
  console.log('[ingestion:demo] Starting…')
  await dbConnect()

  if (!SKIP_CLEAR) {
    await clearPreviousSeededIngestion()
  } else {
    console.log('[ingestion:demo] --skip-clear: not removing prior SEED rows.')
  }

  const pwd = process.env.INGESTION_EMPLOYER_PASSWORD?.trim() || 'jobflow-ingestion-employer-dev'
  const passwordHash = await bcrypt.hash(pwd, 10)

  const rows = loadOfflineDemoVacancyInputs()
  let embedded = 0
  let embeddingFailed = 0
  let embeddingSkipped = 0
  let persistFail = 0

  for (const row of rows) {
    const res = await persistIngestionVacancyWithEmbedding(row, passwordHash)
    if (!res.ok) {
      persistFail += 1
      console.warn('[ingestion:demo] Persist failed:', res.persist.error)
      continue
    }
    if (res.embedding.status === 'embedded') embedded += 1
    else if (res.embedding.status === 'failed') embeddingFailed += 1
    else if (res.embedding.status === 'skipped') embeddingSkipped += 1

    console.log(
      `[ingestion:demo] ${row.externalId} → persist ${res.persistCreated ? 'created' : 'updated'}, embedding=${res.embedding.status}`,
    )
  }

  console.log(
    `[ingestion:demo] Summary: rows=${rows.length}, persistFail=${persistFail}, embedded=${embedded}, embeddingFailed=${embeddingFailed}, embeddingSkipped=${embeddingSkipped}`,
  )

  const seeker = await User.findOne({ email: DEMO_EMPLOYEE_EMAIL }).lean()
  if (seeker?._id) {
    try {
      const recs = await getTopRecommendations({ userId: String(seeker._id), limit: 8 })
      console.log(`[ingestion:demo] Recommendation smoke (getTopRecommendations): ${recs.length} row(s).`)
    } catch (e) {
      console.warn('[ingestion:demo] Recommendation smoke failed:', e instanceof Error ? e.message : e)
    }
  } else {
    console.log(
      `[ingestion:demo] No ${DEMO_EMPLOYEE_EMAIL} — run "npm run seed:demo" first for the full demo loop (resume + recommendations).`,
    )
  }

  console.log('[ingestion:demo] Done.')
}

main()
  .catch((e) => {
    console.error('[ingestion:demo] Fatal:', e)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {})
  })
