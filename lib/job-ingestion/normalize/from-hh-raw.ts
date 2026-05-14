import type { NormalizedVacancyInput } from '../types/normalized-vacancy'
import type { RawHHVacancy } from '../types/raw-hh'
import { detectRemoteFromText } from './detect-remote'
import { stripHtmlToPlainText } from './strip-html'

function coalesceSalary(raw: RawHHVacancy): NormalizedVacancyInput['salary'] {
  const from = raw.salary?.from ?? null
  const to = raw.salary?.to ?? null
  if (from == null && to == null) return null
  return { min: from, max: to }
}

function pickLocation(raw: RawHHVacancy): string {
  const city = raw.address?.city?.trim() || raw.area?.name?.trim() || ''
  const rawAddr = raw.address?.raw?.trim() || ''
  return (city || rawAddr || 'Unspecified').trim()
}

/**
 * Deterministic mapping from minimal HH-shaped JSON to the shared contract.
 * No network I/O.
 */
export function normalizeRawHhVacancy(raw: RawHHVacancy, now: Date = new Date()): NormalizedVacancyInput {
  const description = stripHtmlToPlainText(raw.description ?? '')
  const title = (raw.name ?? '').trim() || 'Untitled vacancy'
  const company = raw.employer?.name?.trim() || 'Unknown employer'
  const location = pickLocation(raw)
  const scheduleName = raw.schedule?.name ?? ''
  const haystack = `${title}\n${description}\n${scheduleName}`
  const remote = detectRemoteFromText(haystack) || /\bremote\b/i.test(scheduleName)

  return {
    source: 'HH',
    externalId: String(raw.id).trim(),
    title,
    company,
    description,
    skillsRequired: '',
    location,
    workMode: remote ? 'REMOTE' : 'ONSITE',
    employmentType: raw.employment?.name?.trim() || 'Full-time',
    salary: coalesceSalary(raw),
    sourceUrl: (raw.alternate_url ?? '').trim(),
    publishedAt: raw.published_at?.trim() || raw.created_at?.trim() || undefined,
    importedAt: now.toISOString(),
  }
}
