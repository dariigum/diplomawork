import type { VacancyBehaviourEventType } from '@/lib/db/schema'

import {
  EVAL_EMPLOYEE_FIXTURES,
  EVAL_TRACKS,
  type EvalEmployeeFixture,
  type EvalTrack,
} from './eval-cohort-fixtures'
import {
  VACANCIES_PER_TRACK,
  evalVacancyExternalId,
  evalVacancyExternalIdsForTrack,
} from './eval-cohort-vacancies'

/** SEED ingestion rows aligned with track (requires npm run ingestion:demo). */
export const SEED_EXTERNAL_IDS_BY_TRACK: Partial<Record<EvalTrack, string[]>> = {
  frontend: ['SEED:frontend-staff-003', 'SEED:fullstack-product-009'],
  backend: ['SEED:backend-go-004', 'SEED:fullstack-product-009'],
  mobile: ['SEED:mobile-flutter-006'],
  qa: ['SEED:security-appsec-010', 'SEED:fullstack-product-009'],
  devops: ['SEED:devops-k8s-005', 'SEED:sre-reliability-008'],
  datascience: ['SEED:data-engineer-007', 'SEED:ml-platform-001'],
  aiml: ['SEED:ml-platform-001', 'SEED:nlp-llm-002'],
}

export type EvalPlannedResponse = {
  vacancyKey: string
  /** Days before seed run (train: 30–7, holdout: 3–1). */
  daysAgo: number
}

export type EvalPlannedEvent = {
  vacancyKey: string
  eventType: VacancyBehaviourEventType
  daysAgo: number
}

export type EvalUserInteractionPlan = {
  userKey: string
  /** 4–5 SavedVacancy rows (ground truth; occurredAt fixed at epoch in eval script). */
  savedVacancyKeys: string[]
  /** 3 apply rows with createdAt for holdout split. */
  responses: EvalPlannedResponse[]
  /** 8–10 behaviour events (train + holdout timestamps). */
  events: EvalPlannedEvent[]
}

function uniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const k of keys) {
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}

/** Rotate track EVAL ids per user slot to reduce GT collision across cohort. */
function gtVacancyPoolForEmployee(employee: EvalEmployeeFixture): string[] {
  const trackEval = evalVacancyExternalIdsForTrack(employee.track)
  const offset = ((employee.slot - 1) * 2) % Math.max(1, trackEval.length - 6)
  const rotated = [...trackEval.slice(offset), ...trackEval.slice(0, offset)]
  const seeds = SEED_EXTERNAL_IDS_BY_TRACK[employee.track] ?? []
  return uniqueKeys([...rotated, ...seeds])
}

/** Cross-track VIEW noise (not ground truth). */
function noiseKeysForTrack(track: EvalTrack, slot: number): string[] {
  const others = EVAL_TRACKS.filter((t) => t !== track)
  return others.slice(0, 3).map((t, i) => {
    const idx = ((slot + i * 3) % VACANCIES_PER_TRACK) + 1
    return evalVacancyExternalId(t, idx)
  })
}

function pickTrainDays(count: number, offset: number): number[] {
  const pool = [30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8, 7]
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(pool[(i + offset) % pool.length]!)
  }
  return out
}

function pickHoldoutDays(count: number, offset: number): number[] {
  const pool = [3, 2, 1]
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    out.push(pool[(i + offset) % pool.length]!)
  }
  return out
}

