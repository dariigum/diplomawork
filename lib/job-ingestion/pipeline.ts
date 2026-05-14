import { normalizeRawHhVacancy } from './normalize/from-hh-raw'
import type { NormalizedVacancyInput } from './types'
import type { RawHHVacancy } from './types/raw-hh'
import { validateNormalizedVacancyInput, type ValidateNormalizedResult } from './validate'

/**
 * ## Ingestion pipeline (conceptual order)
 *
 * 1. **fetch** — Provider-specific (HTTP, static JSON, mock loaders). Not implemented in 6A beyond `mock/`.
 * 2. **normalize** — Map raw payloads → `NormalizedVacancyInput`.
 * 3. **validate** — `validateNormalizedVacancyInput` (lightweight guards).
 * 4. **save / upsert** — `IngestionPersistencePort` (wire in a later stage).
 * 5. **embedding** — `VacancyEmbeddingPort` + `buildIngestionVacancyEmbeddingText` (wire ML in a later stage).
 *
 * There is **no** central orchestrator in Stage 6A: compose these steps explicitly at call sites or in future thin runners.
 */

export const INGESTION_PIPELINE_STEPS = [
  'fetch',
  'normalize',
  'validate',
  'persist',
  'embedding',
] as const

export type IngestionPipelineStep = (typeof INGESTION_PIPELINE_STEPS)[number]

/** HH raw → normalized → validated (deterministic given `now`). */
export function runNormalizeAndValidateFromHhRaw(
  raw: RawHHVacancy,
  now?: Date
): ValidateNormalizedResult {
  const normalized = normalizeRawHhVacancy(raw, now)
  return validateNormalizedVacancyInput(normalized)
}

export function runValidateOnly(input: NormalizedVacancyInput): ValidateNormalizedResult {
  return validateNormalizedVacancyInput(input)
}
