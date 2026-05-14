import bcrypt from 'bcryptjs'

import type { IngestionPersistencePort } from '../persistence-port'
import type { NormalizedVacancyInput } from '../types'
import { upsertIngestionVacancy } from './mongo-upsert'

export type CreateMongoIngestionPersistenceOptions = {
  /**
   * bcrypt hash for synthetic ingestion employers.
   * Defaults to `INGESTION_EMPLOYER_PASSWORD` or a dev-only constant.
   */
  placeholderPasswordHash?: string
}

let cachedHash: string | null = null

async function resolvePlaceholderHash(override?: string): Promise<string> {
  if (override) return override
  if (cachedHash) return cachedHash
  const secret = process.env.INGESTION_EMPLOYER_PASSWORD?.trim() || 'jobflow-ingestion-employer-dev'
  cachedHash = await bcrypt.hash(secret, 10)
  return cachedHash
}

/**
 * Mongo-backed {@link IngestionPersistencePort}. Safe for repeated imports (dedup by source+externalId).
 */
export function createMongoIngestionPersistence(
  options: CreateMongoIngestionPersistenceOptions = {}
): IngestionPersistencePort {
  return {
    async upsertNormalizedVacancy(input: NormalizedVacancyInput) {
      const passwordHash = await resolvePlaceholderHash(options.placeholderPasswordHash)
      const result = await upsertIngestionVacancy(input, passwordHash)
      if (!result.ok) {
        return { ok: false, error: result.error }
      }
      return { ok: true, recordId: result.recordId, created: result.created }
    },
  }
}
