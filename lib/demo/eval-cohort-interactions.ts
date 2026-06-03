import type { VacancyBehaviourEventType } from '@/lib/db/schema'

import {
  EVAL_EMPLOYEE_FIXTURES,
  type EvalEmployeeFixture,
  type EvalTrack,
} from './eval-cohort-fixtures'
import { evalVacancyExternalIdsForTrack } from './eval-cohort-vacancies'

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

/** Cross-track noise for VIEW events (not ground truth). */
const NOISE_EXTERNAL_IDS_BY_TRACK: Partial<Record<EvalTrack, string[]>> = {
  frontend: ['EVAL:backend-001', 'EVAL:qa-001', 'EVAL:aiml-001'],
  backend: ['EVAL:frontend-001', 'EVAL:devops-001', 'EVAL:datascience-001'],
  mobile: ['EVAL:frontend-002', 'EVAL:backend-002', 'EVAL:qa-002'],
  qa: ['EVAL:frontend-003', 'EVAL:backend-003', 'EVAL:mobile-001'],
  devops: ['EVAL:backend-004', 'EVAL:aiml-002', 'EVAL:qa-003'],
  datascience: ['EVAL:aiml-003', 'EVAL:backend-001', 'EVAL:frontend-004'],
  aiml: ['EVAL:datascience-002', 'EVAL:backend-005', 'EVAL:frontend-005'],
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
  /** 3–5 SavedVacancy rows (ground truth; occurredAt fixed at epoch in eval script). */
  savedVacancyKeys: string[]
  /** 1–3 apply rows with createdAt for holdout split. */
  responses: EvalPlannedResponse[]
  /** 5–10 behaviour events (train + holdout timestamps). */
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

function gtVacancyPool(employee: EvalEmployeeFixture): string[] {
  const trackEval = evalVacancyExternalIdsForTrack(employee.track)
  const seeds = SEED_EXTERNAL_IDS_BY_TRACK[employee.track] ?? []
  return uniqueKeys([...trackEval, ...seeds])
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
  const pool = gtVacancyPool(employee)
  if (pool.length < 5) {
    throw new Error(`[eval-cohort] Insufficient GT pool for ${employee.key}: ${pool.length}`)
  }

  const gt = pool.slice(0, Math.min(10, pool.length))
  const holdoutCount = Math.min(3, Math.max(1, Math.ceil(gt.length * 0.2)))
  const holdoutKeys = gt.slice(-holdoutCount)
  const trainKeys = gt.slice(0, Math.max(4, gt.length - holdoutCount))
  const saveKeys = gt.slice(0, Math.min(5, gt.length))

  const trainDays = pickTrainDays(4, index)
  const holdoutDays = pickHoldoutDays(3, index)
  const tk = (i: number) => trainKeys[Math.min(i, trainKeys.length - 1)]!
  const hk = (i: number) => holdoutKeys[Math.min(i, holdoutKeys.length - 1)]!

  const responses: EvalPlannedResponse[] = [
    { vacancyKey: tk(0), daysAgo: trainDays[0]! },
    { vacancyKey: tk(1), daysAgo: trainDays[1]! },
    { vacancyKey: hk(0), daysAgo: holdoutDays[0]! },
  ]

  const noise = NOISE_EXTERNAL_IDS_BY_TRACK[employee.track] ?? ['EVAL:qa-001']

  const events: EvalPlannedEvent[] = [
    { vacancyKey: noise[0]!, eventType: 'VACANCY_VIEWED', daysAgo: 29 - (index % 3) },
    { vacancyKey: noise[1]!, eventType: 'VACANCY_VIEWED', daysAgo: 21 - (index % 2) },
    { vacancyKey: tk(2), eventType: 'VACANCY_VIEWED', daysAgo: trainDays[2]! },
    { vacancyKey: tk(3), eventType: 'VACANCY_SAVED', daysAgo: trainDays[3]! },
    { vacancyKey: tk(4), eventType: 'VACANCY_APPLIED', daysAgo: 12 - (index % 2) },
    { vacancyKey: hk(0), eventType: 'VACANCY_APPLIED', daysAgo: holdoutDays[0]! },
    { vacancyKey: hk(1), eventType: 'VACANCY_SAVED', daysAgo: holdoutDays[1]! },
    { vacancyKey: hk(2), eventType: 'VACANCY_APPLIED', daysAgo: holdoutDays[2]! },
  ]

  if (index % 2 === 0 && gt.length > 5) {
    events.push({
      vacancyKey: tk(5),
      eventType: 'VACANCY_VIEWED',
      daysAgo: 9,
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

export function summarizeEvalCohortInteractionPlans(): {
  users: number
  minGt: number
  maxGt: number
} {
  const plans = getEvalCohortInteractionPlans()
  const counts = plans.map(countGroundTruthVacancies)
  return {
    users: plans.length,
    minGt: Math.min(...counts),
    maxGt: Math.max(...counts),
  }
}
