import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'
import { getEmbedding as defaultGetEmbedding } from '@/lib/ml'

import type { NormalizedVacancyInput } from '../types'
import { isValidEmbeddingVector } from './embedding-vector-guards'
import { buildIngestionVacancyEmbeddingTextFull } from './ingestion-vacancy-embedding-text'

export type IngestionEmbeddingSkipReason =
  | 'already_present'
  | 'not_ingestion_managed'
  | 'empty_text'
  | 'identity_mismatch'

export type IngestionEmbeddingOutcome =
  | { status: 'embedded'; recordId: string; dimensions: number }
  | { status: 'skipped'; recordId: string; reason: IngestionEmbeddingSkipReason }
  | { status: 'failed'; recordId: string; error: string }

export type ApplyIngestionEmbeddingOptions = {
  /** When true, recompute even if a non-empty embedding already exists. */
  forceRefresh?: boolean
  /** In tests, inject a mock instead of calling the real ML HTTP service. */
  getEmbedding?: (text: string) => Promise<number[]>
}

/**
 * Loads an ingestion-managed vacancy, builds text, calls `getEmbedding`, validates the vector,
 * and `$set`s `embedding` only when safe. Never throws — returns a structured outcome.
 *
 * Safety: only updates rows that match `(recordId, source, externalId)` from the normalized input,
 * so manual vacancies (no `source` / `externalId`) are never touched.
 */
export async function applyIngestionVacancyEmbedding(
  recordId: string,
  input: NormalizedVacancyInput,
  options: ApplyIngestionEmbeddingOptions = {}
): Promise<IngestionEmbeddingOutcome> {
  const getEmbeddingFn = options.getEmbedding ?? defaultGetEmbedding

  try {
    await dbConnect()

    if (!recordId?.trim()) {
      return { status: 'failed', recordId: '', error: 'recordId is empty' }
    }

    const doc = await Vacancy.findById(recordId).select('source externalId embedding').lean()
    if (!doc) {
      return { status: 'failed', recordId, error: 'Vacancy not found' }
    }

    if (!doc.source || !doc.externalId) {
      return { status: 'skipped', recordId, reason: 'not_ingestion_managed' }
    }

    if (doc.source !== input.source || doc.externalId !== input.externalId) {
      return { status: 'skipped', recordId, reason: 'identity_mismatch' }
    }

    const existing = doc.embedding as number[] | undefined
    if (!options.forceRefresh && Array.isArray(existing) && existing.length > 0) {
      return { status: 'skipped', recordId, reason: 'already_present' }
    }

    const text = buildIngestionVacancyEmbeddingTextFull(input)
    if (!text.trim()) {
      return { status: 'skipped', recordId, reason: 'empty_text' }
    }

    let vector: number[]
    try {
      vector = await getEmbeddingFn(text)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'getEmbedding failed'
      return { status: 'failed', recordId, error: message }
    }

    if (!isValidEmbeddingVector(vector)) {
      return { status: 'failed', recordId, error: 'Embedding service returned an invalid vector' }
    }

    const res = await Vacancy.updateOne(
      { _id: recordId, source: input.source, externalId: input.externalId },
      { $set: { embedding: vector } }
    )

    if (res.matchedCount === 0) {
      return { status: 'failed', recordId, error: 'Ingestion vacancy not updated (filter mismatch)' }
    }

    return { status: 'embedded', recordId, dimensions: vector.length }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected embedding persistence error'
    return { status: 'failed', recordId, error: message }
  }
}
