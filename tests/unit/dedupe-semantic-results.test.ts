import { describe, expect, it } from 'vitest'
import {
  dedupeSemanticResults,
  normalizeSemanticDedupePart,
  semanticResultDedupeKey,
  type SemanticResultDedupeInput,
} from '@/lib/dedupe-semantic-results'

function row(
  partial: Partial<SemanticResultDedupeInput> & Pick<SemanticResultDedupeInput, 'vacancyId'>,
): SemanticResultDedupeInput {
  return {
    title: 'QA Automation Engineer (Platform)',
    company: 'Acme Corp',
    semanticScore: 0.69,
    ...partial,
  }
}

describe('dedupe-semantic-results', () => {
  describe('normalizeSemanticDedupePart', () => {
    it('trims, lowercases, and collapses whitespace', () => {
      expect(normalizeSemanticDedupePart('  Frontend   Developer  ')).toBe('frontend developer')
    })

    it('handles empty company safely', () => {
      expect(normalizeSemanticDedupePart('')).toBe('')
    })
  })

  describe('semanticResultDedupeKey', () => {
    it('includes score bucket rounded to one decimal', () => {
      expect(semanticResultDedupeKey('Python Dev', 'Co', 0.69)).toBe('python dev|co|7')
      expect(semanticResultDedupeKey('Python Dev', 'Co', 0.74)).toBe('python dev|co|7')
      expect(semanticResultDedupeKey('Python Dev', 'Co', 0.75)).toBe('python dev|co|8')
    })
  })

  describe('dedupeSemanticResults', () => {
    it('returns empty or single-item arrays unchanged', () => {
      expect(dedupeSemanticResults([])).toEqual([])
      const one = [row({ vacancyId: 'a' })]
      expect(dedupeSemanticResults(one)).toEqual(one)
    })

    it('removes duplicates with same title, company, and score bucket', () => {
      const items = [
        row({ vacancyId: '1', semanticScore: 0.69 }),
        row({ vacancyId: '2', semanticScore: 0.69 }),
      ]
      expect(dedupeSemanticResults(items)).toHaveLength(1)
      expect(dedupeSemanticResults(items)[0]!.vacancyId).toBe('1')
    })

    it('keeps highest score within the same dedupe key', () => {
      const items = [
        row({ vacancyId: 'low', semanticScore: 0.691 }),
        row({ vacancyId: 'high', semanticScore: 0.698 }),
      ]
      const out = dedupeSemanticResults(items)
      expect(out).toHaveLength(1)
      expect(out[0]!.vacancyId).toBe('high')
    })

    it('preserves first-key appearance order', () => {
      const items = [
        row({ vacancyId: 'a', title: 'Alpha Role', company: 'X', semanticScore: 0.8 }),
        row({ vacancyId: 'b', title: 'Beta Role', company: 'Y', semanticScore: 0.7 }),
        row({ vacancyId: 'c', title: 'Alpha Role', company: 'X', semanticScore: 0.8 }),
      ]
      expect(dedupeSemanticResults(items).map((r) => r.vacancyId)).toEqual(['a', 'b'])
    })

    it('does not merge different titles or companies', () => {
      const items = [
        row({ vacancyId: '1', title: 'QA Engineer', company: 'A' }),
        row({ vacancyId: '2', title: 'Frontend Developer', company: 'A' }),
        row({ vacancyId: '3', title: 'QA Engineer', company: 'B' }),
      ]
      expect(dedupeSemanticResults(items)).toHaveLength(3)
    })

    it('treats case and whitespace differences as the same vacancy', () => {
      const items = [
        row({ vacancyId: '1', title: 'Frontend Developer (Vue)', company: 'Platform Co' }),
        row({
          vacancyId: '2',
          title: '  frontend   developer (vue)  ',
          company: 'platform co',
          semanticScore: 0.69,
        }),
      ]
      expect(dedupeSemanticResults(items)).toHaveLength(1)
    })

    it('keeps rows in different score buckets', () => {
      const items = [
        row({ vacancyId: '1', semanticScore: 0.69 }),
        row({ vacancyId: '2', semanticScore: 0.75 }),
      ]
      expect(dedupeSemanticResults(items)).toHaveLength(2)
    })
  })
})
