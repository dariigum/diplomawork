import type { IngestionSource } from './ingestion-source'
import type { SalaryRangeInput } from './salary-range'

/**
 * Provider-agnostic vacancy shape after normalization.
 * Intended consumers: persistence adapters, embedding text builders, validators.
 */
export interface NormalizedVacancyInput {
  source: IngestionSource
  externalId: string
  title: string
  company: string
  description: string
  skillsRequired: string
  location: string
  workMode: 'REMOTE' | 'ONSITE'
  employmentType: string
  /** Present when any salary signal exists; otherwise null. */
  salary: SalaryRangeInput | null
  sourceUrl: string
  /** ISO 8601 when known */
  publishedAt?: string
  /** ISO 8601 when ingestion runs */
  importedAt?: string
}
