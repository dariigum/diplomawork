import type { ApplyIngestionEmbeddingOptions } from './apply-ingestion-embedding'
import type { NormalizedVacancyInput } from '../types'
import type { IngestionUpsertResult } from '../persistence/mongo-upsert'
import { upsertIngestionVacancy } from '../persistence/mongo-upsert'
import { applyIngestionVacancyEmbedding, type IngestionEmbeddingOutcome } from './apply-ingestion-embedding'

export type PersistIngestionWithEmbeddingResult =
  | { ok: false; persist: Extract<IngestionUpsertResult, { ok: false }> }
  | {
      ok: true
      recordId: string
      persistCreated: boolean
      embedding: IngestionEmbeddingOutcome
    }

/**
 * Single-process pipeline: Mongo upsert for ingestion, then optional-safe embedding write.
 * Embedding failures do not roll back the vacancy row.
 */
export async function persistIngestionVacancyWithEmbedding(
  input: NormalizedVacancyInput,
  passwordHash: string,
  embeddingOptions?: ApplyIngestionEmbeddingOptions
): Promise<PersistIngestionWithEmbeddingResult> {
  const persist = await upsertIngestionVacancy(input, passwordHash)
  if (!persist.ok) {
    return { ok: false, persist }
  }

  const embedding = await applyIngestionVacancyEmbedding(persist.recordId, input, embeddingOptions ?? {})
  return {
    ok: true,
    recordId: persist.recordId,
    persistCreated: persist.created,
    embedding,
  }
}
