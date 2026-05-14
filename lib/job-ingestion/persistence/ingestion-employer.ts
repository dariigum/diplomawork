import crypto from 'crypto'

import type { Types } from 'mongoose'

import dbConnect from '@/lib/db/mongoose'
import { User } from '@/lib/db/schema'

import type { NormalizedVacancyInput } from '../types'

/** Deterministic synthetic email per (source, company) for ingestion-only employers. */
export function buildIngestionEmployerEmail(input: Pick<NormalizedVacancyInput, 'source' | 'company'>): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${input.source}\n${input.company.trim().toLowerCase()}`)
    .digest('hex')
    .slice(0, 28)
  return `ing+${digest}@jobflow.ingestion`
}

export async function findOrCreateIngestionEmployer(
  input: NormalizedVacancyInput,
  passwordHash: string
): Promise<{ employerId: Types.ObjectId }> {
  await dbConnect()
  const email = buildIngestionEmployerEmail(input)
  const existing = await User.findOne({ email }).select('_id').lean()
  if (existing?._id) {
    return { employerId: existing._id as Types.ObjectId }
  }

  const name = input.company.trim() || 'Ingestion employer'
  const user = await User.create({
    email,
    passwordHash,
    name,
    role: 'EMPLOYER',
    location: input.location.trim() || '',
    logoUrl: name.slice(0, 2).toUpperCase(),
  })
  return { employerId: user._id as Types.ObjectId }
}
