/** Display policy when employer relation or name is missing. */
export const EMPLOYER_UNKNOWN_LABEL = 'Unknown company'

/** Display policy when name field exists but is blank. */
export const EMPLOYER_NOT_SPECIFIED_LABEL = 'Company not specified'

/** Display policy for hidden / anonymous ingestion markers. */
export const EMPLOYER_HIDDEN_LABEL = 'Hidden employer'

const HIDDEN_EMPLOYER_MARKERS = new Set([
  'hidden',
  'private',
  'anonymous',
  'confidential',
])

function normalizeNameKey(raw: string): string {
  return raw.toLowerCase().replace(/[\s_-]+/g, ' ').trim()
}

function isHiddenEmployerMarker(raw: string): boolean {
  return HIDDEN_EMPLOYER_MARKERS.has(normalizeNameKey(raw))
}

function extractNameString(value: unknown): string | null {
  if (value == null) return null

  if (typeof value === 'string') return value

  if (typeof value === 'object') {
    if (!('name' in value)) return null
    const n = (value as { name?: unknown }).name
    if (typeof n === 'string') return n
    return null
  }

  return null
}

/**
 * Deterministic employer display name from a string, populated employer doc, or missing value.
 * Never throws.
 */
export function formatEmployerName(value: unknown): string {
  const raw = extractNameString(value)

  if (raw === null) {
    return EMPLOYER_UNKNOWN_LABEL
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return EMPLOYER_NOT_SPECIFIED_LABEL
  }

  if (isHiddenEmployerMarker(trimmed)) {
    return EMPLOYER_HIDDEN_LABEL
  }

  return trimmed
}

/** Two-letter initials for job cards; safe when employer metadata is incomplete. */
export function employerDisplayInitials(value: unknown): string {
  const label = formatEmployerName(value)
  if (
    label === EMPLOYER_UNKNOWN_LABEL ||
    label === EMPLOYER_NOT_SPECIFIED_LABEL ||
    label === EMPLOYER_HIDDEN_LABEL
  ) {
    return 'JC'
  }

  const words = label.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0]![0] ?? ''}${words[1]![0] ?? ''}`.toUpperCase()
  }
  return label.slice(0, 2).toUpperCase()
}
