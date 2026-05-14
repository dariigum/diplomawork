import type { NormalizedVacancyInput } from './types'

export type IngestionUpsertSuccess = { ok: true; recordId: string; created: boolean }

export type IngestionUpsertFailure = { ok: false; error: string }

/**
 * Mongo (or other) persistence for validated `NormalizedVacancyInput`.
 * Implementations must dedupe by `(source, externalId)` and must not clear embeddings on update.
 */
export interface IngestionPersistencePort {
  upsertNormalizedVacancy(
    input: NormalizedVacancyInput
  ): Promise<IngestionUpsertSuccess | IngestionUpsertFailure>
}
