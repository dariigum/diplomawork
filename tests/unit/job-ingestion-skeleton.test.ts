import { describe, expect, it } from 'vitest'

import type { NormalizedVacancyInput } from '@/lib/job-ingestion/types'
import { loadMockNormalizedVacancies, loadMockRawHhVacancies } from '@/lib/job-ingestion/mock'
import { normalizeRawHhVacancy, stripHtmlToPlainText } from '@/lib/job-ingestion/normalize'
import { runNormalizeAndValidateFromHhRaw, runValidateOnly } from '@/lib/job-ingestion/pipeline'
import { validateNormalizedVacancyInput } from '@/lib/job-ingestion/validate'

describe('job-ingestion normalize', () => {
  it('stripHtmlToPlainText is deterministic', () => {
    const html = '<p>A  <b>test</b></p>'
    expect(stripHtmlToPlainText(html)).toBe('A test')
  })

  it('normalizes mock HH fixture with stable externalId and REMOTE when schedule says remote', () => {
    const [raw] = loadMockRawHhVacancies()
    const fixed = new Date('2026-05-01T00:00:00.000Z')
    const n = normalizeRawHhVacancy(raw, fixed)
    expect(n.source).toBe('HH')
    expect(n.externalId).toBe('hh_9000001')
    expect(n.workMode).toBe('REMOTE')
    expect(n.importedAt).toBe(fixed.toISOString())
    expect(n.description).not.toMatch(/</)
    expect(n.skillsRequired).toContain('React')
    expect(n.skillsRequired).toContain('TypeScript')
  })
})

describe('job-ingestion validate', () => {
  it('accepts mock normalized fixtures', () => {
    for (const row of loadMockNormalizedVacancies()) {
      const r = validateNormalizedVacancyInput(row)
      expect(r.ok).toBe(true)
    }
  })

  it('rejects invalid source identity', () => {
    const base = loadMockNormalizedVacancies()[0]
    const r = validateNormalizedVacancyInput({
      ...base,
      source: 'UNKNOWN',
    } as unknown as NormalizedVacancyInput)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.issues.some((i) => i.includes('source'))).toBe(true)
  })

  it('rejects short description and unsafe externalId', () => {
    const base = loadMockNormalizedVacancies()[0]
    const r1 = validateNormalizedVacancyInput({ ...base, description: 'short' })
    expect(r1.ok).toBe(false)

    const r2 = validateNormalizedVacancyInput({ ...base, externalId: 'bad id spaces' })
    expect(r2.ok).toBe(false)
  })
})

describe('job-ingestion pipeline skeleton', () => {
  it('runNormalizeAndValidateFromHhRaw returns ok for fixture', () => {
    const [raw] = loadMockRawHhVacancies()
    const res = runNormalizeAndValidateFromHhRaw(raw, new Date('2026-05-01T00:00:00.000Z'))
    expect(res.ok).toBe(true)
  })

  it('runValidateOnly matches validateNormalizedVacancyInput', () => {
    const row = loadMockNormalizedVacancies()[0]
    expect(runValidateOnly(row)).toEqual(validateNormalizedVacancyInput(row))
  })
})
