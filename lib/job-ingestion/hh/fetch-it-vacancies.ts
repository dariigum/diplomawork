import type { NormalizedVacancyInput } from '../types/normalized-vacancy'
import type { RawHHVacancy } from '../types/raw-hh'
import { hhStableExternalId, normalizeRawHhVacancy } from '../normalize/from-hh-raw'
import { validateNormalizedVacancyInput } from '../validate'
import type { HhApiVacanciesSearchResponse } from './api-types'
import { hhApiGetJson, hhThrottleMs } from './api-client'
import type { HhItFetchConfig } from './config'
import { resolveHhItFetchConfig } from './config'
import { mergeSearchItemAndDetail } from './merge-search-item-detail'
import { readStringField, safeRecord } from './parse-safe'

export type HhIngestionMeta = {
  pagesFetched: number
  searchRequests: number
  detailRequests: number
  listingVacanciesSeen: number
  acceptedCount: number
  skippedCount: number
}

export type HhSkippedRecord = {
  externalId?: string
  reasons: string[]
}

export type HhIngestionResult =
  | {
      ok: true
      vacancies: NormalizedVacancyInput[]
      skipped: HhSkippedRecord[]
      meta: HhIngestionMeta
    }
  | {
      ok: false
      error: string
      vacancies: []
      skipped: HhSkippedRecord[]
      meta: HhIngestionMeta
    }

function emptyMeta(): HhIngestionMeta {
  return {
    pagesFetched: 0,
    searchRequests: 0,
    detailRequests: 0,
    listingVacanciesSeen: 0,
    acceptedCount: 0,
    skippedCount: 0,
  }
}

/**
 * Normalize + validate a batch of raw HH rows. Never throws.
 */
export function processHhRawVacanciesForIngestion(
  raws: RawHHVacancy[],
  now = new Date()
): { vacancies: NormalizedVacancyInput[]; skipped: HhSkippedRecord[] } {
  const vacancies: NormalizedVacancyInput[] = []
  const skipped: HhSkippedRecord[] = []

  for (const raw of raws) {
    try {
      if (!String(raw.id ?? '').trim()) {
        skipped.push({ reasons: ['Missing vacancy id'] })
        continue
      }
      const normalized = normalizeRawHhVacancy(raw, now)
      const v = validateNormalizedVacancyInput(normalized)
      if (v.ok) vacancies.push(v.value)
      else skipped.push({ externalId: normalized.externalId, reasons: v.issues })
    } catch (error) {
      const id = String(raw.id ?? '').trim()
      skipped.push({
        externalId: id ? hhStableExternalId(id) : undefined,
        reasons: [error instanceof Error ? error.message : 'Unhandled normalization error'],
      })
    }
  }

  return { vacancies, skipped }
}

function listingItemId(item: unknown): string | null {
  const rec = safeRecord(item)
  if (!rec) return null
  return readStringField(rec, 'id') ?? null
}

/**
 * Fetches IT-oriented vacancies from HeadHunter with strict page and vacancy caps,
 * merges listing + detail payloads, then normalizes + validates.
 *
 * - No Mongo writes.
 * - Never throws: failures return `{ ok: false, error, ... }`.
 * - Malformed JSON fields are handled via `mergeSearchItemAndDetail` + try/catch per row.
 */
export async function fetchAndNormalizeHhItVacancies(
  overrides?: Partial<HhItFetchConfig>
): Promise<HhIngestionResult> {
  const meta = emptyMeta()
  const skipped: HhSkippedRecord[] = []
  const config = resolveHhItFetchConfig(overrides)
  const listingBuffer: unknown[] = []

  try {
    for (let page = 0; page < config.maxPages; page += 1) {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(config.perPage),
        text: config.searchQuery,
      })
      for (const areaId of config.areaIds) {
        params.append('area', areaId)
      }

      meta.searchRequests += 1
      const res = await hhApiGetJson<HhApiVacanciesSearchResponse>('vacancies', params, config)
      if (!res.ok) {
        if (page === 0) {
          return {
            ok: false,
            error: `HH vacancies search failed (${res.status}): ${res.message}`,
            vacancies: [],
            skipped: [],
            meta,
          }
        }
        break
      }

      const items = Array.isArray(res.data.items) ? res.data.items : []
      meta.pagesFetched += 1
      meta.listingVacanciesSeen += items.length

      for (const item of items) {
        if (listingBuffer.length >= config.maxVacancies) break
        listingBuffer.push(item)
      }

      if (items.length === 0 || listingBuffer.length >= config.maxVacancies) {
        break
      }

      await hhThrottleMs(120)
    }

    const mergedRaws: RawHHVacancy[] = []

    for (const item of listingBuffer) {
      const id = listingItemId(item)
      if (!id) {
        skipped.push({ reasons: ['Listing item missing id'] })
        continue
      }

      meta.detailRequests += 1
      const detailRes = await hhApiGetJson<unknown>(
        `vacancies/${encodeURIComponent(id)}`,
        new URLSearchParams(),
        config
      )

      if (!detailRes.ok) {
        skipped.push({
          externalId: hhStableExternalId(id),
          reasons: [`Vacancy detail request failed (${detailRes.status}): ${detailRes.message}`],
        })
        await hhThrottleMs(80)
        continue
      }

      try {
        const merged = mergeSearchItemAndDetail(item, detailRes.data)
        if (!merged) {
          skipped.push({ externalId: hhStableExternalId(id), reasons: ['Merge returned null'] })
        } else {
          mergedRaws.push(merged)
        }
      } catch (error) {
        skipped.push({
          externalId: hhStableExternalId(id),
          reasons: [error instanceof Error ? error.message : 'Merge threw'],
        })
      }

      await hhThrottleMs(80)
    }

    const { vacancies, skipped: postSkipped } = processHhRawVacanciesForIngestion(mergedRaws, new Date())
    const allSkipped = [...skipped, ...postSkipped]
    meta.acceptedCount = vacancies.length
    meta.skippedCount = allSkipped.length

    return { ok: true, vacancies, skipped: allSkipped, meta }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected HH ingestion error'
    return {
      ok: false,
      error: message,
      vacancies: [],
      skipped: [],
      meta,
    }
  }
}
