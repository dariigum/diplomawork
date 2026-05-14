/**
 * HeadHunter (HH) — Stage 6B minimal client + merge + fetch pipeline.
 *
 * - Use `fetchAndNormalizeHhItVacancies` for bounded network ingestion (no persistence).
 * - Set `HH_USER_AGENT` (and optionally `HH_API_TOKEN`) for reliable API access.
 * - Offline: set `JOBFLOW_OFFLINE_INGESTION=1` or `JOBFLOW_OFFLINE_DEMO=1` so `fetchAndNormalizeHhItVacancies` uses `data/demo-ingestion-vacancies.json` (no HTTP). See `buildOfflineHhIngestionResult`.
 */

export { resolveHhItFetchConfig, type HhItFetchConfig, type HhItFetchLimits } from './config'
export { hhApiGetJson, hhThrottleMs } from './api-client'
export type { HhApiVacanciesSearchResponse } from './api-types'
export { mergeSearchItemAndDetail } from './merge-search-item-detail'
export {
  fetchAndNormalizeHhItVacancies,
  processHhRawVacanciesForIngestion,
  type HhIngestionMeta,
  type HhIngestionResult,
  type HhSkippedRecord,
} from './fetch-it-vacancies'
export { buildOfflineHhIngestionResult } from '../mock/offline-hh-result'
