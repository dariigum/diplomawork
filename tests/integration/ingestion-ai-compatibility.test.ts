/**
 * Stage 6F — ingestion ↔ AI ecosystem compatibility (regression guard).
 *
 * Verifies SEED ingestion vacancies (same pipeline as production) participate in:
 * - getTopRecommendations
 * - rankVacanciesBySemanticQueryFromEmbedding (semantic search core)
 * - extractSemanticConceptsFromVacancies
 * - behaviour analytics (recordVacancyBehaviourEvent + buildBehaviourAnalytics)
 *
 * Does not change ranking formulas — only asserts integration invariants.
 */

import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildBehaviourAnalytics } from '@/lib/behaviour-analytics'
import { persistIngestionVacancyWithEmbedding } from '@/lib/job-ingestion/embeddings/persist-with-embedding'
import { loadOfflineDemoVacancyInputs } from '@/lib/job-ingestion/mock/load-offline-demo-dataset'
import { getTopRecommendations } from '@/lib/recommendation'
import { rankVacanciesBySemanticQueryFromEmbedding, type SemanticVacancyInput } from '@/lib/semantic-job-search'
import { extractSemanticConceptsFromVacancies } from '@/lib/semantic-search-concepts'
import { recordVacancyBehaviourEvent } from '@/lib/vacancy-behaviour-events'
import { Resume, User, Vacancy, VacancyBehaviourEvent } from '@/lib/db/schema'

let mongoServer: MongoMemoryServer
let passwordHash: string

/** Shared 8-D embedding so cosineSimilarity with resume is non-zero (matches mocked ML). */
function compatEmbedding(): number[] {
  return [1, 0, 0, 0, 0, 0, 0, 0.05]
}

function patchMongooseGlobalCache() {
  const g = ((global as unknown as { mongoose?: { conn: unknown; promise: unknown } }).mongoose ??= {
    conn: null,
    promise: null,
  })
  g.conn = mongoose
  g.promise = Promise.resolve(mongoose)
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'ingestion_ai_compat_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchMongooseGlobalCache()
  passwordHash = await bcrypt.hash('ingestion-ai-compat', 4)
})

beforeEach(async () => {
  await VacancyBehaviourEvent.deleteMany({})
  await Resume.deleteMany({})
  await Vacancy.deleteMany({})
  await User.deleteMany({})
  vi.restoreAllMocks()
})

afterAll(async () => {
  await mongoose.disconnect()
  const g = (global as unknown as { mongoose?: { conn: unknown; promise: unknown } }).mongoose
  if (g) {
    g.conn = null
    g.promise = null
  }
  await mongoServer.stop()
})

