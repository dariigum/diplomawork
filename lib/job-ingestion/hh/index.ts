/**
 * HeadHunter (HH) — Stage 6B minimal client + merge + fetch pipeline.
 *
 * - Use `fetchAndNormalizeHhItVacancies` for bounded network ingestion (no persistence).
 * - Set `HH_USER_AGENT` (and optionally `HH_API_TOKEN`) for reliable API access.
 * - Demo/offline: keep using `loadMockRawHhVacancies` + `processHhRawVacanciesForIngestion`.
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
