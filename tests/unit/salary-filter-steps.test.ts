import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SALARY_RANGE,
  formatSalaryFilterLabel,
  jobSalaryOverlapsFilter,
  SALARY_FILTER_STEPS,
  sliderIndicesToSalaryRange,
} from '@/lib/salary-filter-steps'

describe('salary-filter-steps', () => {
  it('includes requested low and mid gradations', () => {
    expect(SALARY_FILTER_STEPS).toEqual(
      expect.arrayContaining([0, 100, 250, 500, 1000, 2200, 3000]),
    )
    expect(SALARY_FILTER_STEPS.at(-1)).toBe(50000)
  })

  it('formats labels including $50k+', () => {
    expect(formatSalaryFilterLabel(0)).toBe('$0')
    expect(formatSalaryFilterLabel(1000)).toBe('$1k')
    expect(formatSalaryFilterLabel(2200)).toBe('$2,200')
    expect(formatSalaryFilterLabel(50000, { isRangeEnd: true })).toBe('$50k+')
  })

  it('maps slider indices back to salary values', () => {
    const range = sliderIndicesToSalaryRange([0, SALARY_FILTER_STEPS.length - 1])
    expect(range).toEqual(DEFAULT_SALARY_RANGE)
  })

  it('matches overlapping job salaries', () => {
    expect(jobSalaryOverlapsFilter('$2,200 - $4,500', [2000, 3000])).toBe(true)
    expect(jobSalaryOverlapsFilter('$120,000 - $180,000', [0, 50000])).toBe(false)
    expect(jobSalaryOverlapsFilter('Salary not specified', [1000, 2000])).toBe(true)
  })
})
