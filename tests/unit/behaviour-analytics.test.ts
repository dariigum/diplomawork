import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Vacancy, VacancyBehaviourEvent } from '@/lib/db/schema'
import { BEHAVIOUR_EVENT_WEIGHTS, inferVacancyCategoryIds, splitVacancySkillPhrases } from '@/lib/behaviour-profile'

let buildBehaviourAnalytics: (userId: string) => Promise<
  import('@/lib/behaviour-analytics').BehaviourAnalyticsSnapshot
>

let mongoServer: MongoMemoryServer

function patchGlobalMongooseCache() {
  const g = ((global as unknown as { mongoose?: { conn: unknown; promise: unknown } }).mongoose ??= {
    conn: null,
    promise: null,
  })
  g.conn = mongoose
  g.promise = Promise.resolve(mongoose)
}

async function seedVacancy(partial: {
  _id?: mongoose.Types.ObjectId
  title: string
  skillsRequired: string
  description: string
}) {
  const employerId = new mongoose.Types.ObjectId()
  const _id = partial._id ?? new mongoose.Types.ObjectId()
  await Vacancy.create({
    _id,
    employerId,
    title: partial.title,
    description: partial.description,
    skillsRequired: partial.skillsRequired,
    salaryMin: 1000,
    salaryMax: 5000,
  })
  return _id
}

function atDaysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'behaviour_analytics_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchGlobalMongooseCache()
  const mod = await import('@/lib/behaviour-analytics')
  buildBehaviourAnalytics = mod.buildBehaviourAnalytics
})

