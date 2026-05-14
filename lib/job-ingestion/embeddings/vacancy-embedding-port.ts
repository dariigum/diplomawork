import type { NormalizedVacancyInput } from '../types'

/**
 * Later: implement with `getEmbedding` + `buildVacancyEmbeddingText` from `@/lib/embedding-text` / `@/lib/ml`.
 * Returning `null` means “persist vacancy without vector” — callers should stay compatible with optional embeddings.
 */
export interface VacancyEmbeddingPort {
  embedVacancy(input: NormalizedVacancyInput): Promise<number[] | null>
}

export const noopVacancyEmbeddingPort: VacancyEmbeddingPort = {
  async embedVacancy() {
    return null
  },
}
