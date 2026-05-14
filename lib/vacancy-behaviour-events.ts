import mongoose from 'mongoose'
import dbConnect from '@/lib/db/mongoose'
import { VacancyBehaviourEvent, type VacancyBehaviourEventType } from '@/lib/db/schema'

/** Dedupe window for VACANCY_VIEWED to limit writes on refresh / back navigation. */
const VIEW_DEDUPE_MS = 30 * 60 * 1000

export type RecordVacancyBehaviourEventParams = {
  userId: string
  vacancyId: string
  eventType: VacancyBehaviourEventType
  /** Optional surface id for analytics (e.g. job_detail_page). */
  source?: string
}

/**
 * Central append-only write for vacancy behaviour. Isolated from recommendation ranking.
 * Failures are logged and swallowed so product flows stay unchanged.
 */
export async function recordVacancyBehaviourEvent(params: RecordVacancyBehaviourEventParams): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.userId) || !mongoose.Types.ObjectId.isValid(params.vacancyId)) {
      return
    }

    await dbConnect()
    const userId = new mongoose.Types.ObjectId(params.userId)
    const vacancyId = new mongoose.Types.ObjectId(params.vacancyId)

    if (params.eventType === 'VACANCY_VIEWED') {
      const since = new Date(Date.now() - VIEW_DEDUPE_MS)
      const recent = await VacancyBehaviourEvent.findOne({
        userId,
        vacancyId,
        eventType: 'VACANCY_VIEWED',
        occurredAt: { $gte: since },
      })
        .select('_id')
        .lean()
      if (recent) return
    }

    if (params.eventType === 'VACANCY_APPLIED') {
      const existing = await VacancyBehaviourEvent.findOne({
        userId,
        vacancyId,
        eventType: 'VACANCY_APPLIED',
      })
        .select('_id')
        .lean()
      if (existing) return
    }

    await VacancyBehaviourEvent.create({
      userId,
      vacancyId,
      eventType: params.eventType,
      occurredAt: new Date(),
      ...(params.source ? { source: params.source.slice(0, 64) } : {}),
    })
  } catch (e) {
    console.warn('[JobFlow] Vacancy behaviour event not recorded.', e)
  }
}
