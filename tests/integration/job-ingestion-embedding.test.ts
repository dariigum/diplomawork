import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { User, Vacancy } from '@/lib/db/schema'
import { applyIngestionVacancyEmbedding, persistIngestionVacancyWithEmbedding } from '@/lib/job-ingestion/embeddings'
import { cosineSimilarity } from '@/lib/recommendation'
import type { NormalizedVacancyInput } from '@/lib/job-ingestion/types'

let mongoServer: MongoMemoryServer
let passwordHash: string

function patchMongooseGlobalCache() {
  const g = ((global as unknown as { mongoose?: { conn: unknown; promise: unknown } }).mongoose ??= {
    conn: null,
    promise: null,
  })
  g.conn = mongoose
  g.promise = Promise.resolve(mongoose)
}

function baseInput(overrides: Partial<NormalizedVacancyInput> = {}): NormalizedVacancyInput {
  return {
    source: 'MOCK',
    externalId: 'MOCK:embed-int-1',
    title: 'Data engineer',
    company: 'Embed Co',
    description:
      'Integration test vacancy with enough text for validators and embedding pipeline coverage in ingestion.',
    skillsRequired: 'SQL, Python',
    location: 'Almaty',
    workMode: 'REMOTE',
    employmentType: 'Full-time',
    salary: { min: 50, max: 150 },
    sourceUrl: 'https://example.com/embed/1',
    ...overrides,
  }
}

const mockVec8 = (): number[] => [1, 0, 0, 0, 0, 0, 0, 0]

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'job_ingestion_embed_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchMongooseGlobalCache()
  passwordHash = await bcrypt.hash('embed-test', 4)
})

beforeEach(async () => {
  await Promise.all([Vacancy.deleteMany({}), User.deleteMany({})])
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

describe('job ingestion embeddings (MongoMemoryServer)', () => {
  it('persists embedding after upsert when getEmbedding succeeds', async () => {
    const getEmbedding = vi.fn(async () => mockVec8())
    const res = await persistIngestionVacancyWithEmbedding(baseInput(), passwordHash, { getEmbedding })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.embedding.status).toBe('embedded')
    expect(getEmbedding).toHaveBeenCalledOnce()
    const doc = await Vacancy.findById(res.recordId).lean()
    expect(doc?.embedding?.length).toBe(8)
  })

  it('skips when embedding already exists unless forceRefresh', async () => {
    const getEmbedding = vi.fn(async () => mockVec8())
    const input = baseInput({ externalId: 'MOCK:embed-skip' })
    const first = await persistIngestionVacancyWithEmbedding(input, passwordHash, { getEmbedding })
    expect(first.ok && first.embedding.status).toBe('embedded')
    getEmbedding.mockClear()
    const second = await persistIngestionVacancyWithEmbedding(input, passwordHash, { getEmbedding })
    expect(second.ok && second.embedding.status).toBe('skipped')
    expect(second.ok && second.embedding.reason).toBe('already_present')
    expect(getEmbedding).not.toHaveBeenCalled()
    const third = await persistIngestionVacancyWithEmbedding(input, passwordHash, { getEmbedding, forceRefresh: true })
    expect(third.ok && third.embedding.status).toBe('embedded')
    expect(getEmbedding).toHaveBeenCalledOnce()
  })

  it('returns failed on ML error but keeps vacancy persisted', async () => {
    const getEmbedding = vi.fn(async () => {
      throw new Error('ml down')
    })
    const res = await persistIngestionVacancyWithEmbedding(baseInput({ externalId: 'MOCK:embed-fail' }), passwordHash, {
      getEmbedding,
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.embedding.status).toBe('failed')
    const doc = await Vacancy.findById(res.recordId).lean()
    expect(doc?.title).toBeTruthy()
    expect(doc?.embedding == null || doc.embedding.length === 0).toBe(true)
  })

  it('does not write invalid embedding vectors', async () => {
    const getEmbedding = vi.fn(async () => [] as unknown as number[])
    const res = await persistIngestionVacancyWithEmbedding(baseInput({ externalId: 'MOCK:embed-badvec' }), passwordHash, {
      getEmbedding,
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.embedding.status).toBe('failed')
    const doc = await Vacancy.findById(res.recordId).lean()
    expect(doc?.embedding == null || doc.embedding.length === 0).toBe(true)
  })

  it('skips not_ingestion_managed for manual vacancies', async () => {
    const emp = await User.create({
      email: 'manual-embed@example.com',
      passwordHash,
      name: 'M',
      role: 'EMPLOYER',
    })
    const manual = await Vacancy.create({
      employerId: emp._id,
      title: 'Manual only',
      description: 'Manual vacancy description long enough for any unrelated checks in the test suite.',
      skillsRequired: 'X',
      salaryMin: 1,
      salaryMax: 2,
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      city: 'Q',
      address: 'Remote',
    })
    const getEmbedding = vi.fn(async () => mockVec8())
    const out = await applyIngestionVacancyEmbedding(String(manual._id), baseInput(), { getEmbedding })
    expect(out.status).toBe('skipped')
    if (out.status === 'skipped') expect(out.reason).toBe('not_ingestion_managed')
    expect(getEmbedding).not.toHaveBeenCalled()
  })

  it('recommendation cosineSimilarity accepts stored ingestion embedding', async () => {
    const vec = mockVec8()
    const getEmbedding = vi.fn(async () => vec)
    const res = await persistIngestionVacancyWithEmbedding(baseInput({ externalId: 'MOCK:embed-cos' }), passwordHash, {
      getEmbedding,
    })
    expect(res.ok && res.embedding.status).toBe('embedded')
    const doc = await Vacancy.findOne({ externalId: 'MOCK:embed-cos' }).lean()
    const sim = cosineSimilarity(vec, doc?.embedding)
    expect(sim).toBeGreaterThan(0)
  })
})
