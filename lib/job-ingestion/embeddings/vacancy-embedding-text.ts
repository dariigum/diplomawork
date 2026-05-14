import { buildVacancyEmbeddingText } from '@/lib/embedding-text'

import type { NormalizedVacancyInput } from '../types'

/** Maps normalized ingestion shape to the existing embedding text helper (no ML call). */
export function normalizedVacancyToEmbeddingTextInput(v: NormalizedVacancyInput) {
  return {
    title: v.title,
    description: v.description,
    skillsRequired: v.skillsRequired,
  }
}

export function buildIngestionVacancyEmbeddingText(v: NormalizedVacancyInput): string {
  return buildVacancyEmbeddingText(normalizedVacancyToEmbeddingTextInput(v))
}