describe('ingestion AI compatibility (MongoMemoryServer)', () => {
  async function seedSeekerWithResume(userId: mongoose.Types.ObjectId) {
    await Resume.create({
      userId,
      title: 'ML-aware full-stack engineer',
      skills: 'Python, TypeScript, React, vector search, observability',
      experience: 'Ships ranking features and evaluates retrieval quality with offline metrics.',
      education: 'MS Computer Science',
      activeForAi: true,
      embedding: compatEmbedding(),
    })
  }

  it('ingestion SEED vacancies appear in getTopRecommendations alongside manual vacancies', async () => {
    const mockEmb = vi.fn(async () => compatEmbedding())

    const seeker = await User.create({
      email: 'ai-compat-seeker@demo.jobflow.local',
      passwordHash,
      name: 'Seeker',
      role: 'EMPLOYEE',
    })
    await seedSeekerWithResume(seeker._id as mongoose.Types.ObjectId)

    const manualEmployer = await User.create({
      email: 'ai-compat-manual-emp@example.com',
      passwordHash,
      name: 'Manual Corp',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: manualEmployer._id,
      title: 'Manual-only vacancy for coexistence check',
      description:
        'This manual row has no ingestion source fields and must still receive recommendations context safely.',
      skillsRequired: 'Spreadsheets',
      salaryMin: 1,
      salaryMax: 2,
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      city: 'X',
      address: 'Remote',
      embedding: compatEmbedding(),
    })

    const subset = loadOfflineDemoVacancyInputs().slice(0, 3)
    for (const row of subset) {
      const res = await persistIngestionVacancyWithEmbedding(row, passwordHash, { getEmbedding: mockEmb })
      expect(res.ok).toBe(true)
      if (!res.ok) return
      expect(res.embedding.status).toBe('embedded')
    }

    const recs1 = await getTopRecommendations({ userId: String(seeker._id), limit: 20 })
    const recs2 = await getTopRecommendations({ userId: String(seeker._id), limit: 20 })

    expect(recs1.length).toBeGreaterThan(0)
    expect(recs1.map((r) => r.vacancyId)).toEqual(recs2.map((r) => r.vacancyId))

    const titles = recs1.map((r) => r.title).join(' | ')
    const hasIngestion = subset.some((s) => titles.includes(s.title))
    expect(hasIngestion).toBe(true)
    expect(titles).toContain('Manual-only vacancy for coexistence check')
  })

  it('semantic ranking includes ingestion rows with valid embeddings and excludes empty vectors', async () => {
    const mockEmb = vi.fn(async () => compatEmbedding())
    const rows = loadOfflineDemoVacancyInputs().slice(0, 2)
    for (const row of rows) {
      const res = await persistIngestionVacancyWithEmbedding(row, passwordHash, { getEmbedding: mockEmb })
      expect(res.ok).toBe(true)
    }

    await Vacancy.create({
      employerId: (await User.create({
        email: 'orphan-emp@example.com',
        passwordHash,
        name: 'O',
        role: 'EMPLOYER',
      }))._id,
      source: 'SEED',
      externalId: 'SEED:no-embedding-row',
      title: 'Should not rank semantically',
      description: 'This row intentionally has no embedding vector after create.',
      skillsRequired: 'None',
      salaryMin: 0,
      salaryMax: 0,
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      city: 'Y',
      address: 'Remote',
    })

    const docs = await Vacancy.find({ embedding: { $exists: true, $ne: null } })
      .populate('employerId', 'name')
      .lean()

    const noEmb = await Vacancy.findOne({ externalId: 'SEED:no-embedding-row' }).lean()
    expect(noEmb).toBeTruthy()
    const emb = (noEmb as { embedding?: unknown }).embedding
    expect(emb == null || (Array.isArray(emb) && emb.length === 0)).toBe(true)

    const ranked = rankVacanciesBySemanticQueryFromEmbedding({
      queryEmbedding: compatEmbedding(),
      vacancies: docs as SemanticVacancyInput[],
      limit: 50,
    })

    const rankedIds = new Set(ranked.map((r) => r.vacancyId))
    expect(rankedIds.has(String(noEmb!._id))).toBe(false)

    const seeded = await Vacancy.find({ source: 'SEED', externalId: rows[0].externalId }).lean()
    expect(seeded[0]).toBeTruthy()
    expect(rankedIds.has(String(seeded[0]!._id))).toBe(true)
  })

  it('semantic concepts extract from ingestion-shaped vacancy text', () => {
    const v = loadOfflineDemoVacancyInputs()[0]
    const concepts = extractSemanticConceptsFromVacancies([
      { title: v.title, skillsRequired: v.skillsRequired, description: v.description },
    ])
    expect(concepts.length).toBeGreaterThan(0)
    const labels = concepts.map((c) => c.concept.toLowerCase())
    expect(labels.some((l) => l.includes('python') || l.includes('react') || l.includes('typescript'))).toBe(true)
  })

  it('behaviour analytics sees events on ingestion vacancies', async () => {
    const mockEmb = vi.fn(async () => compatEmbedding())
    const row = loadOfflineDemoVacancyInputs()[0]
    const res = await persistIngestionVacancyWithEmbedding(row, passwordHash, { getEmbedding: mockEmb })
    expect(res.ok).toBe(true)
    if (!res.ok) return

    const seeker = await User.create({
      email: 'ai-compat-behaviour@demo.jobflow.local',
      passwordHash,
      name: 'Seeker B',
      role: 'EMPLOYEE',
    })

    await recordVacancyBehaviourEvent({
      userId: String(seeker._id),
      vacancyId: res.recordId,
      eventType: 'VACANCY_VIEWED',
      source: 'ingestion_compat_test',
    })

    const snap = await buildBehaviourAnalytics(String(seeker._id))
    expect(snap.windows.allTime.viewed).toBeGreaterThanOrEqual(1)
  })

  it('repeated persist does not duplicate SEED vacancies', async () => {
    const mockEmb = vi.fn(async () => compatEmbedding())
    const row = loadOfflineDemoVacancyInputs()[4]
    const a = await persistIngestionVacancyWithEmbedding(row, passwordHash, { getEmbedding: mockEmb })
    const b = await persistIngestionVacancyWithEmbedding(row, passwordHash, { getEmbedding: mockEmb })
    expect(a.ok && b.ok).toBe(true)
    if (!a.ok || !b.ok) return
    expect(a.recordId).toBe(b.recordId)
    expect(await Vacancy.countDocuments({ source: 'SEED', externalId: row.externalId })).toBe(1)
  })
})
