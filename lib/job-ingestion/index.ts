/**
 * @module job-ingestion
 * Job vacancy ingestion — Stage 6A skeleton (contracts, normalize, validate, mock, ports).
 */

export * from './types'
export * from './normalize'
export * from './validate'
export * from './mock'
export * from './embeddings'
export * from './pipeline'
export * from './hh'
export * from './persistence'
export type { IngestionPersistencePort, IngestionUpsertFailure, IngestionUpsertSuccess } from './persistence-port'
