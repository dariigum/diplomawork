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

function skillsFromRaw(raw: RawHHVacancy): string {
  const list = raw.key_skills ?? []
  return list
    .map((k) => (k?.name ?? '').trim())
    .filter(Boolean)
    .join(', ')
}

/** Stable external id for HH vacancies (matches `validateNormalizedVacancyInput` safe pattern). */
export function hhStableExternalId(rawId: string): string {
  const trimmed = String(rawId).trim().replace(/^hh_/i, '')
  return `hh_${trimmed}`
}

/**
 * Ensures description passes lightweight validation when HTML body is empty or very short.
 * Deterministic: same raw fields always produce the same fallback text.
 */
export function buildHhDescriptionForNormalization(
  raw: RawHHVacancy,
  title: string,
  company: string,
  location: string
): string {
  const base = stripHtmlToPlainText(raw.description ?? '').trim()
  if (base.length >= 24) return base
  const filler = [
    title && `Vacancy: ${title}.`,
    company && `Company: ${company}.`,
    location && `Location: ${location}.`,
    raw.employment?.name?.trim() && `Employment: ${raw.employment.name.trim()}.`,
    raw.experience?.name?.trim() && `Experience: ${raw.experience.name.trim()}.`,
  ]
    .filter(Boolean)
    .join(' ')
  const combined = [base, filler].filter(Boolean).join('\n').trim()
  if (combined.length >= 24) return combined
  return `${combined}\nHeadHunter listing: detailed HTML description was missing or too short; this text is derived deterministically from the vacancy card.`.trim()
}

/**
 * Deterministic mapping from minimal HH-shaped JSON to the shared contract.
 * No network I/O.
 */
export function normalizeRawHhVacancy(raw: RawHHVacancy, now: Date = new Date()): NormalizedVacancyInput {
  const title = (raw.name ?? '').trim() || 'Untitled vacancy'
  const company = raw.employer?.name?.trim() || 'Unknown employer'
  const location = pickLocation(raw)
  const description = buildHhDescriptionForNormalization(raw, title, company, location)
  const scheduleName = raw.schedule?.name ?? ''
  const haystack = `${title}\n${description}\n${scheduleName}`
  const remote = detectRemoteFromText(haystack) || /\bremote\b/i.test(scheduleName)

  return {
    source: 'HH',
    externalId: hhStableExternalId(String(raw.id)),
    title,
    company,
    description,
    skillsRequired: skillsFromRaw(raw),
    location,
    workMode: remote ? 'REMOTE' : 'ONSITE',
    employmentType: raw.employment?.name?.trim() || 'Full-time',
    salary: coalesceSalary(raw),
    sourceUrl: (raw.alternate_url ?? '').trim(),
    publishedAt: raw.published_at?.trim() || raw.created_at?.trim() || undefined,
    importedAt: now.toISOString(),
  }
}
