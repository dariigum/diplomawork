export type { VacancyEmbeddingPort } from './vacancy-embedding-port'
export { noopVacancyEmbeddingPort } from './vacancy-embedding-port'
export { createMlVacancyEmbeddingPort } from './ml-vacancy-embedding-port'
export { isValidEmbeddingVector } from './embedding-vector-guards'
export { buildIngestionVacancyEmbeddingTextFull } from './ingestion-vacancy-embedding-text'
export {
  applyIngestionVacancyEmbedding,
  type ApplyIngestionEmbeddingOptions,
  type IngestionEmbeddingOutcome,
  type IngestionEmbeddingSkipReason,
} from './apply-ingestion-embedding'
export { persistIngestionVacancyWithEmbedding, type PersistIngestionWithEmbeddingResult } from './persist-with-embedding'
export {
  buildIngestionVacancyEmbeddingText,
  normalizedVacancyToEmbeddingTextInput,
} from './vacancy-embedding-text'
