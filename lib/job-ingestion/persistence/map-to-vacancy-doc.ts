import type { Types } from 'mongoose'

import type { NormalizedVacancyInput } from '../types'

export function salaryMinMaxFromNormalized(salary: NormalizedVacancyInput['salary']): { salaryMin: number; salaryMax: number } {
  if (!salary) return { salaryMin: 0, salaryMax: 0 }
  let min = salary.min ?? 0
  let max = salary.max ?? 0
  if (min === 0 && max === 0) return { salaryMin: 0, salaryMax: 0 }
  if (max < min) {
    const t = min
    min = max
    max = t
  }
  if (max === 0 && min > 0) max = min
  if (min === 0 && max > 0) min = max
  return { salaryMin: min, salaryMax: max }
}

export function requirementsFromSkills(skillsRequired: string): string[] {
  return skillsRequired
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Fields written on upsert. Never includes `embedding` — existing vectors stay intact.
 */
export function buildIngestionVacancySet(
  input: NormalizedVacancyInput,
  employerId: Types.ObjectId
): Record<string, unknown> {
  const { salaryMin, salaryMax } = salaryMinMaxFromNormalized(input.salary)
  const requirements = requirementsFromSkills(input.skillsRequired)

  return {
    employerId,
    title: input.title,
    description: input.description,
    skillsRequired: input.skillsRequired,
    salaryMin,
    salaryMax,
    employmentType: input.employmentType,
    workMode: input.workMode,
    country: '',
    city: input.location,
    address: input.workMode === 'REMOTE' ? 'Remote' : input.location,
    experience: 'Any experience',
    ...(requirements.length > 0 ? { requirements } : {}),
    source: input.source,
    externalId: input.externalId,
    sourceUrl: input.sourceUrl || '',
  }
}
