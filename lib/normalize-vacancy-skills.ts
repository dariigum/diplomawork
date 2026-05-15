const SKILL_DELIMITERS = /[,;/|]/

export type NormalizeVacancySkillsOptions = {
  /** When true, tokens are lowercased (behaviour / matching pipelines). */
  lowercase?: boolean
  /** Minimum token length after trim. Default 1. */
  minLength?: number
  /** Maximum token length after trim. Default 120. */
  maxLength?: number
}

function splitDelimitedString(raw: string): string[] {
  if (!raw.trim()) return []
  return raw.split(SKILL_DELIMITERS)
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
 * Deterministic skill list from vacancy metadata (string, array, or missing).
 * Never throws; returns [] for invalid input.
 */
export function normalizeVacancySkills(
  value: unknown,
  options?: NormalizeVacancySkillsOptions,
): string[] {
  const minLength = options?.minLength ?? 1
  const maxLength = options?.maxLength ?? 120
  const lowercase = options?.lowercase ?? false

  const seen = new Set<string>()
  const out: string[] = []

  for (let part of collectRawParts(value)) {
    part = part.trim()
    if (!part) continue

    if (lowercase) {
      part = part.toLowerCase().replace(/\s+/g, ' ')
    }

    if (part.length < minLength || part.length > maxLength) continue

    const dedupeKey = part.toLowerCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    out.push(part)
  }

  return out
}
