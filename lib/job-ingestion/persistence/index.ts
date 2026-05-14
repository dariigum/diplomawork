export { createMongoIngestionPersistence, type CreateMongoIngestionPersistenceOptions } from './ingestion-persistence'
export { upsertIngestionVacancy, type IngestionUpsertResult } from './mongo-upsert'
export { buildIngestionEmployerEmail, findOrCreateIngestionEmployer } from './ingestion-employer'
export { buildIngestionVacancySet, requirementsFromSkills, salaryMinMaxFromNormalized } from './map-to-vacancy-doc'
