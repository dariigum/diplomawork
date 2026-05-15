import { describe, expect, it } from 'vitest'
import { normalizeVacancySkills } from '@/lib/normalize-vacancy-skills'

describe('normalizeVacancySkills', () => {
  it('splits comma-separated string and trims', () => {
    expect(normalizeVacancySkills('React, TypeScript')).toEqual(['React', 'TypeScript'])
  })

  it('accepts string arrays', () => {
    expect(normalizeVacancySkills(['React', 'TS'])).toEqual(['React', 'TS'])
  })

  it('returns empty for null, undefined, and blank', () => {
    expect(normalizeVacancySkills(null)).toEqual([])
    expect(normalizeVacancySkills(undefined)).toEqual([])
    expect(normalizeVacancySkills('')).toEqual([])
    expect(normalizeVacancySkills('   ')).toEqual([])
  })

  it('returns empty for non-string non-array values', () => {
    expect(normalizeVacancySkills(42)).toEqual([])
    expect(normalizeVacancySkills({})).toEqual([])
    expect(normalizeVacancySkills(NaN)).toEqual([])
    expect(normalizeVacancySkills(true)).toEqual([])
  })

  it('filters empty array entries and dedupes case-insensitively', () => {
    expect(normalizeVacancySkills(['React', '', '   ', null, 'react'])).toEqual(['React'])
  })

  it('supports lowercase mode for matching pipelines', () => {
    expect(normalizeVacancySkills('React, TS', { lowercase: true, minLength: 2 })).toEqual([
      'react',
      'ts',
    ])
  })

  it('splits semicolon and pipe delimiters', () => {
    expect(normalizeVacancySkills('Go; Rust | Python')).toEqual(['Go', 'Rust', 'Python'])
  })
})
