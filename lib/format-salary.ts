export const DEFAULT_SALARY_CURRENCY = 'KZT'

export function normalizeCurrencyCode(currency?: string | null) {
  if (!currency) return ''

  const normalized = currency.trim().toUpperCase()
  if (normalized === 'RUR') return 'RUB'
  return normalized
}

export function hasSalaryValue(value?: number | null) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function formatAmount(value: number, currency?: string | null) {
  const normalizedCurrency = normalizeCurrencyCode(currency) || DEFAULT_SALARY_CURRENCY

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'code',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value.toLocaleString()} ${normalizedCurrency}`
  }
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency?: string | null
) {
  const hasMin = hasSalaryValue(min)
  const hasMax = hasSalaryValue(max)

  if (!hasMin && !hasMax) {
    return 'Salary not specified'
  }

  if (hasMin && hasMax) {
    return `${formatAmount(min!, currency)} - ${formatAmount(max!, currency)}`
  }

  if (hasMin) {
    return `From ${formatAmount(min!, currency)}`
  }

  return `Up to ${formatAmount(max!, currency)}`
}

export function getSalaryFilterValue(min?: number | null, max?: number | null) {
  if (hasSalaryValue(min)) return min!
  if (hasSalaryValue(max)) return max!
  return null
}

export function getSalarySortMin(min?: number | null, max?: number | null) {
  if (hasSalaryValue(min)) return min!
  if (hasSalaryValue(max)) return max!
  return Number.POSITIVE_INFINITY
}

export function getSalarySortMax(min?: number | null, max?: number | null) {
  if (hasSalaryValue(max)) return max!
  if (hasSalaryValue(min)) return min!
  return Number.NEGATIVE_INFINITY
}
