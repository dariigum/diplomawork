import { describe, expect, it } from 'vitest'
import {
  buildKeywordFallbackExplanation,
  rankVacanciesByKeywordFallback,
  resolveKeywordFallbackActivation,
  tokenizeKeywordFallbackQuery,
} from '@/lib/semantic-keyword-fallback'
import { SEMANTIC_SCORE_BAND_RELATED } from '@/lib/semantic-score-bands'

describe('semantic-keyword-fallback', () => {
  describe('resolveKeywordFallbackActivation', () => {
    it('enables fallback when semantic results are empty', () => {
      expect(
        resolveKeywordFallbackActivation({
          semanticCount: 0,
          topSemanticScore: null,
          compatibleEmbeddings: 0,
          checkedEmbeddings: 0,
        }),
      ).toEqual({ enabled: true, reason: 'No strong semantic matches' })
    })

    it('enables fallback with sparse reason when embeddings are incompatible', () => {
      expect(
        resolveKeywordFallbackActivation({
          semanticCount: 0,
          topSemanticScore: null,
          compatibleEmbeddings: 0,
          checkedEmbeddings: 3,
        }),
      ).toEqual({ enabled: true, reason: 'Sparse embedding overlap' })
    })

    it('enables fallback when top semantic score is below related band', () => {
      expect(
        resolveKeywordFallbackActivation({
          semanticCount: 2,
          topSemanticScore: SEMANTIC_SCORE_BAND_RELATED - 0.05,
          compatibleEmbeddings: 2,
          checkedEmbeddings: 2,
        }),
      ).toEqual({ enabled: true, reason: 'Low semantic overlap' })
    })

    it('disables fallback when semantic quality is at or above related band', () => {
      expect(
        resolveKeywordFallbackActivation({
          semanticCount: 1,
          topSemanticScore: SEMANTIC_SCORE_BAND_RELATED,
          compatibleEmbeddings: 1,
          checkedEmbeddings: 1,
        }),
      ).toEqual({ enabled: false, reason: null })
    })
  })

  describe('rankVacanciesByKeywordFallback', () => {
    it('ranks by text score descending with stable vacancyId tie-break', () => {
      const out = rankVacanciesByKeywordFallback({
        query: 'python backend engineer',
        vacancies: [
          {
            _id: 'b',
            title: 'Junior Role',
            skillsRequired: 'Go',
            description: 'other stack',
          },
          {
            _id: 'a',
            title: 'Python Backend Engineer',
            skillsRequired: 'Python, Django',
            description: 'backend services',
          },
        ],
      })
      expect(out.map((r) => r.vacancyId)).toEqual(['a'])
      expect(out[0]!.textScore).toBeGreaterThan(0)
      expect(out[0]).not.toHaveProperty('semanticScore')
    })

    it('excludes semantic result vacancy ids', () => {
      const out = rankVacanciesByKeywordFallback({
        query: 'python',
        vacancies: [
          { _id: 'only', title: 'Python Developer', skillsRequired: 'Python', description: '' },
        ],
        excludeVacancyIds: new Set(['only']),
      })
      expect(out).toEqual([])
    })

    it('returns deterministic explanations without AI wording', () => {
      const out = rankVacanciesByKeywordFallback({
        query: 'kubernetes',
        vacancies: [
          {
            _id: 'k',
            title: 'DevOps',
            skillsRequired: 'Kubernetes, Docker',
            description: 'kubernetes clusters',
          },
        ],
      })
      expect(out).toHaveLength(1)
      expect(out[0]!.explanation.toLowerCase()).toContain('text overlap')
      expect(out[0]!.explanation.toLowerCase()).not.toContain('ai inferred')
    })

    it('is deterministic across repeated calls', () => {
      const params = {
        query: 'react frontend',
        vacancies: [
          { _id: '1', title: 'React Frontend', skillsRequired: 'React', description: '' },
          { _id: '2', title: 'Vue', skillsRequired: 'Vue', description: 'react mention' },
        ],
      }
      expect(rankVacanciesByKeywordFallback(params)).toEqual(rankVacanciesByKeywordFallback(params))
    })
  })

  describe('tokenizeKeywordFallbackQuery', () => {
    it('returns empty set for blank query', () => {
      expect(tokenizeKeywordFallbackQuery('   ').size).toBe(0)
    })
  })

  describe('buildKeywordFallbackExplanation', () => {
    it('lists field-level overlap concisely', () => {
      const t = buildKeywordFallbackExplanation({ titleHits: 2, skillHits: 1, descHits: 0 })
      expect(t).toContain('title')
      expect(t).toContain('skill')
      expect(t).toContain('Not embedding-based')
    })
  })
})
