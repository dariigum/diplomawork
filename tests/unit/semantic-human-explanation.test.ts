import { describe, expect, it } from 'vitest'
import {
  buildHumanSemanticMatchExplanation,
  SEMANTIC_MATCH_SYSTEM_HINT,
} from '@/lib/semantic-human-explanation'

function wordCount(s: string): number {
  return s.replace(/\.$/, '').trim().split(/\s+/).filter(Boolean).length
}

describe('semantic-human-explanation', () => {
  it('exposes system hint for tooltips without embedding it in body templates', () => {
    expect(SEMANTIC_MATCH_SYSTEM_HINT.toLowerCase()).toContain('embedding')
    const body = buildHumanSemanticMatchExplanation({
      query: 'python developer',
      title: 'Senior Python Developer',
      semanticScore: 0.8,
    })
    expect(body.toLowerCase()).not.toContain('cosine')
    expect(body.toLowerCase()).not.toContain('embedding')
  })

  it('returns one short sentence within word limit', () => {
    const body = buildHumanSemanticMatchExplanation({
      query: 'frontend vue',
      title: 'Frontend Developer (Vue)',
      semanticScore: 0.76,
    })
    expect(wordCount(body)).toBeLessThanOrEqual(14)
    expect(body.endsWith('.')).toBe(true)
  })

  it('uses domain-specific copy for python queries', () => {
    const body = buildHumanSemanticMatchExplanation({
      query: 'remote python backend',
      title: 'Python API Engineer',
      semanticScore: 0.81,
    })
    expect(body).toMatch(/python/i)
    expect(body.toLowerCase()).not.toContain('mapped')
  })

  it('uses ML wording for ML/NLP topics', () => {
    const body = buildHumanSemanticMatchExplanation({
      query: 'machine learning engineer',
      title: 'ML Platform Engineer',
      semanticScore: 0.77,
    })
    expect(body.toLowerCase()).toMatch(/ml|machine learning|nlp/)
  })

  it('falls back to band-based copy when no topic rule matches', () => {
    const body = buildHumanSemanticMatchExplanation({
      query: 'zzq unknown sector',
      title: 'Specialist role 9000',
      semanticScore: 0.4,
    })
    expect(body.length).toBeGreaterThan(10)
    expect(body.toLowerCase()).not.toContain('cosine')
  })
})
