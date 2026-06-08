/** Discrete salary filter steps (USD). Max step is shown as $50k+. */
export const SALARY_FILTER_STEPS = [
  0, 100, 200, 250, 300, 350, 400, 450, 500,
  600, 700, 800, 900, 1000,
  1200, 1400, 1600, 1800, 2000,
  2200, 2400, 2600, 2800, 3000,
  3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600, 4800, 5000,
  5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
  11000, 12000, 13000, 14000, 15000, 16000, 17000, 18000, 19000, 20000,
  22000, 24000, 26000, 28000, 30000, 35000, 40000, 45000, 50000,
] as const

export const SALARY_FILTER_MAX = SALARY_FILTER_STEPS[SALARY_FILTER_STEPS.length - 1]

export const DEFAULT_SALARY_RANGE: [number, number] = [0, SALARY_FILTER_MAX]

type SalaryFilterStep = (typeof SALARY_FILTER_STEPS)[number]

export function snapSalaryToStep(value: number): SalaryFilterStep {
  let closest: SalaryFilterStep = SALARY_FILTER_STEPS[0]
  let minDiff = Math.abs(value - closest)
  for (const step of SALARY_FILTER_STEPS) {
    const diff = Math.abs(value - step)
    if (diff < minDiff) {
      minDiff = diff
      closest = step
    }
  }
  return closest
}

export function salaryRangeToSliderIndices(range: [number, number]): [number, number] {
  const minIndex = SALARY_FILTER_STEPS.indexOf(snapSalaryToStep(range[0]))
  const maxIndex = SALARY_FILTER_STEPS.indexOf(snapSalaryToStep(range[1]))
  return [
    minIndex === -1 ? 0 : minIndex,
    maxIndex === -1 ? SALARY_FILTER_STEPS.length - 1 : maxIndex,
  ]
}

export function sliderIndicesToSalaryRange(indices: [number, number]): [number, number] {
  const [minIndex, maxIndex] = indices
  const lo = Math.min(minIndex, maxIndex)
  const hi = Math.max(minIndex, maxIndex)
  return [SALARY_FILTER_STEPS[lo] ?? 0, SALARY_FILTER_STEPS[hi] ?? SALARY_FILTER_MAX]
}

export function formatSalaryFilterLabel(value: number, options?: { isRangeEnd?: boolean }): string {
  if (value >= SALARY_FILTER_MAX) {
    return options?.isRangeEnd ? '$50k+' : '$50k'
  }
  if (value === 0) return '$0'
  if (value >= 1000 && value % 1000 === 0) return `$${value / 1000}k`
  return `$${value.toLocaleString('en-US')}`
}

export function isDefaultSalaryRange(range: [number, number]): boolean {
  return range[0] === 0 && range[1] >= SALARY_FILTER_MAX
}

export function parseJobSalaryBounds(salary: string): { min: number; max: number } | null {
  const amounts = [...salary.matchAll(/\$([\d,]+)/g)]
    .map((match) => Number.parseInt(match[1].replace(/,/g, ''), 10))
    .filter((amount) => Number.isFinite(amount))

  if (amounts.length === 0) return null

  return {
    min: Math.min(...amounts),
    max: Math.max(...amounts),
  }
}

export function jobSalaryOverlapsFilter(
  salary: string,
  range: [number, number],
): boolean {
  const bounds = parseJobSalaryBounds(salary)
  if (!bounds) return true
  return bounds.max >= range[0] && bounds.min <= range[1]
}