beforeEach(async () => {
  await Vacancy.deleteMany({})
  await VacancyBehaviourEvent.deleteMany({})
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

describe('buildBehaviourAnalytics', () => {
  describe('empty / invalid states', () => {
    it('returns safe cold snapshot for invalid user id without touching aggregation', async () => {
      const snap = await buildBehaviourAnalytics('not-a-valid-objectid')
      expect(snap.coldStart).toBe(true)
      expect(snap.summaryLines).toContain('No analytics: invalid user context.')
      expect(snap.categoryRanked).toEqual([])
      expect(snap.skillRanked).toEqual([])
      expect(Array.isArray(snap.profileTopCategories)).toBe(true)
      expect(Array.isArray(snap.profileTopSkills)).toBe(true)
      expect(snap.windows.last7Days).toEqual({ viewed: 0, saved: 0, applied: 0 })
      expect(snap.footnote.length).toBeGreaterThan(0)
    })

    it('returns cold-start snapshot when user has no views, saves, or applies', async () => {
      const userId = new mongoose.Types.ObjectId().toHexString()
      const snap = await buildBehaviourAnalytics(userId)
      expect(snap.coldStart).toBe(true)
      expect(snap.windows.allTime.viewed + snap.windows.allTime.saved + snap.windows.allTime.applied).toBe(0)
      expect(snap.categoryRanked).toEqual([])
      expect(snap.skillRanked).toEqual([])
      expect(snap.summaryLines.length).toBeGreaterThanOrEqual(2)
      expect(snap.summaryLines.some((l) => l.includes('No behavioural trends yet'))).toBe(true)
      expect(snap.footnote).toContain('keyword buckets')
    })
  })

  describe('interaction weights & windows', () => {
    it('counts positive events in all-time and unsaved; respects recent windows for 7d/30d', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vFe = await seedVacancy({
        title: 'Frontend engineer',
        skillsRequired: 'React, TypeScript',
        description: 'Next.js product team.',
      })
      const vAi = await seedVacancy({
        title: 'NLP research role',
        skillsRequired: 'Python, PyTorch, NLP',
        description: 'Neural networks and LLM research.',
      })
      const vBe = await seedVacancy({
        title: 'Backend engineer',
        skillsRequired: 'FastAPI, PostgreSQL, REST API',
        description: 'Microservices.',
      })

      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vFe,
        eventType: 'VACANCY_VIEWED',
        occurredAt: atDaysAgo(2),
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vAi,
        eventType: 'VACANCY_SAVED',
        occurredAt: atDaysAgo(5),
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vBe,
        eventType: 'VACANCY_APPLIED',
        occurredAt: atDaysAgo(10),
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vBe,
        eventType: 'VACANCY_VIEWED',
        occurredAt: atDaysAgo(40),
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vFe,
        eventType: 'VACANCY_UNSAVED',
        occurredAt: atDaysAgo(1),
      })

      const snap = await buildBehaviourAnalytics(userId.toHexString())
      expect(snap.coldStart).toBe(false)

      expect(snap.windows.allTime.viewed).toBe(2)
      expect(snap.windows.allTime.saved).toBe(1)
      expect(snap.windows.allTime.applied).toBe(1)
      expect(snap.windows.allTime.unsaved).toBe(1)

      expect(snap.windows.last7Days.viewed + snap.windows.last7Days.saved + snap.windows.last7Days.applied).toBeGreaterThan(0)
      expect(
        snap.windows.last30Days.viewed + snap.windows.last30Days.saved + snap.windows.last30Days.applied,
      ).toBeGreaterThanOrEqual(snap.windows.last7Days.viewed)

      expect(snap.categoryRanked.length).toBeGreaterThan(0)
      expect(snap.skillRanked.length).toBeGreaterThan(0)
    })
  })

  describe('category & skill aggregation', () => {
    it('ranks ai_ml ahead when AI/ML vacancy receives stronger weighted interactions', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vAi = await seedVacancy({
        title: 'ML platform engineer',
        skillsRequired: 'Python, PyTorch, NLP, Docker',
        description: 'Neural ranking and LLM serving on Kubernetes.',
      })
      const vFe = await seedVacancy({
        title: 'Marketing website',
        skillsRequired: 'React, Tailwind',
        description: 'Landing pages.',
      })

      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vAi,
        eventType: 'VACANCY_APPLIED',
        occurredAt: atDaysAgo(3),
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vFe,
        eventType: 'VACANCY_VIEWED',
        occurredAt: atDaysAgo(3),
      })

      const snap = await buildBehaviourAnalytics(userId.toHexString())
      const ids = snap.categoryRanked.map((c) => c.id)
      expect(ids).toContain('ai_ml')
      expect(ids.indexOf('ai_ml')).toBeLessThan(ids.indexOf('frontend'))
    })

    it('splits multi-category vacancy weight evenly across matched buckets', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vFull = await seedVacancy({
        title: 'Fullstack AI platform',
        skillsRequired: 'React, FastAPI, PyTorch, Docker',
        description: 'REST API plus neural models; Kubernetes deployment.',
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: vFull,
        eventType: 'VACANCY_SAVED',
        occurredAt: atDaysAgo(1),
      })

      const snap = await buildBehaviourAnalytics(userId.toHexString())
      const cats = inferVacancyCategoryIds({
        title: 'Fullstack AI platform',
        skillsRequired: 'React, FastAPI, PyTorch, Docker',
        description: 'REST API plus neural models; Kubernetes deployment.',
      })
      expect(cats.length).toBeGreaterThan(1)
      const w = BEHAVIOUR_EVENT_WEIGHTS.VACANCY_SAVED
      const share = w / cats.length
      const roundedShare = Math.round(share * 100) / 100
      for (const id of cats) {
        const row = snap.categoryRanked.find((r) => r.id === id)
        expect(row).toBeDefined()
        expect(row!.weight).toBeCloseTo(roundedShare, 1)
      }
    })

    it('produces stable deterministic skill ordering for realistic stacks', async () => {
      const userId = new mongoose.Types.ObjectId()
      const v = await seedVacancy({
        title: 'Platform engineer',
        skillsRequired: 'Python, NLP, React, Docker, FastAPI',
        description: 'Polyglot services team.',
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: v,
        eventType: 'VACANCY_APPLIED',
        occurredAt: atDaysAgo(2),
      })

      const snap = await buildBehaviourAnalytics(userId.toHexString())
      const skills = snap.skillRanked.map((s) => s.skill)
      const expectedPhrases = splitVacancySkillPhrases('Python, NLP, React, Docker, FastAPI')
      for (const s of skills) {
        expect(expectedPhrases).toContain(s)
      }
      const a = await buildBehaviourAnalytics(userId.toHexString())
      const b = await buildBehaviourAnalytics(userId.toHexString())
      expect(a.skillRanked.map((x) => `${x.skill}:${x.weight}`).join('|')).toBe(
        b.skillRanked.map((x) => `${x.skill}:${x.weight}`).join('|'),
      )
    })
  })

  describe('summary lines & explainability', () => {
    it('emits deterministic readable summary lines with finite numeric counts', async () => {
      const userId = new mongoose.Types.ObjectId()
      const v = await seedVacancy({
        title: 'DevOps engineer',
        skillsRequired: 'Docker, Kubernetes, CI/CD',
        description: 'Remote SRE team.',
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: v,
        eventType: 'VACANCY_VIEWED',
        occurredAt: atDaysAgo(1),
      })

      const snap = await buildBehaviourAnalytics(userId.toHexString())
      for (const line of snap.summaryLines) {
        expect(typeof line).toBe('string')
        expect(line.length).toBeGreaterThan(0)
      }
      expect(snap.summaryLines[0]).toMatch(/All-time:/)
      expect(snap.summaryLines[1]).toMatch(/Last 7 days:/)
      const again = await buildBehaviourAnalytics(userId.toHexString())
      expect(snap.summaryLines).toEqual(again.summaryLines)
    })

    it('keeps footnote aligned with explainable analytics contract', async () => {
      const userId = new mongoose.Types.ObjectId()
      const v = await seedVacancy({
        title: 'Data engineer',
        skillsRequired: 'SQL, Spark, Airflow',
        description: 'ETL pipelines.',
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: v,
        eventType: 'VACANCY_VIEWED',
        occurredAt: atDaysAgo(1),
      })
      const snap = await buildBehaviourAnalytics(userId.toHexString())
      expect(snap.footnote.toLowerCase()).toContain('keyword')
      expect(snap.footnote.toLowerCase()).toContain('personalization')
    })
  })

  describe('output safety', () => {
    it('returns stable shapes with finite numeric weights', async () => {
      const userId = new mongoose.Types.ObjectId()
      const v = await seedVacancy({
        title: 'AI engineer',
        skillsRequired: 'Python, PyTorch',
        description: 'LLM features.',
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: v,
        eventType: 'VACANCY_SAVED',
        occurredAt: atDaysAgo(1),
      })
      const snap = await buildBehaviourAnalytics(userId.toHexString())
      expect(snap.summaryLines.length).toBeLessThanOrEqual(5)
      for (const row of snap.categoryRanked) {
        expect(Number.isFinite(row.weight)).toBe(true)
        expect(row.id.length).toBeGreaterThan(0)
        expect(row.label.length).toBeGreaterThan(0)
      }
      for (const row of snap.skillRanked) {
        expect(Number.isFinite(row.weight)).toBe(true)
        expect(row.skill.length).toBeGreaterThan(0)
      }
    })
  })

  describe('profile alignment (buildUserBehaviourProfile)', () => {
    it('fills profileTopSkills from the same event stream used for aggregation', async () => {
      const userId = new mongoose.Types.ObjectId()
      const v = await seedVacancy({
        title: 'NLP internship',
        skillsRequired: 'Python, PyTorch',
        description: 'Research internship remote.',
      })
      await VacancyBehaviourEvent.create({
        userId,
        vacancyId: v,
        eventType: 'VACANCY_APPLIED',
        occurredAt: atDaysAgo(1),
      })
      const snap = await buildBehaviourAnalytics(userId.toHexString())
      expect(snap.profileTopSkills.length).toBeGreaterThan(0)
      expect(snap.profileTopCategories.length).toBeGreaterThan(0)
    })
  })
})
