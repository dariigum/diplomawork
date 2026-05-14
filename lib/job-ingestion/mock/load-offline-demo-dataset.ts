import type { NormalizedVacancyInput } from '../types'

import raw from '../../../data/demo-ingestion-vacancies.json'

/**
 * Deterministic offline IT vacancy set for demos and thesis defence (no HeadHunter).
 * Rows use `source: "SEED"` and stable `externalId` values for idempotent re-seeding.
 */
export function loadOfflineDemoVacancyInputs(): NormalizedVacancyInput[] {
  if (!Array.isArray(raw)) return []
  return raw as NormalizedVacancyInput[]
}
