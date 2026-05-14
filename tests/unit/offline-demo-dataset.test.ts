import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildOfflineHhIngestionResult, loadOfflineDemoVacancyInputs } from '@/lib/job-ingestion/mock'
import { validateNormalizedVacancyInput } from '@/lib/job-ingestion/validate'

describe('offline demo dataset', () => {
  it('loads a stable multi-cluster IT vacancy set', () => {
    const rows = loadOfflineDemoVacancyInputs()
    expect(rows.length).toBeGreaterThanOrEqual(8)
    const companies = new Set(rows.map((r) => r.company))
    expect(companies.size).toBeGreaterThanOrEqual(6)
    expect(rows.every((r) => r.source === 'SEED')).toBe(true)
    expect(rows.every((r) => r.externalId.startsWith('SEED:'))).toBe(true)
  })

  it('every row passes ingestion validation', () => {
    for (const row of loadOfflineDemoVacancyInputs()) {
      const v = validateNormalizedVacancyInput(row)
      expect(v.ok, row.externalId).toBe(true)
    }
  })

  it('buildOfflineHhIngestionResult matches live fetch shape and skips network', () => {
    const r = buildOfflineHhIngestionResult()
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.meta.offlineDemo).toBe(true)
    expect(r.vacancies.length).toBe(loadOfflineDemoVacancyInputs().length)
    expect(r.meta.acceptedCount).toBe(r.vacancies.length)
  })
})

describe('fetchAndNormalizeHhItVacancies offline gate', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('returns local demo set when JOBFLOW_OFFLINE_INGESTION=1 without calling fetch', async () => {
    vi.stubEnv('JOBFLOW_OFFLINE_INGESTION', '1')
    const fetchSpy = vi.fn()
    globalThis.fetch = fetchSpy as typeof fetch

    const { fetchAndNormalizeHhItVacancies } = await import('@/lib/job-ingestion/hh/fetch-it-vacancies')
    const res = await fetchAndNormalizeHhItVacancies()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.meta.offlineDemo).toBe(true)
      expect(res.vacancies.length).toBeGreaterThan(0)
    }
  })
})
