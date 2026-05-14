import type { NormalizedVacancyInput } from '../types/normalized-vacancy'
import { isIngestionSource } from '../types/ingestion-source'
import {
  INGESTION_DESCRIPTION_MAX_LEN,
  INGESTION_DESCRIPTION_MIN_LEN,
  INGESTION_EXTERNAL_ID_MAX_LEN,
  INGESTION_TITLE_MAX_LEN,
} from './limits'

const EXTERNAL_ID_SAFE = /^[a-zA-Z0-9:_-]+$/

export type ValidateNormalizedResult =
  | { ok: true; value: NormalizedVacancyInput }
  | { ok: false; issues: string[] }

export function validateNormalizedVacancyInput(input: NormalizedVacancyInput): ValidateNormalizedResult {
  const issues: string[] = []

  if (!isIngestionSource(input.source)) {
    issues.push('Invalid or unknown ingestion source')
  }

  const title = input.title.trim()
  if (!title) issues.push('Title is required')
  else if (title.length > INGESTION_TITLE_MAX_LEN) issues.push(`Title exceeds ${INGESTION_TITLE_MAX_LEN} characters`)

  const externalId = input.externalId.trim()
  if (!externalId) issues.push('externalId is required')
  else if (externalId.length > INGESTION_EXTERNAL_ID_MAX_LEN) {
    issues.push(`externalId exceeds ${INGESTION_EXTERNAL_ID_MAX_LEN} characters`)
  } else if (!EXTERNAL_ID_SAFE.test(externalId)) {
    issues.push('externalId must match safe pattern [a-zA-Z0-9:_-]+')
  }

  const description = input.description.trim()
  if (description.length < INGESTION_DESCRIPTION_MIN_LEN) {
    issues.push(`Description must be at least ${INGESTION_DESCRIPTION_MIN_LEN} characters`)
  } else if (description.length > INGESTION_DESCRIPTION_MAX_LEN) {
    issues.push(`Description exceeds ${INGESTION_DESCRIPTION_MAX_LEN} characters`)
  }

  const company = input.company.trim()
  if (!company) issues.push('Company is required')

  if (input.workMode !== 'REMOTE' && input.workMode !== 'ONSITE') {
    issues.push('workMode must be REMOTE or ONSITE')
  }

  const employmentType = input.employmentType.trim()
  if (!employmentType) issues.push('employmentType is required')

  const skillsRequired = input.skillsRequired.trim()
  if (skillsRequired.length > 8_000) issues.push('skillsRequired exceeds 8000 characters')

  const location = input.location.trim()
  if (!location) issues.push('location is required')

  const sourceUrl = input.sourceUrl.trim()
  if (sourceUrl.length > 2_048) issues.push('sourceUrl exceeds 2048 characters')

  if (input.salary) {
    const { min, max } = input.salary
    if (min != null && max != null && min > max) {
      issues.push('salary.min cannot be greater than salary.max')
    }
  }

  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    value: {
      ...input,
      title,
      externalId,
      description,
      company,
      employmentType,
      skillsRequired,
      location,
      sourceUrl,
    },
  }
}
