import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildHhDescriptionForNormalization, hhStableExternalId, normalizeRawHhVacancy } from '@/lib/job-ingestion/normalize'
import { fetchAndNormalizeHhItVacancies, processHhRawVacanciesForIngestion } from '@/lib/job-ingestion/hh/fetch-it-vacancies'
import { mergeSearchItemAndDetail } from '@/lib/job-ingestion/hh/merge-search-item-detail'
import { loadMockRawHhVacancies } from '@/lib/job-ingestion/mock'
import { runNormalizeAndValidateFromHhRaw } from '@/lib/job-ingestion/pipeline'

describe('HH merge + parse safety', () => {
  it('mergeSearchItemAndDetail returns null without id', () => {
    expect(mergeSearchItemAndDetail({}, { name: 'x' })).toBeNull()
    expect(mergeSearchItemAndDetail(null, null)).toBeNull()
  })

  it('dedupes key_skills case-insensitively', () => {
    const merged = mergeSearchItemAndDetail(
      { id: '1', key_skills: [{ name: 'Go' }, { name: 'go' }] },
      { id: '1', key_skills: [{ name: 'Rust' }] }
    )
    expect(merged?.key_skills?.map((k) => k.name).sort()).toEqual(['Go', 'Rust'])
  })

  it('tolerates malformed listing and detail shapes', () => {
    const merged = mergeSearchItemAndDetail(
      { id: '42', employer: 'not-an-object' as unknown as Record<string, never> },
      { id: 42, salary: 'broken' as unknown as Record<string, never> }
    )
    expect(merged?.id).toBe('42')
    expect(merged?.salary).toBeNull()
  })
})

describe('HH normalization + validation integration', () => {
  const fixed = new Date('2026-03-01T00:00:00.000Z')

  it('hhStableExternalId is deterministic', () => {
    expect(hhStableExternalId('123')).toBe('hh_123')
    expect(hhStableExternalId('hh_123')).toBe('hh_123')
  })

  it('buildHhDescriptionForNormalization pads short HTML bodies', () => {
    const raw = loadMockRawHhVacancies()[0]
    const title = 'T'
    const company = 'C'
    const location = 'L'
    const text = buildHhDescriptionForNormalization(
      { ...raw, id: '1', description: '<p>x</p>' },
      title,
      company,
      location
    )
    expect(text.length).toBeGreaterThanOrEqual(24)
  })

  it('normalizeRawHhVacancy is deterministic for same inputs', () => {
    const raw = loadMockRawHhVacancies()[0]
    expect(normalizeRawHhVacancy(raw, fixed)).toEqual(normalizeRawHhVacancy(raw, fixed))
  })

  it('runNormalizeAndValidateFromHhRaw accepts fixture', () => {
    const raw = loadMockRawHhVacancies()[0]
    const res = runNormalizeAndValidateFromHhRaw(raw, fixed)
    expect(res.ok).toBe(true)
  })
})

describe('processHhRawVacanciesForIngestion', () => {
  it('skips rows with missing id safely', () => {
    const { vacancies, skipped } = processHhRawVacanciesForIngestion([{ id: '' } as never])
    expect(vacancies).toHaveLength(0)
    expect(skipped.length).toBeGreaterThan(0)
  })
})

