/**
 * @vitest-environment node
 */
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { NextRequest } from 'next/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Resume, User, Vacancy, VacancyBehaviourEvent } from '@/lib/db/schema'
import { parseRecommendationsApiPayload } from '@/lib/recommendations-api-types'
import type { RecommendationApiItem, RecommendationsApiSuccessBody } from '@/lib/recommendations-api-types'

const sessionHolder = vi.hoisted(() => ({
  session: null as null | { user: { id: string; role: string; email: string } },
}))

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => sessionHolder.session),
}))

let GET: typeof import('@/app/api/recommendations/route').GET

let mongoServer: MongoMemoryServer

function patchGlobalMongooseCache() {
  const g = ((global as unknown as { mongoose?: { conn: unknown; promise: unknown } }).mongoose ??= {
    conn: null,
    promise: null,
  })
  g.conn = mongoose
  g.promise = Promise.resolve(mongoose)
}

function emb8(seed: number): number[] {
  const v = new Array(8).fill(0)
  v[seed % 8] = 1
  return v
}

function req(url = 'http://localhost/api/recommendations?limit=10') {
  return new NextRequest(url)
}

function assertFiniteNonNegative(n: unknown) {
  expect(typeof n).toBe('number')
  expect(Number.isFinite(n)).toBe(true)
  expect(n as number).toBeGreaterThanOrEqual(0)
}

function assertRecommendationItemShape(r: RecommendationApiItem) {
  expect(typeof r.vacancyId).toBe('string')
  expect(typeof r.title).toBe('string')
  expect(typeof r.company).toBe('string')
  assertFiniteNonNegative(r.score)
  assertFiniteNonNegative(r.semanticScore)
  assertFiniteNonNegative(r.behaviourScore)
  assertFiniteNonNegative(r.finalScore)
  expect(typeof r.description).toBe('string')
  expect(Array.isArray(r.matchedSkills)).toBe(true)
  expect(typeof r.semanticMatchNote).toBe('string')
  expect(r.textOverlapNote === null || typeof r.textOverlapNote === 'string').toBe(true)
  expect(typeof r.hybridRankingNote).toBe('string')
  expect(Array.isArray(r.behaviourExplanations)).toBe(true)
  expect(['semantic_only', 'behaviour_adjusted']).toContain(r.cardAdaptationHint)
  expect(r.behaviourCardTagline === null || typeof r.behaviourCardTagline === 'string').toBe(true)
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'recommendations_api_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchGlobalMongooseCache()
  const route = await import('@/app/api/recommendations/route')
  GET = route.GET
})

