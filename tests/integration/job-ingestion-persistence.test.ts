import bcrypt from 'bcryptjs'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { User, Vacancy } from '@/lib/db/schema'
import { createMongoIngestionPersistence } from '@/lib/job-ingestion/persistence'
import type { NormalizedVacancyInput } from '@/lib/job-ingestion/types'

let mongoServer: MongoMemoryServer
let ingestionPasswordHash: string

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
    externalId: 'MOCK:persist-1',
    title: 'Persisted title',
    company: 'Acme Ingestion Co',
    description:
      'Long enough description for validators and persistence integration tests in the job ingestion layer.',
    skillsRequired: 'TypeScript, MongoDB',
    location: 'Almaty',
    workMode: 'REMOTE',
    employmentType: 'Full-time',
    salary: { min: 100, max: 200 },
    sourceUrl: 'https://example.com/job/1',
    ...overrides,
  }
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'job_ingestion_persist_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchMongooseGlobalCache()
  ingestionPasswordHash = await bcrypt.hash('ingestion-test-secret', 4)
})

beforeEach(async () => {
  await Promise.all([Vacancy.deleteMany({}), User.deleteMany({})])
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

describe('job ingestion persistence (MongoMemoryServer)', () => {
  const persistence = createMongoIngestionPersistence({ placeholderPasswordHash: ingestionPasswordHash })

  it('creates on first upsert and updates on repeated import (same source + externalId)', async () => {
    const input = baseInput()
    const a = await persistence.upsertNormalizedVacancy(input)
    expect(a.ok).toBe(true)
    if (!a.ok) return
    expect(a.created).toBe(true)

    const b = await persistence.upsertNormalizedVacancy({ ...input, title: 'Updated title' })
    expect(b.ok).toBe(true)
    if (!b.ok) return
    expect(b.created).toBe(false)
    expect(b.recordId).toBe(a.recordId)

    const count = await Vacancy.countDocuments({ source: 'MOCK', externalId: 'MOCK:persist-1' })
    expect(count).toBe(1)
    const doc = await Vacancy.findById(a.recordId).lean()
    expect(doc?.title).toBe('Updated title')
  })

  it('allows same externalId with different source (no cross-source collision)', async () => {
    const id = 'shared-ext-id'
    const hh = await persistence.upsertNormalizedVacancy(
      baseInput({ source: 'HH', externalId: id, sourceUrl: 'https://hh.example/1' })
    )
    const mock = await persistence.upsertNormalizedVacancy(
      baseInput({ source: 'MOCK', externalId: id, sourceUrl: 'https://mock.example/1' })
    )
    expect(hh.ok && mock.ok).toBe(true)
    const n = await Vacancy.countDocuments({ externalId: id })
    expect(n).toBe(2)
  })

  it('does not touch manual vacancies without source/externalId', async () => {
    const manualEmployer = await User.create({
      email: 'manual-emp@example.com',
      passwordHash: ingestionPasswordHash,
      name: 'Manual Corp',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: manualEmployer._id,
      title: 'Manual vacancy',
      description:
        'This is a manual employer-created vacancy that must remain unchanged after ingestion upserts.',
      skillsRequired: 'Excel',
      salaryMin: 10,
      salaryMax: 20,
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      city: 'Astana',
      address: 'Remote',
    })

    const ing = await persistence.upsertNormalizedVacancy(baseInput({ externalId: 'MOCK:side-1' }))
    expect(ing.ok).toBe(true)

    expect(await Vacancy.countDocuments({})).toBe(2)
    const manual = await Vacancy.findOne({ title: 'Manual vacancy' }).lean()
    expect(manual?.title).toBe('Manual vacancy')
    expect(manual?.source).toBeUndefined()
    expect(manual?.externalId).toBeUndefined()
  })

  it('preserves embedding on update', async () => {
    const input = baseInput({ externalId: 'MOCK:emb-1' })
    const first = await persistence.upsertNormalizedVacancy(input)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    const embedding = [0.1, 0.2, 0.3, 0.4]
    await Vacancy.updateOne({ _id: first.recordId }, { $set: { embedding } })

    const second = await persistence.upsertNormalizedVacancy({ ...input, title: 'After embedding seed' })
    expect(second.ok).toBe(true)

    const doc = await Vacancy.findById(first.recordId).lean()
    expect(doc?.embedding?.length).toBe(embedding.length)
    expect(doc?.embedding?.[0]).toBeCloseTo(0.1)
  })

  it('returns ok:false for invalid ingestion rows without throwing', async () => {
    const bad = baseInput({ description: 'short', externalId: 'MOCK:bad-1' })
    const res = await persistence.upsertNormalizedVacancy(bad)
    expect(res.ok).toBe(false)
    expect(await Vacancy.countDocuments({ externalId: 'MOCK:bad-1' })).toBe(0)
  })
})
