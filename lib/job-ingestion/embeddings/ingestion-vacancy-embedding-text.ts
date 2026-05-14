import type { NormalizedVacancyInput } from '../types'

function joinLines(parts: Array<string | undefined | null>): string {
  return parts
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join('\n')
    .trim()
}

/**
 * Deterministic, explainable text for vacancy embeddings (ingestion path).
 * Includes company, location, and work mode so semantic / behaviour layers see consistent signals.
 */
export function buildIngestionVacancyEmbeddingTextFull(input: NormalizedVacancyInput): string {
  return joinLines([
    input.title && `Title: ${input.title.trim()}`,
    input.company && `Company: ${input.company.trim()}`,
    input.description && `Description: ${input.description.trim()}`,
    input.skillsRequired && `Skills required: ${input.skillsRequired.trim()}`,
    input.location && `Location: ${input.location.trim()}`,
    `Work mode: ${input.workMode}`,
    input.employmentType && `Employment: ${input.employmentType.trim()}`,
    input.sourceUrl?.trim() && `Listing URL: ${input.sourceUrl.trim()}`,
  ])
}