function buildPlanForEmployee(employee: EvalEmployeeFixture, index: number): EvalUserInteractionPlan {
  const pool = gtVacancyPoolForEmployee(employee)
  if (pool.length < 8) {
    throw new Error(`[eval-cohort] Insufficient GT pool for ${employee.key}: ${pool.length}`)
  }

  const gt = pool.slice(0, Math.min(12, pool.length))
  const holdoutCount = Math.min(3, Math.max(2, Math.ceil(gt.length * 0.2)))
  const holdoutKeys = gt.slice(-holdoutCount)
  const trainKeys = gt.slice(0, gt.length - holdoutCount)
  const saveKeys = gt.slice(0, Math.min(5, gt.length))

  const trainDays = pickTrainDays(5, index + employee.slot)
  const holdoutDays = pickHoldoutDays(holdoutCount, index)
  const tk = (i: number) => trainKeys[Math.min(i, trainKeys.length - 1)]!
  const hk = (i: number) => holdoutKeys[Math.min(i, holdoutKeys.length - 1)]!
  const noise = noiseKeysForTrack(employee.track, employee.slot)

  const responses: EvalPlannedResponse[] = [
    { vacancyKey: tk(0), daysAgo: trainDays[0]! },
    { vacancyKey: tk(1), daysAgo: trainDays[1]! },
    { vacancyKey: hk(0), daysAgo: holdoutDays[0]! },
  ]

  const events: EvalPlannedEvent[] = [
    { vacancyKey: noise[0]!, eventType: 'VACANCY_VIEWED', daysAgo: 29 - (index % 3) },
    { vacancyKey: noise[1]!, eventType: 'VACANCY_VIEWED', daysAgo: 22 - (index % 2) },
    { vacancyKey: tk(2), eventType: 'VACANCY_VIEWED', daysAgo: trainDays[2]! },
    { vacancyKey: tk(3), eventType: 'VACANCY_SAVED', daysAgo: trainDays[3]! },
    { vacancyKey: tk(4), eventType: 'VACANCY_APPLIED', daysAgo: trainDays[4]! },
    { vacancyKey: hk(0), eventType: 'VACANCY_APPLIED', daysAgo: holdoutDays[0]! },
    { vacancyKey: hk(1), eventType: 'VACANCY_SAVED', daysAgo: holdoutDays[1]! },
    { vacancyKey: hk(2), eventType: 'VACANCY_APPLIED', daysAgo: holdoutDays[2] ?? holdoutDays[0]! },
  ]

  if (trainKeys.length > 5) {
    events.push({
      vacancyKey: tk(5),
      eventType: 'VACANCY_VIEWED',
      daysAgo: 9 + (employee.slot % 3),
    })
  }

  if (holdoutCount >= 3 && holdoutKeys[2]) {
    events.push({
      vacancyKey: hk(2),
      eventType: 'VACANCY_VIEWED',
      daysAgo: 2,
    })
  }

  return {
    userKey: employee.key,
    savedVacancyKeys: saveKeys,
    responses,
    events,
  }
}

/** One interaction plan per eval employee (deterministic). */
export function getEvalCohortInteractionPlans(): EvalUserInteractionPlan[] {
  return EVAL_EMPLOYEE_FIXTURES.map((employee, index) => buildPlanForEmployee(employee, index))
}

/** Ground-truth vacancy count per user (unique save/apply/event keys). */
export function countGroundTruthVacancies(plan: EvalUserInteractionPlan): number {
  const keys = new Set<string>()
  for (const k of plan.savedVacancyKeys) keys.add(k)
  for (const r of plan.responses) keys.add(r.vacancyKey)
  for (const e of plan.events) {
    if (e.eventType === 'VACANCY_SAVED' || e.eventType === 'VACANCY_APPLIED') {
      keys.add(e.vacancyKey)
    }
  }
  return keys.size
}

export function countPlannedBehaviourEvents(plans: EvalUserInteractionPlan[]): number {
  return plans.reduce((sum, p) => sum + p.events.length, 0)
}

export function summarizeEvalCohortInteractionPlans(): {
  users: number
  minGt: number
  maxGt: number
  behaviourEvents: number
} {
  const plans = getEvalCohortInteractionPlans()
  const counts = plans.map(countGroundTruthVacancies)
  return {
    users: plans.length,
    minGt: Math.min(...counts),
    maxGt: Math.max(...counts),
    behaviourEvents: countPlannedBehaviourEvents(plans),
  }
}
