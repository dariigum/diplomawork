import {
  EMPLOYER_HIDDEN_LABEL,
  EMPLOYER_NOT_SPECIFIED_LABEL,
  EMPLOYER_UNKNOWN_LABEL,
  employerDisplayInitials,
  formatEmployerName,
} from '@/lib/format-employer-name'
import { formatVacancySalary } from '@/lib/format-vacancy-salary'
import { normalizeStringArray } from '@/lib/normalize-string-array'
import { normalizeVacancySkills } from '@/lib/normalize-vacancy-skills'

export const VACANCY_TITLE_FALLBACK = 'Untitled vacancy'
export const VACANCY_DESCRIPTION_FALLBACK = 'No description provided for this listing.'
export const VACANCY_LOCATION_FALLBACK = 'Location not specified'
export const VACANCY_EMPLOYMENT_FALLBACK = 'Employment type not specified'
export const VACANCY_EXPERIENCE_FALLBACK = 'Experience not specified'
export const VACANCY_POSTED_FALLBACK = 'Posted date unavailable'

export type SafeExternalLink = {
  href: string
  label: string
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

/** Readable single-line field; never throws. */
export function formatVacancyTitle(value: unknown): string {
  return nonEmptyString(value) ?? VACANCY_TITLE_FALLBACK
}

export function formatVacancyDescription(value: unknown): string {
  return nonEmptyString(value) ?? VACANCY_DESCRIPTION_FALLBACK
}

export function formatVacancyMetadataField(value: unknown, fallback: string): string {
  return nonEmptyString(value) ?? fallback
}

export function formatVacancyLocation(input: {
  workMode?: unknown
  city?: unknown
  address?: unknown
  country?: unknown
}): string {
  if (input.workMode === 'REMOTE') return 'Remote'

  const parts = [input.city, input.address, input.country]
    .map((part) => nonEmptyString(part))
    .filter((part): part is string => part != null)

  if (parts.length > 0) return parts.join(', ')
  return VACANCY_LOCATION_FALLBACK
}

export function formatPostedDate(value: unknown): string {
  if (value == null) return VACANCY_POSTED_FALLBACK

  const date =
    value instanceof Date
      ? value
      : new Date(typeof value === 'string' || typeof value === 'number' ? value : Number.NaN)

  if (!Number.isFinite(date.getTime())) return VACANCY_POSTED_FALLBACK

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** http(s) only; returns null for empty, relative, or javascript: URLs. */
export function parseSafeExternalUrl(value: unknown): SafeExternalLink | null {
  const raw = nonEmptyString(value)
  if (!raw) return null

  try {
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const url = new URL(href)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

    const label = raw.replace(/^https?:\/\//i, '').replace(/\/$/, '') || url.hostname
    return { href: url.toString(), label }
  } catch {
    return null
  }
}

export function resolveEmployerProfileId(employer: unknown): string | null {
  if (!employer || typeof employer !== 'object') return null
  const id = (employer as { _id?: unknown })._id
  if (id == null) return null
  return String(id)
}

/** Logo emoji/short mark, or deterministic initials — never a raw URL string in a text slot. */
export function formatEmployerLogoMark(employer: unknown): string {
  if (employer && typeof employer === 'object') {
    const logo = (employer as { logoUrl?: unknown }).logoUrl
    if (typeof logo === 'string') {
      const trimmed = logo.trim()
      if (trimmed && !/^https?:\/\//i.test(trimmed) && trimmed.length <= 8) {
        return trimmed
      }
    }
  }
  return employerDisplayInitials(employer)
}

export type VacancyDetailView = {
  vacancyId: string
  title: string
  description: string
  salaryLabel: string
  location: string
  employmentType: string
  experience: string
  isRemote: boolean
  skills: string[]
  responsibilities: string[]
  requirements: string[]
  postedLabel: string
  companyName: string
  companyLogoMark: string
  companyProfileId: string | null
  companyIndustry: string | null
  companyEmployees: string | null
  companyLocation: string | null
  companyWebsite: SafeExternalLink | null
  sourceListing: SafeExternalLink | null
  showSkillsSection: boolean
  showResponsibilitiesSection: boolean
  showRequirementsSection: boolean
  metadataIncomplete: boolean
}

export function buildVacancyDetailView(jobRecord: unknown, vacancyId: string): VacancyDetailView {
  const record =
    jobRecord && typeof jobRecord === 'object' ? (jobRecord as Record<string, unknown>) : {}

  const employer = record.employerId
  const title = formatVacancyTitle(record.title)
  const description = formatVacancyDescription(record.description)
  const location = formatVacancyLocation({
    workMode: record.workMode,
    city: record.city,
    address: record.address,
    country: record.country,
  })
  const employmentType = formatVacancyMetadataField(record.employmentType, VACANCY_EMPLOYMENT_FALLBACK)
  const experience = formatVacancyMetadataField(record.experience, VACANCY_EXPERIENCE_FALLBACK)
  const responsibilities = normalizeStringArray(record.responsibilities)
  const requirements = normalizeStringArray(record.requirements)
  const skills = normalizeVacancySkills(record.skillsRequired)
  const salaryLabel = formatVacancySalary(record.salaryMin, record.salaryMax)
  const postedLabel = formatPostedDate(record.createdAt)

  const companyName = formatEmployerName(employer)
  const companyProfileId = resolveEmployerProfileId(employer)

  const titleMissing = title === VACANCY_TITLE_FALLBACK
  const descriptionMissing = description === VACANCY_DESCRIPTION_FALLBACK
  const locationMissing = location === VACANCY_LOCATION_FALLBACK
  const employerMissing =
    companyName === EMPLOYER_UNKNOWN_LABEL ||
    companyName === EMPLOYER_NOT_SPECIFIED_LABEL ||
    companyName === EMPLOYER_HIDDEN_LABEL

  return {
    vacancyId,
    title,
    description,
    salaryLabel,
    location,
    employmentType,
    experience,
    isRemote: record.workMode === 'REMOTE',
    skills,
    responsibilities,
    requirements,
    postedLabel,
    companyName,
    companyLogoMark: formatEmployerLogoMark(employer),
    companyProfileId,
    companyIndustry:
      employer && typeof employer === 'object'
        ? nonEmptyString((employer as { industry?: unknown }).industry)
        : null,
    companyEmployees:
      employer && typeof employer === 'object'
        ? nonEmptyString((employer as { employees?: unknown }).employees)
        : null,
    companyLocation:
      employer && typeof employer === 'object'
        ? nonEmptyString((employer as { location?: unknown }).location)
        : null,
    companyWebsite:
      employer && typeof employer === 'object'
        ? parseSafeExternalUrl((employer as { website?: unknown }).website)
        : null,
    sourceListing: parseSafeExternalUrl(record.sourceUrl),
    showSkillsSection: skills.length > 0,
    showResponsibilitiesSection: responsibilities.length > 0,
    showRequirementsSection: requirements.length > 0,
    metadataIncomplete:
      titleMissing ||
      descriptionMissing ||
      locationMissing ||
      employerMissing ||
      skills.length === 0 ||
      (responsibilities.length === 0 && requirements.length === 0),
  }
}
