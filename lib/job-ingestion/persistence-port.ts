import type { NormalizedVacancyInput } from './types'

/**
 * Implemented in a later stage: map NormalizedVacancyInput → Mongo `Vacancy` (or other store)
 * with employer resolution and upsert keys.
 */
export interface IngestionPersistencePort {
  upsertNormalizedVacancy(input: NormalizedVacancyInput): Promise<{ recordId: string }>
}
