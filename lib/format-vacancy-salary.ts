/** Display policy for vacancy salary fields (may be null from ingestion). */
export const SALARY_NOT_SPECIFIED_LABEL = 'Salary not specified'

/** Positive finite number suitable for salary display. */
export function isValidSalaryAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

/**
 * Unified display string for vacancy salary bounds.
 * Handles null, undefined, NaN, and non-finite values without throwing.
 */
export function formatVacancySalary(salaryMin: unknown, salaryMax: unknown): string {
  const minOk = isValidSalaryAmount(salaryMin)
  const maxOk = isValidSalaryAmount(salaryMax)

  if (minOk && maxOk) {
    return `${formatUsd(salaryMin)} - ${formatUsd(salaryMax)}`
  }
  if (minOk) {
    return `From ${formatUsd(salaryMin)}`
  }
  if (maxOk) {
    return `Up to ${formatUsd(salaryMax)}`
  }
  return SALARY_NOT_SPECIFIED_LABEL
}