beforeEach(async () => {
  sessionHolder.session = null
  await Promise.all([
    VacancyBehaviourEvent.deleteMany({}),
    Vacancy.deleteMany({}),
    Resume.deleteMany({}),
    User.deleteMany({}),
  ])
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

describe('GET /api/recommendations', () => {
  it('returns 200 with stable contract when resume has embedding and vacancies match', async () => {
    const employeeId = new mongoose.Types.ObjectId()
    const employerId = new mongoose.Types.ObjectId()
    sessionHolder.session = {
      user: { id: employeeId.toHexString(), role: 'EMPLOYEE', email: `e-${employeeId}@t.dev` },
    }

    await User.create({
      _id: employeeId,
      email: `e-${employeeId}@t.dev`,
      passwordHash: 'x',
      name: 'Employee',
      role: 'EMPLOYEE',
    })
    await User.create({
      _id: employerId,
      email: `c-${employerId}@t.dev`,
      passwordHash: 'x',
      name: 'Acme AI',
      role: 'EMPLOYER',
    })

    const e = emb8(0)
    await Resume.create({
      userId: employeeId,
      title: 'AI engineer CV',
      skills: 'Python, PyTorch, NLP',
      experience: '4y',
      education: 'MSc',
      embedding: e,
      activeForAi: true,
    })

    const vacId = new mongoose.Types.ObjectId()
    await Vacancy.create({
      _id: vacId,
      employerId,
      title: 'NLP engineer',
      description: 'Neural models and LLM features.',
      skillsRequired: 'Python, PyTorch, NLP',
      embedding: e,
      salaryMin: 100,
      salaryMax: 200,
    })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as RecommendationsApiSuccessBody
    expect(Array.isArray(body.recommendations)).toBe(true)
    expect(body.recommendations.length).toBeGreaterThanOrEqual(1)
    expect(body.behaviourSession).toBeDefined()
    expect(typeof body.behaviourSession.coldStart).toBe('boolean')
    expect(Array.isArray(body.behaviourSession.dashboardLines)).toBe(true)

    const item = body.recommendations[0]!
    assertRecommendationItemShape(item)
    expect(item.hybridRankingNote.length).toBeGreaterThan(0)

    const res2 = await GET(req())
    expect(res2.status).toBe(200)
    const body2 = (await res2.json()) as RecommendationsApiSuccessBody
    expect(body2.recommendations.map((x) => x.vacancyId)).toEqual(body.recommendations.map((x) => x.vacancyId))
    expect(body2.recommendations.map((x) => x.finalScore)).toEqual(body.recommendations.map((x) => x.finalScore))
  })

  it('cold-start: no behaviour events still returns 200 with cold behaviourSession and safe scores', async () => {
    const employeeId = new mongoose.Types.ObjectId()
    const employerId = new mongoose.Types.ObjectId()
    sessionHolder.session = {
      user: { id: employeeId.toHexString(), role: 'EMPLOYEE', email: `e2-${employeeId}@t.dev` },
    }

    await User.create({
      _id: employeeId,
      email: `e2-${employeeId}@t.dev`,
      passwordHash: 'x',
      name: 'Employee',
      role: 'EMPLOYEE',
    })
    await User.create({
      _id: employerId,
      email: `c2-${employerId}@t.dev`,
      passwordHash: 'x',
      name: 'Corp',
      role: 'EMPLOYER',
    })
    const e = emb8(1)
    await Resume.create({
      userId: employeeId,
      title: 'CV',
      skills: 'Go',
      experience: '1y',
      education: 'BS',
      embedding: e,
      activeForAi: true,
    })
    await Vacancy.create({
      employerId,
      title: 'Backend dev',
      description: 'REST APIs.',
      skillsRequired: 'Go, PostgreSQL',
      embedding: e,
      salaryMin: 1,
      salaryMax: 2,
    })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as RecommendationsApiSuccessBody
    expect(body.behaviourSession.coldStart).toBe(true)
    for (const r of body.recommendations) {
      assertRecommendationItemShape(r)
      expect(r.hybridRankingNote).toContain('semantic')
    }
  })

  it('returns 422 NO_EMBEDDING when active resume has no embedding', async () => {
    const employeeId = new mongoose.Types.ObjectId()
    sessionHolder.session = {
      user: { id: employeeId.toHexString(), role: 'EMPLOYEE', email: `e3-${employeeId}@t.dev` },
    }
    await User.create({
      _id: employeeId,
      email: `e3-${employeeId}@t.dev`,
      passwordHash: 'x',
      name: 'Employee',
      role: 'EMPLOYEE',
    })
    await Resume.create({
      userId: employeeId,
      title: 'No emb',
      skills: 'x',
      experience: 'y',
      education: 'z',
      activeForAi: true,
    })

    const res = await GET(req())
    expect(res.status).toBe(422)
    const err = (await res.json()) as { error: string; code: string }
    expect(err.code).toBe('NO_EMBEDDING')
    expect(typeof err.error).toBe('string')
    expect(err.error.length).toBeGreaterThan(0)
    const parsed = parseRecommendationsApiPayload(err)
    expect(parsed.recommendations).toEqual([])
    expect(parsed.behaviourSession).toBeNull()
  })

  it('returns 404 when employee has no resume', async () => {
    const employeeId = new mongoose.Types.ObjectId()
    sessionHolder.session = {
      user: { id: employeeId.toHexString(), role: 'EMPLOYEE', email: `e4-${employeeId}@t.dev` },
    }
    await User.create({
      _id: employeeId,
      email: `e4-${employeeId}@t.dev`,
      passwordHash: 'x',
      name: 'Employee',
      role: 'EMPLOYEE',
    })

    const res = await GET(req())
    expect(res.status).toBe(404)
    const err = (await res.json()) as { error: string }
    expect(typeof err.error).toBe('string')
    expect(err.error.toLowerCase()).toContain('resume')
  })

  it('returns 200 with empty recommendations and safe behaviourSession when no matching vacancies', async () => {
    const employeeId = new mongoose.Types.ObjectId()
    sessionHolder.session = {
      user: { id: employeeId.toHexString(), role: 'EMPLOYEE', email: `e5-${employeeId}@t.dev` },
    }
    await User.create({
      _id: employeeId,
      email: `e5-${employeeId}@t.dev`,
      passwordHash: 'x',
      name: 'Employee',
      role: 'EMPLOYEE',
    })
    await Resume.create({
      userId: employeeId,
      title: 'CV',
      skills: 'Rust',
      experience: '2y',
      education: 'BS',
      embedding: emb8(2),
      activeForAi: true,
    })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as RecommendationsApiSuccessBody
    expect(body.recommendations).toEqual([])
    expect(body.behaviourSession).toBeDefined()
    expect(Array.isArray(body.behaviourSession.dashboardLines)).toBe(true)
    expect(body.behaviourSession.neutralSemanticLine.length).toBeGreaterThan(0)
  })

  it('behaviour-aware: after views/saves/applies, behaviourSession is not cold and items expose adaptation metadata', async () => {
    const employeeId = new mongoose.Types.ObjectId()
    const employerId = new mongoose.Types.ObjectId()
    sessionHolder.session = {
      user: { id: employeeId.toHexString(), role: 'EMPLOYEE', email: `e6-${employeeId}@t.dev` },
    }

    await User.create({
      _id: employeeId,
      email: `e6-${employeeId}@t.dev`,
      passwordHash: 'x',
      name: 'Employee',
      role: 'EMPLOYEE',
    })
    await User.create({
      _id: employerId,
      email: `c6-${employerId}@t.dev`,
      passwordHash: 'x',
      name: 'Tech Co',
      role: 'EMPLOYER',
    })

    const e = emb8(3)
    await Resume.create({
      userId: employeeId,
      title: 'ML CV',
      skills: 'Python, PyTorch',
      experience: '3y',
      education: 'MS',
      embedding: e,
      activeForAi: true,
    })

    const vacId = new mongoose.Types.ObjectId()
    await Vacancy.create({
      _id: vacId,
      employerId,
      title: 'PyTorch NLP engineer',
      description: 'Neural networks and LLM pipelines.',
      skillsRequired: 'Python, PyTorch, NLP',
      embedding: e,
      salaryMin: 10,
      salaryMax: 20,
    })

    await VacancyBehaviourEvent.create({
      userId: employeeId,
      vacancyId: vacId,
      eventType: 'VACANCY_VIEWED',
      occurredAt: new Date(),
    })
    await VacancyBehaviourEvent.create({
      userId: employeeId,
      vacancyId: vacId,
      eventType: 'VACANCY_SAVED',
      occurredAt: new Date(),
    })
    await VacancyBehaviourEvent.create({
      userId: employeeId,
      vacancyId: vacId,
      eventType: 'VACANCY_APPLIED',
      occurredAt: new Date(),
    })

    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = (await res.json()) as RecommendationsApiSuccessBody
    expect(body.behaviourSession.coldStart).toBe(false)
    expect(body.behaviourSession.activitySummary.viewed).toBeGreaterThanOrEqual(1)
    expect(body.behaviourSession.activitySummary.saved).toBeGreaterThanOrEqual(1)
    expect(body.behaviourSession.activitySummary.applied).toBeGreaterThanOrEqual(1)

    const item = body.recommendations[0]!
    assertRecommendationItemShape(item)
    expect(item.behaviourExplanations.length).toBeGreaterThanOrEqual(0)
    expect(typeof item.hybridRankingNote).toBe('string')
    expect(item.cardAdaptationHint === 'behaviour_adjusted' || item.cardAdaptationHint === 'semantic_only').toBe(true)
  })

  it('returns 401 when session is missing', async () => {
    sessionHolder.session = null
    const res = await GET(req())
    expect(res.status).toBe(401)
    const j = (await res.json()) as { error: string }
    expect(j.error).toBe('Unauthorized')
  })

  it('returns 403 for non-employee role', async () => {
    sessionHolder.session = {
      user: {
        id: new mongoose.Types.ObjectId().toHexString(),
        role: 'EMPLOYER',
        email: 'boss@t.dev',
      },
    }
    const res = await GET(req())
    expect(res.status).toBe(403)
  })
})
