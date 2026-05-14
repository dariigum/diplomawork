import { describe, expect, it } from 'vitest'

import { buildIngestionVacancyEmbeddingTextFull } from '@/lib/job-ingestion/embeddings/ingestion-vacancy-embedding-text'
import { isValidEmbeddingVector } from '@/lib/job-ingestion/embeddings/embedding-vector-guards'
import type { NormalizedVacancyInput } from '@/lib/job-ingestion/types'

function sampleInput(overrides: Partial<NormalizedVacancyInput> = {}): NormalizedVacancyInput {
  return {
    source: 'MOCK',
    externalId: 'MOCK:embed-unit-1',
    title: 'Engineer',
    company: 'Co',
    description: 'Long description for unit tests of ingestion embedding text composition layer.',
    skillsRequired: 'Go',
    location: 'Astana',
    workMode: 'REMOTE',
    employmentType: 'Full-time',
    salary: null,
    sourceUrl: 'https://example.com',
    ...overrides,
  }
}

describe('ingestion embedding text + vector guards', () => {
  it('buildIngestionVacancyEmbeddingTextFull is deterministic and includes company and work mode', () => {
    const a = sampleInput()
    const t = buildIngestionVacancyEmbeddingTextFull(a)
    expect(t).toBe(buildIngestionVacancyEmbeddingTextFull(a))
    expect(t).toContain('Company: Co')
    expect(t).toContain('Work mode: REMOTE')
    expect(t).toContain('Title: Engineer')
  })

  it('isValidEmbeddingVector rejects invalid shapes', () => {
    expect(isValidEmbeddingVector([])).toBe(false)
    expect(isValidEmbeddingVector([NaN])).toBe(false)
    expect(isValidEmbeddingVector([1, 2, 3])).toBe(true)
  })
})