describe('fetchAndNormalizeHhItVacancies (mocked fetch)', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  function mockFetchForTwoVacancies() {
    const longDesc =
      '<p>Backend engineer role for testing ingestion pipeline with sufficient text length.</p>'

    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url

      if (url.includes('/vacancies?')) {
        return new Response(
          JSON.stringify({
            items: [
              { id: '111', name: 'Backend dev', area: { name: 'Astana' } },
              { id: '222', name: 'Frontend dev', area: { name: 'Almaty' } },
            ],
            pages: 2,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url.endsWith('/vacancies/111') || url.includes('/vacancies/111?')) {
        return new Response(
          JSON.stringify({
            id: '111',
            name: 'Backend dev',
            description: longDesc,
            employer: { name: 'ACME' },
            alternate_url: 'https://example.com/111',
            employment: { name: 'Full-time' },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      if (url.endsWith('/vacancies/222') || url.includes('/vacancies/222?')) {
        return new Response(
          JSON.stringify({
            id: '222',
            name: 'Frontend dev',
            description: longDesc,
            employer: { name: 'ACME' },
            alternate_url: 'https://example.com/222',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response('not found', { status: 404 })
    }) as typeof fetch
  }

  it('returns ok:false on first-page search failure without throwing', async () => {
    globalThis.fetch = vi.fn(async () => new Response('err', { status: 503 })) as typeof fetch
    const res = await fetchAndNormalizeHhItVacancies({
      maxPages: 1,
      perPage: 10,
      maxVacancies: 5,
      baseUrl: 'https://api.hh.ru',
      userAgent: 'test-agent',
      searchQuery: 'IT',
      areaIds: [],
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.vacancies).toEqual([])
  })

  it('respects maxVacancies cap on detail fetches', async () => {
    mockFetchForTwoVacancies()
    const res = await fetchAndNormalizeHhItVacancies({
      maxPages: 2,
      perPage: 10,
      maxVacancies: 1,
      baseUrl: 'https://api.hh.ru',
      userAgent: 'test-agent',
      searchQuery: 'developer',
      areaIds: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.vacancies).toHaveLength(1)
      expect(res.vacancies[0].externalId).toBe('hh_111')
      expect(res.meta.detailRequests).toBe(1)
    }
  })

  it('returns vacancies and skips failed detail rows', async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/vacancies?')) {
        return new Response(
          JSON.stringify({
            items: [
              { id: '333', name: 'OK job', area: { name: 'A' } },
              { id: '444', name: 'Bad job', area: { name: 'B' } },
            ],
            pages: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.includes('/vacancies/333')) {
        return new Response(
          JSON.stringify({
            id: '333',
            name: 'OK job',
            description:
              '<p>Long description for validation minimum length requirements for job ingestion tests.</p>',
            employer: { name: 'Co' },
            alternate_url: 'https://example.com/333',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (url.includes('/vacancies/444')) {
        return new Response('nope', { status: 500 })
      }
      return new Response('missing', { status: 404 })
    }) as typeof fetch

    const res = await fetchAndNormalizeHhItVacancies({
      maxPages: 1,
      perPage: 10,
      maxVacancies: 5,
      baseUrl: 'https://api.hh.ru',
      userAgent: 'test-agent',
      searchQuery: 'IT',
      areaIds: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.vacancies.some((v) => v.externalId === 'hh_333')).toBe(true)
      expect(res.skipped.some((s) => s.externalId === 'hh_444')).toBe(true)
    }
  })

  it('stops paginating when a page returns zero items', async () => {
    let pageCalls = 0
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      if (url.includes('/vacancies?')) {
        pageCalls += 1
        const page = new URL(url).searchParams.get('page')
        if (page === '0') {
          return new Response(JSON.stringify({ items: [{ id: '1', name: 'A' }], pages: 3 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ items: [], pages: 3 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (url.includes('/vacancies/1')) {
        return new Response(
          JSON.stringify({
            id: '1',
            name: 'A',
            description:
              '<p>Second page empty stops pagination; long text for validator minimum length.</p>',
            employer: { name: 'E' },
            alternate_url: 'https://example.com/1',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response('x', { status: 404 })
    }) as typeof fetch

    const res = await fetchAndNormalizeHhItVacancies({
      maxPages: 5,
      perPage: 10,
      maxVacancies: 10,
      baseUrl: 'https://api.hh.ru',
      userAgent: 'test-agent',
      searchQuery: 'IT',
      areaIds: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(pageCalls).toBe(2)
      expect(res.meta.pagesFetched).toBe(2)
    }
  })
})
