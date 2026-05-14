/**
 * Stable identity for where a vacancy record originated.
 * Extend with new literals in later stages; keep DB and analytics aligned.
 */
export const INGESTION_SOURCES = ['HH', 'MOCK', 'MANUAL', 'SEED'] as const

export type IngestionSource = (typeof INGESTION_SOURCES)[number]

export function isIngestionSource(value: unknown): value is IngestionSource {
  return typeof value === 'string' && (INGESTION_SOURCES as readonly string[]).includes(value)
}
