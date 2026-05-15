const STRING_ARRAY_DELIMITERS = /[,;|]/

export type NormalizeStringArrayOptions = {
  /** Minimum token length after trim. Default 1. */
  minLength?: number
  /** Maximum token length after trim. Default 2000. */
  maxLength?: number
}

function splitDelimitedString(raw: string): string[] {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (STRING_ARRAY_DELIMITERS.test(trimmed) || /\r?\n/.test(trimmed)) {
    return trimmed.split(/[,;|]|\r?\n/)
  }
  return [trimmed]
}

function collectRawParts(value: unknown): string[] {
  if (value == null) return []

  if (Array.isArray(value)) {
    const parts: string[] = []
    for (const item of value) {
      if (item == null) continue
      if (typeof item === 'string') {
        parts.push(...splitDelimitedString(item))
      } else if (typeof item === 'number' && Number.isFinite(item)) {
        parts.push(String(item))
      }
    }
    return parts
  }

  if (typeof value === 'string') {
    return splitDelimitedString(value)
  }

  return []
}

/**
 * Deterministic string list from vacancy metadata (array, delimited string, or missing).
 * Never throws; returns [] for invalid input.
 */
export function normalizeStringArray(
  value: unknown,
  options?: NormalizeStringArrayOptions,
): string[] {
  const minLength = options?.minLength ?? 1
  const maxLength = options?.maxLength ?? 2000

  const seen = new Set<string>()
  const out: string[] = []

  for (let part of collectRawParts(value)) {
    part = part.trim()
    if (!part) continue
    if (part.length < minLength || part.length > maxLength) continue

    const dedupeKey = part.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(part)
  }

  return out
}

/** Alias for readability at call sites focused on safe rendering. */
export const safeStringArray = normalizeStringArray
