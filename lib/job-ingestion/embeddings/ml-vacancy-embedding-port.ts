import { getEmbedding as defaultGetEmbedding } from '@/lib/ml'

import type { NormalizedVacancyInput } from '../types'
import { isValidEmbeddingVector } from './embedding-vector-guards'
import { buildIngestionVacancyEmbeddingTextFull } from './ingestion-vacancy-embedding-text'
import type { VacancyEmbeddingPort } from './vacancy-embedding-port'

/**
 * `VacancyEmbeddingPort` backed by the existing `getEmbedding` HTTP client.
 * Returns `null` on empty text, invalid vectors, or ML errors (never throws).
 */
export function createMlVacancyEmbeddingPort(overrides?: {
  getEmbedding?: (text: string) => Promise<number[]>
}): VacancyEmbeddingPort {
  const impl = overrides?.getEmbedding ?? defaultGetEmbedding
  return {
    async embedVacancy(input: NormalizedVacancyInput) {
      const text = buildIngestionVacancyEmbeddingTextFull(input)
      if (!text.trim()) return null
      try {
        const vec = await impl(text)
        return isValidEmbeddingVector(vec) ? vec : null
      } catch {
        return null
      }
    },
  }
}
