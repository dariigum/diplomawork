import type { HhIngestionMeta, HhIngestionResult, HhSkippedRecord } from '../hh/fetch-it-vacancies'
import type { NormalizedVacancyInput } from '../types/normalized-vacancy'
import { validateNormalizedVacancyInput } from '../validate'

import { loadOfflineDemoVacancyInputs } from './load-offline-demo-dataset'

/**
 * Builds the same `HhIngestionResult` shape as live HH fetch, but from local JSON.
 * Used when `JOBFLOW_OFFLINE_INGESTION` / `JOBFLOW_OFFLINE_DEMO` is enabled (no network).
 */
export function buildOfflineHhIngestionResult(): HhIngestionResult {
  const vacancies: NormalizedVacancyInput[] = []
  const skipped: HhSkippedRecord[] = []
  const rows = loadOfflineDemoVacancyInputs()

  for (const row of rows) {
    const v = validateNormalizedVacancyInput(row)
    if (v.ok) {
      vacancies.push(v.value)
    } else {
      skipped.push({ externalId: row.externalId, reasons: v.issues })
    }
  }

  const meta: HhIngestionMeta = {
    pagesFetched: 0,
    searchRequests: 0,
    detailRequests: 0,
    listingVacanciesSeen: rows.length,
    acceptedCount: vacancies.length,
    skippedCount: skipped.length,
    offlineDemo: true,
  }

  return { ok: true, vacancies, skipped, meta }
}
