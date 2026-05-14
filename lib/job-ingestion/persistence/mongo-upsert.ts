import type { Types } from 'mongoose'

import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'

import { validateNormalizedVacancyInput } from '../validate'
import type { NormalizedVacancyInput } from '../types'
import { buildIngestionVacancySet } from './map-to-vacancy-doc'
import { findOrCreateIngestionEmployer } from './ingestion-employer'

export type IngestionUpsertResult =
  | { ok: true; recordId: string; created: boolean }
  | { ok: false; error: string }

/**
 * Upserts a single ingestion vacancy keyed by `(source, externalId)`.
 * - Does not touch `embedding` (field omitted from `$set`).
 * - Reuses `employerId` on update so employer linkage stays stable.
 * - Never matches manual vacancies (they have no `source` / `externalId`).
 */
export async function upsertIngestionVacancy(
  input: NormalizedVacancyInput,
  passwordHash: string
): Promise<IngestionUpsertResult> {
  try {
    const validated = validateNormalizedVacancyInput(input)
    if (!validated.ok) {
      return { ok: false, error: validated.issues.join('; ') }
    }

    const doc = validated.value
    await dbConnect()

    const filter = { source: doc.source, externalId: doc.externalId }
    const existing = await Vacancy.findOne(filter).select('_id employerId').lean()

    const { employerId } = existing?.employerId
      ? { employerId: existing.employerId as Types.ObjectId }
      : await findOrCreateIngestionEmployer(doc, passwordHash)

    const $set = buildIngestionVacancySet(doc, employerId)

    const updated = await Vacancy.findOneAndUpdate(filter, { $set }, {
      returnDocument: 'after',
      upsert: true,
      setDefaultsOnInsert: true,
    })

    if (!updated?._id) {
      return { ok: false, error: 'Upsert did not return a document id' }
    }

    if (Array.isArray(updated.embedding) && updated.embedding.length === 0) {
      await Vacancy.updateOne({ _id: updated._id }, { $unset: { embedding: 1 } })
    }

    return { ok: true, recordId: String(updated._id), created: !existing }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown persistence error'
    return { ok: false, error: message }
  }
}
