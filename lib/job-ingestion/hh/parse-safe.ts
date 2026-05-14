/**
 * Defensive helpers so malformed API payloads never throw during mapping.
 */

export function safeRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

export function safeString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const t = value.trim()
  return t.length > 0 ? t : undefined
}

export function safeNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  return null
}

export function readStringField(record: Record<string, unknown>, key: string): string | undefined {
  return safeString(record[key])
}
