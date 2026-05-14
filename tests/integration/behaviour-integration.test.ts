import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Resume, SavedVacancy, User, Vacancy, VacancyBehaviourEvent } from '@/lib/db/schema'

let recordVacancyBehaviourEvent: typeof import('@/lib/vacancy-behaviour-events').recordVacancyBehaviourEvent
let ensureActiveResumeForUser: typeof import('@/lib/active-resume').ensureActiveResumeForUser
let getActiveResumeLeanForUser: typeof import('@/lib/active-resume').getActiveResumeLeanForUser
let getTopRecommendations: typeof import('@/lib/recommendation').getTopRecommendations

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

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create({ instance: { dbName: 'behaviour_integration_test' } })
  await mongoose.connect(mongoServer.getUri())
  patchGlobalMongooseCache()
  const vbe = await import('@/lib/vacancy-behaviour-events')
  const ar = await import('@/lib/active-resume')
  const rec = await import('@/lib/recommendation')
  recordVacancyBehaviourEvent = vbe.recordVacancyBehaviourEvent
  ensureActiveResumeForUser = ar.ensureActiveResumeForUser
  getActiveResumeLeanForUser = ar.getActiveResumeLeanForUser
  getTopRecommendations = rec.getTopRecommendations
})

beforeEach(async () => {
  await Promise.all([
    VacancyBehaviourEvent.deleteMany({}),
    SavedVacancy.deleteMany({}),
    Resume.deleteMany({}),
    Vacancy.deleteMany({}),
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

describe('behaviour integration (MongoMemoryServer)', () => {
  describe('recordVacancyBehaviourEvent persistence', () => {
    it('persists VACANCY_SAVED with userId, vacancyId, eventType, occurredAt, and source', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vacancyId = new mongoose.Types.ObjectId()
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_SAVED',
        source: 'job_detail_page',
      })
      const docs = await VacancyBehaviourEvent.find({ userId, vacancyId }).lean()
      expect(docs).toHaveLength(1)
      const d = docs[0]!
      expect(String(d.userId)).toBe(String(userId))
      expect(String(d.vacancyId)).toBe(String(vacancyId))
      expect(d.eventType).toBe('VACANCY_SAVED')
      expect(d.occurredAt).toBeInstanceOf(Date)
      expect(d.source).toBe('job_detail_page')
    })

    it('truncates source to 64 characters', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vacancyId = new mongoose.Types.ObjectId()
      const long = 'x'.repeat(90)
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_VIEWED',
        source: long,
      })
      const d = await VacancyBehaviourEvent.findOne({ userId, vacancyId }).lean()
      expect(d?.source?.length).toBe(64)
    })

    it('no-ops for invalid ids without throwing', async () => {
      await expect(
        recordVacancyBehaviourEvent({
          userId: 'bad',
          vacancyId: new mongoose.Types.ObjectId().toHexString(),
          eventType: 'VACANCY_VIEWED',
        }),
      ).resolves.toBeUndefined()
      expect(await VacancyBehaviourEvent.countDocuments()).toBe(0)
    })
  })

  describe('VACANCY_VIEWED deduplication', () => {
    it('does not append a second VIEW within the dedupe window', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vacancyId = new mongoose.Types.ObjectId()
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_VIEWED',
        source: 'job_detail_page',
      })
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_VIEWED',
      })
      expect(await VacancyBehaviourEvent.countDocuments({ userId, vacancyId, eventType: 'VACANCY_VIEWED' })).toBe(1)
    })
  })

  describe('VACANCY_APPLIED deduplication', () => {
    it('allows only one APPLY per user+vacancy pair', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vacancyId = new mongoose.Types.ObjectId()
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_APPLIED',
      })
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_APPLIED',
      })
      expect(await VacancyBehaviourEvent.countDocuments({ userId, vacancyId, eventType: 'VACANCY_APPLIED' })).toBe(1)
    })
  })

  describe('SavedVacancy + behaviour events', () => {
    it('mirrors save/unsave persistence with SAVED and UNSAVED events', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vacancyId = new mongoose.Types.ObjectId()

      await SavedVacancy.create({ userId, vacancyId })
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_SAVED',
        source: 'dashboard',
      })
      expect(await SavedVacancy.countDocuments({ userId, vacancyId })).toBe(1)

      await SavedVacancy.deleteOne({ userId, vacancyId })
      await recordVacancyBehaviourEvent({
        userId: userId.toHexString(),
        vacancyId: vacancyId.toHexString(),
        eventType: 'VACANCY_UNSAVED',
      })

      expect(await SavedVacancy.countDocuments({ userId, vacancyId })).toBe(0)
      const types = await VacancyBehaviourEvent.find({ userId, vacancyId })
        .sort({ occurredAt: 1 })
        .distinct('eventType')
      expect(types).toContain('VACANCY_SAVED')
      expect(types).toContain('VACANCY_UNSAVED')
    })
  })

  describe('ensureActiveResumeForUser', () => {
    it('collapses multiple activeForAi flags to a single active resume (latest createdAt wins)', async () => {
      const userId = new mongoose.Types.ObjectId()
      const older = await Resume.create({
        userId,
        title: 'Resume A',
        skills: 'Python',
        experience: '2y',
        education: 'BS',
        activeForAi: true,
        createdAt: new Date('2020-01-01'),
      })
      const newer = await Resume.create({
        userId,
        title: 'Resume B',
        skills: 'Go',
        experience: '3y',
        education: 'MS',
        activeForAi: true,
        createdAt: new Date('2024-06-01'),
      })

      await ensureActiveResumeForUser(userId.toHexString())

      const active = await Resume.find({ userId, activeForAi: true }).lean()
      expect(active).toHaveLength(1)
      expect(String(active[0]!._id)).toBe(String(newer._id))
      const stale = await Resume.findById(older._id).lean()
      expect(stale?.activeForAi).toBe(false)
    })

    it('activates the latest resume when none were marked active', async () => {
      const userId = new mongoose.Types.ObjectId()
      await Resume.create({
        userId,
        title: 'First',
        skills: 'a',
        experience: '1',
        education: 'x',
        activeForAi: false,
        createdAt: new Date('2021-01-01'),
      })
      const latest = await Resume.create({
        userId,
        title: 'Second',
        skills: 'b',
        experience: '2',
        education: 'y',
        activeForAi: false,
        createdAt: new Date('2023-01-01'),
      })

      await ensureActiveResumeForUser(userId.toHexString())

      const active = await Resume.countDocuments({ userId, activeForAi: true })
      expect(active).toBe(1)
      const lean = await Resume.findOne({ userId, activeForAi: true }).lean()
      expect(String(lean?._id)).toBe(String(latest._id))
    })

    it('is a no-op when the user has no resumes', async () => {
      const userId = new mongoose.Types.ObjectId()
      await expect(ensureActiveResumeForUser(userId.toHexString())).resolves.toBeUndefined()
      expect(await Resume.countDocuments({ userId })).toBe(0)
    })

    it('re-picks an active resume after the active document is removed', async () => {
      const userId = new mongoose.Types.ObjectId()
      const r1 = await Resume.create({
        userId,
        title: 'Keep',
        skills: 's',
        experience: 'e',
        education: 'd',
        activeForAi: true,
        createdAt: new Date('2022-01-01'),
      })
      await Resume.create({
        userId,
        title: 'Later',
        skills: 's2',
        experience: 'e2',
        education: 'd2',
        activeForAi: false,
        createdAt: new Date('2025-01-01'),
      })
      await Resume.deleteOne({ _id: r1._id })
      await ensureActiveResumeForUser(userId.toHexString())
      const active = await Resume.find({ userId, activeForAi: true }).lean()
      expect(active).toHaveLength(1)
      expect(active[0]!.title).toBe('Later')
    })
  })

  describe('getActiveResumeLeanForUser + recommendation pipeline', () => {
    it('returns the active resume with embedding and getTopRecommendations returns ranked rows', async () => {
      const employeeId = new mongoose.Types.ObjectId()
      await User.create({
        _id: employeeId,
        email: `e-${employeeId}@test.dev`,
        passwordHash: 'x',
        name: 'Employee',
        role: 'EMPLOYEE',
      })
      const employerId = new mongoose.Types.ObjectId()
      await User.create({
        _id: employerId,
        email: `c-${employerId}@test.dev`,
        passwordHash: 'x',
        name: 'Acme Corp',
        role: 'EMPLOYER',
      })

      const e = emb8(0)
      await Resume.create({
        userId: employeeId,
        title: 'AI engineer CV',
        skills: 'Python, PyTorch',
        experience: '4y',
        education: 'MSc',
        embedding: e,
        activeForAi: true,
      })
      await ensureActiveResumeForUser(employeeId.toHexString())

      const vacId = new mongoose.Types.ObjectId()
      await Vacancy.create({
        _id: vacId,
        employerId,
        title: 'NLP engineer',
        description: 'Neural models and LLM serving.',
        skillsRequired: 'Python, PyTorch, NLP',
        embedding: e,
        salaryMin: 100,
        salaryMax: 200,
      })

      await recordVacancyBehaviourEvent({
        userId: employeeId.toHexString(),
        vacancyId: vacId.toHexString(),
        eventType: 'VACANCY_VIEWED',
        source: 'integration_test',
      })

      const lean = await getActiveResumeLeanForUser(employeeId.toHexString())
      expect(lean).toBeTruthy()
      expect(Array.isArray((lean as { embedding?: number[] }).embedding)).toBe(true)

      const recs = await getTopRecommendations({ userId: employeeId.toHexString(), limit: 5 })
      expect(recs.length).toBeGreaterThanOrEqual(1)
      const top = recs[0]!
      expect(top.vacancyId).toBe(vacId.toString())
      expect(Number.isFinite(top.finalScore)).toBe(true)
      expect(top.finalScore).toBeGreaterThan(0)
      expect(top.finalScore).toBeLessThanOrEqual(1)
      expect(Number.isFinite(top.semanticScore)).toBe(true)
      expect(Number.isFinite(top.behaviourScore)).toBe(true)
    })
  })

  describe('repeated writes stability', () => {
    it('keeps bounded event counts under repeated deduped VIEW calls', async () => {
      const userId = new mongoose.Types.ObjectId()
      const vacancyId = new mongoose.Types.ObjectId()
      for (let i = 0; i < 5; i += 1) {
        await recordVacancyBehaviourEvent({
          userId: userId.toHexString(),
          vacancyId: vacancyId.toHexString(),
          eventType: 'VACANCY_VIEWED',
        })
      }
      expect(await VacancyBehaviourEvent.countDocuments({ userId, vacancyId, eventType: 'VACANCY_VIEWED' })).toBe(1)
    })
  })
})
