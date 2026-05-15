/**
 * @vitest-environment node
 */
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { NextRequest } from 'next/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { User, Vacancy } from '@/lib/db/schema'
import { getEmbedding } from '@/lib/ml'
import {
  isSemanticRetrievalStats,
  isSemanticSearchApiFallback,
  isSemanticSearchApiSuccessBody,
  type SemanticSearchApiErrorBody,
  type SemanticSearchApiSuccessBody,
} from '@/lib/semantic-search-api-types'

vi.mock('@/lib/ml', () => ({
  getEmbedding: vi.fn(),
}))

const mockedGetEmbedding = vi.mocked(getEmbedding)

let GET: typeof import('@/app/api/jobs/semantic-search/route').GET

let mongoServer: MongoMemoryServer

function patchGlobalMongooseCache() {
  const g = ((global as unknown as { mongoose?: { conn: unknown; promise: unknown } }).mongoose ??= {
    conn: null,
    promise: null,
  })
  g.conn = mongoose
  g.promise = Promise.resolve(mongoose)
}

function emb8(axis: number): number[] {
  const v = new Array(8).fill(0)
  v[axis % 8] = 1
  return v
}

function req(url: string) {
  return new NextRequest(url)
}

function assertSemanticResultItemKeys(obj: Record<string, unknown>) {
  const keys = Object.keys(obj).sort()
  expect(keys).toEqual(
    ['company', 'employmentType', 'explanation', 'location', 'semanticScore', 'title', 'vacancyId', 'workMode'].sort(),
  )
  expect(obj).not.toHaveProperty('behaviourScore')
  expect(obj).not.toHaveProperty('finalScore')
  expect(obj).not.toHaveProperty('score')
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'semantic_search_api_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchGlobalMongooseCache()
  const route = await import('@/app/api/jobs/semantic-search/route')
  GET = route.GET
})

