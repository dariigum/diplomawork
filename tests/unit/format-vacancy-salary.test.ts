import { describe, expect, it } from 'vitest'
import {
  formatVacancySalary,
  isValidSalaryAmount,
  SALARY_NOT_SPECIFIED_LABEL,
} from '@/lib/format-vacancy-salary'

describe('formatVacancySalary', () => {
  it('formats min and max', () => {
    expect(formatVacancySalary(1000, 2000)).toBe('$1,000 - $2,000')
  })

  it('formats only min', () => {
    expect(formatVacancySalary(1500, null)).toBe('From $1,500')
  })

  it('formats only max', () => {
    expect(formatVacancySalary(undefined, 3000)).toBe('Up to $3,000')
  })

  it('returns not specified when neither is valid', () => {
    expect(formatVacancySalary(null, null)).toBe(SALARY_NOT_SPECIFIED_LABEL)
    expect(formatVacancySalary(undefined, undefined)).toBe(SALARY_NOT_SPECIFIED_LABEL)
    expect(formatVacancySalary(NaN, NaN)).toBe(SALARY_NOT_SPECIFIED_LABEL)
    expect(formatVacancySalary(0, 0)).toBe(SALARY_NOT_SPECIFIED_LABEL)
  })

  it('treats non-finite and non-number as missing', () => {
    expect(formatVacancySalary('1000', '2000')).toBe(SALARY_NOT_SPECIFIED_LABEL)
    expect(formatVacancySalary(1000, {})).toBe('From $1,000')
    expect(formatVacancySalary('1000', 2000)).toBe('Up to $2,000')
  })
})

describe('isValidSalaryAmount', () => {
  it('accepts positive finite numbers only', () => {
    expect(isValidSalaryAmount(1)).toBe(true)
    expect(isValidSalaryAmount(0)).toBe(false)
    expect(isValidSalaryAmount(null)).toBe(false)
    expect(isValidSalaryAmount(Infinity)).toBe(false)
  })
})
