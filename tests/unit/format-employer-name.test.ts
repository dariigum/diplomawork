import { describe, expect, it } from 'vitest'
import {
  EMPLOYER_HIDDEN_LABEL,
  EMPLOYER_NOT_SPECIFIED_LABEL,
  EMPLOYER_UNKNOWN_LABEL,
  employerDisplayInitials,
  formatEmployerName,
} from '@/lib/format-employer-name'

describe('formatEmployerName', () => {
  it('returns readable company names', () => {
    expect(formatEmployerName('Google')).toBe('Google')
    expect(formatEmployerName({ name: 'Acme Corp' })).toBe('Acme Corp')
  })

  it('returns unknown for nullish and malformed input', () => {
    expect(formatEmployerName(null)).toBe(EMPLOYER_UNKNOWN_LABEL)
    expect(formatEmployerName(undefined)).toBe(EMPLOYER_UNKNOWN_LABEL)
    expect(formatEmployerName(42)).toBe(EMPLOYER_UNKNOWN_LABEL)
    expect(formatEmployerName({})).toBe(EMPLOYER_UNKNOWN_LABEL)
    expect(formatEmployerName(NaN)).toBe(EMPLOYER_UNKNOWN_LABEL)
    expect(formatEmployerName(true)).toBe(EMPLOYER_UNKNOWN_LABEL)
    expect(formatEmployerName({ name: 42 })).toBe(EMPLOYER_UNKNOWN_LABEL)
  })

  it('returns not specified for empty strings', () => {
    expect(formatEmployerName('')).toBe(EMPLOYER_NOT_SPECIFIED_LABEL)
    expect(formatEmployerName('   ')).toBe(EMPLOYER_NOT_SPECIFIED_LABEL)
    expect(formatEmployerName({ name: '' })).toBe(EMPLOYER_NOT_SPECIFIED_LABEL)
    expect(formatEmployerName({ name: '   ' })).toBe(EMPLOYER_NOT_SPECIFIED_LABEL)
  })

  it('maps hidden employer markers', () => {
    expect(formatEmployerName('hidden')).toBe(EMPLOYER_HIDDEN_LABEL)
    expect(formatEmployerName('PRIVATE')).toBe(EMPLOYER_HIDDEN_LABEL)
    expect(formatEmployerName('  anonymous  ')).toBe(EMPLOYER_HIDDEN_LABEL)
    expect(formatEmployerName({ name: 'confidential' })).toBe(EMPLOYER_HIDDEN_LABEL)
  })
})

describe('employerDisplayInitials', () => {
  it('derives initials from company name', () => {
    expect(employerDisplayInitials('Acme Corp')).toBe('AC')
    expect(employerDisplayInitials('Google')).toBe('GO')
  })

  it('falls back when employer is unknown', () => {
    expect(employerDisplayInitials(null)).toBe('JC')
    expect(employerDisplayInitials('')).toBe('JC')
    expect(employerDisplayInitials('hidden')).toBe('JC')
  })
})