beforeEach(async () => {
  vi.clearAllMocks()
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

describe('GET /api/jobs/semantic-search', () => {
  it('returns 400 EMPTY_QUERY when q is missing', async () => {
    const res = await GET(req('http://localhost/api/jobs/semantic-search'))
    expect(res.status).toBe(400)
    const body = (await res.json()) as SemanticSearchApiErrorBody
    expect(body.code).toBe('EMPTY_QUERY')
    expect(typeof body.error).toBe('string')
  })

  it('returns 400 EMPTY_QUERY when q is empty or whitespace-only', async () => {
    const r1 = await GET(req('http://localhost/api/jobs/semantic-search?q='))
    expect(r1.status).toBe(400)
    const r2 = await GET(req('http://localhost/api/jobs/semantic-search?q=%20%20'))
    expect(r2.status).toBe(400)
  })

  it('returns 503 SEMANTIC_SEARCH_UNAVAILABLE when getEmbedding throws', async () => {
    mockedGetEmbedding.mockRejectedValue(new Error('connection refused'))
    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=rust'))
    expect(res.status).toBe(503)
    const body = (await res.json()) as SemanticSearchApiErrorBody
    expect(body.code).toBe('SEMANTIC_SEARCH_UNAVAILABLE')
  })

  it('returns 503 when getEmbedding returns an empty embedding array', async () => {
    mockedGetEmbedding.mockResolvedValue([])
    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=python'))
    expect(res.status).toBe(503)
    const body = (await res.json()) as SemanticSearchApiErrorBody
    expect(body.code).toBe('SEMANTIC_SEARCH_UNAVAILABLE')
  })

  it('returns 200 with count 0 when no vacancies have embeddings', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(0))
    const employer = await User.create({
      email: 'e1@t.dev',
      passwordHash: 'x',
      name: 'Co',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'No emb',
      description: 'd',
      skillsRequired: 's',
      salaryMin: 1,
      salaryMax: 2,
    })

    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=anything'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as SemanticSearchApiSuccessBody
    expect(isSemanticSearchApiSuccessBody(body)).toBe(true)
    expect(body.semantic).toBe(true)
    expect(body.query).toBe('anything')
    expect(body.count).toBe(0)
    expect(body.results).toEqual([])
    expect(body.concepts).toBeUndefined()
    expect(isSemanticRetrievalStats(body.stats)).toBe(true)
    expect(body.stats.compatibleEmbeddings).toBe(0)
    expect(body.stats.topSemanticScore).toBeNull()
    expect(body.stats.bandCounts).toEqual({ strong: 0, solid: 0, related: 0, loose: 0 })
  })

  it('returns 200 with ranked matches, stable contract, and finite scores in (0,1]', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(0))
    const employer = await User.create({
      email: 'e2@t.dev',
      passwordHash: 'x',
      name: 'Acme',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Role Z',
      description: 'machine learning pipelines and kubernetes',
      skillsRequired: 'Python, NLP, Docker',
      salaryMin: 10,
      salaryMax: 20,
      workMode: 'REMOTE',
      employmentType: 'Full-time',
      embedding: emb8(0),
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Role A',
      description: 'kubernetes operations',
      skillsRequired: 'Python, Go, Docker',
      salaryMin: 10,
      salaryMax: 20,
      workMode: 'REMOTE',
      employmentType: 'Part-time',
      embedding: emb8(0),
    })

    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=machine+learning'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as SemanticSearchApiSuccessBody
    expect(isSemanticSearchApiSuccessBody(body)).toBe(true)
    expect(body.query).toBe('machine learning')
    expect(body.count).toBe(2)
    expect(body.results).toHaveLength(2)

    const ids = body.results.map((r) => r.vacancyId)
    const vacs = await Vacancy.find({}).lean()
    const idA = vacs.find((v) => v.title === 'Role A')!._id.toString()
    const idZ = vacs.find((v) => v.title === 'Role Z')!._id.toString()
    const first = idA.localeCompare(idZ) <= 0 ? idA : idZ
    const second = idA.localeCompare(idZ) <= 0 ? idZ : idA
    expect(ids).toEqual([first, second])
    expect(body.results[0]!.semanticScore).toBe(body.results[1]!.semanticScore)

    for (const r of body.results) {
      assertSemanticResultItemKeys(r as unknown as Record<string, unknown>)
      expect(Number.isFinite(r.semanticScore)).toBe(true)
      expect(r.semanticScore).toBeGreaterThan(0)
      expect(r.semanticScore).toBeLessThanOrEqual(1)
      expect(r.explanation.toLowerCase()).toMatch(/embedding|cosine|semantic/)
      expect(r.company).toBe('Acme')
    }

    expect(Array.isArray(body.concepts)).toBe(true)
    expect(body.concepts!.length).toBeGreaterThan(0)
    expect(typeof body.conceptExplanation).toBe('string')
    expect(body.conceptExplanation!.length).toBeGreaterThan(20)
    const conceptKeys = new Set(body.concepts!.map((c) => c.concept))
    expect(conceptKeys.has('python')).toBe(true)
    expect(conceptKeys.has('docker')).toBe(true)

    expect(isSemanticRetrievalStats(body.stats)).toBe(true)
    expect(body.stats.checkedEmbeddings).toBeGreaterThanOrEqual(2)
    expect(body.stats.compatibleEmbeddings).toBe(2)
    expect(body.stats.topSemanticScore).toBe(body.results[0]!.semanticScore)
    expect(body.stats.bandCounts.strong).toBe(2)
    expect(body.stats.bandCounts.solid).toBe(0)
    expect(body.stats.bandCounts.related).toBe(0)
    expect(body.stats.bandCounts.loose).toBe(0)
    expect(body.fallback).toBeUndefined()
  })

  it('returns deterministic ordering for repeated GET with same fixtures', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(1))
    const employer = await User.create({
      email: 'e3@t.dev',
      passwordHash: 'x',
      name: 'X',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'J1',
      description: 'd',
      skillsRequired: 's',
      salaryMin: 1,
      salaryMax: 2,
      embedding: emb8(1),
    })

    const url = 'http://localhost/api/jobs/semantic-search?q=data&limit=5'
    const a = await GET(req(url))
    const b = await GET(req(url))
    expect(a.status).toBe(200)
    expect(b.status).toBe(200)
    const ja = (await a.json()) as SemanticSearchApiSuccessBody
    const jb = (await b.json()) as SemanticSearchApiSuccessBody
    expect(ja).toEqual(jb)
  })

  it('excludes vacancies whose embedding length mismatches the query vector', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(0))
    const employer = await User.create({
      email: 'e4@t.dev',
      passwordHash: 'x',
      name: 'Y',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Bad dim',
      description: 'd',
      skillsRequired: 's',
      salaryMin: 1,
      salaryMax: 2,
      embedding: [1, 0, 0],
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Good dim',
      description: 'd',
      skillsRequired: 's',
      salaryMin: 1,
      salaryMax: 2,
      embedding: emb8(0),
    })

    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=test'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as SemanticSearchApiSuccessBody
    expect(body.count).toBe(1)
    expect(body.results[0]!.title).toBe('Good dim')
    expect(body.stats.checkedEmbeddings).toBe(2)
    expect(body.stats.compatibleEmbeddings).toBe(1)
    expect(body.stats.topSemanticScore).toBe(body.results[0]!.semanticScore)
  })

  it('includes stats on every 200 success body validated by type guard', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(3))
    const employer = await User.create({
      email: 'e5@t.dev',
      passwordHash: 'x',
      name: 'Stats Co',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Loose match',
      description: 'd',
      skillsRequired: 's',
      salaryMin: 1,
      salaryMax: 2,
      embedding: emb8(4),
    })

    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=partial'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as SemanticSearchApiSuccessBody
    expect(isSemanticSearchApiSuccessBody(body)).toBe(true)
    expect(body.stats.checkedEmbeddings).toBe(1)
    if (body.count > 0) {
      expect(body.stats.topSemanticScore).not.toBeNull()
    } else {
      expect(body.stats.topSemanticScore).toBeNull()
    }
  })

  it('returns keyword fallback when semantic results are empty but text overlaps', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(0))
    const employer = await User.create({
      email: 'e6@t.dev',
      passwordHash: 'x',
      name: 'Text Co',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Python Backend Engineer',
      description: 'backend APIs',
      skillsRequired: 'Python, Django',
      salaryMin: 1,
      salaryMax: 2,
    })

    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=python+backend'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as SemanticSearchApiSuccessBody
    expect(body.count).toBe(0)
    expect(body.fallback).toBeDefined()
    expect(isSemanticSearchApiFallback(body.fallback)).toBe(true)
    expect(body.fallback!.enabled).toBe(true)
    expect(['No strong semantic matches', 'Sparse embedding overlap']).toContain(body.fallback!.reason)
    expect(body.fallback!.results.length).toBeGreaterThan(0)
    const item = body.fallback!.results[0]!
    expect(item).not.toHaveProperty('semanticScore')
    expect(typeof item.textScore).toBe('number')
    expect(item.explanation.toLowerCase()).toContain('text overlap')
  })

  it('omits fallback when top semantic score is at related band or higher', async () => {
    mockedGetEmbedding.mockResolvedValue(emb8(0))
    const employer = await User.create({
      email: 'e7@t.dev',
      passwordHash: 'x',
      name: 'Strong',
      role: 'EMPLOYER',
    })
    await Vacancy.create({
      employerId: employer._id,
      title: 'Exact',
      description: 'd',
      skillsRequired: 's',
      salaryMin: 1,
      salaryMax: 2,
      embedding: emb8(0),
    })

    const res = await GET(req('http://localhost/api/jobs/semantic-search?q=exact'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as SemanticSearchApiSuccessBody
    expect(body.count).toBe(1)
    expect(body.stats.topSemanticScore).toBeGreaterThanOrEqual(0.35)
    expect(body.fallback).toBeUndefined()
  })
})
