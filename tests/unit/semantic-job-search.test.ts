import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildSemanticSearchExplanation,
  rankVacanciesBySemanticQuery,
  rankVacanciesBySemanticQueryFromEmbedding,
  rankVacanciesBySemanticQueryFromEmbeddingWithStats,
  resolveWeakSemanticActivation,
  WEAK_SEMANTIC_RECOVERY_LIMIT,
  semanticMatchStrengthLabel,
  semanticScoreBand,
  type SemanticVacancyInput,
} from '@/lib/semantic-job-search'
import { SEMANTIC_SCORE_BAND_RELATED } from '@/lib/semantic-score-bands'

vi.mock('@/lib/ml', () => ({
  getEmbedding: vi.fn(),
}))

import { getEmbedding } from '@/lib/ml'

const mockedGetEmbedding = vi.mocked(getEmbedding)

function embUnit(dim: number, axis: number): number[] {
  const v = new Array<number>(dim).fill(0)
  v[axis % dim] = 1
  return v
}

describe('semantic-job-search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildSemanticSearchExplanation', () => {
    it('returns a non-empty honest line for a positive finite score', () => {
      const t = buildSemanticSearchExplanation({ semanticScore: 0.62 })
      expect(t.length).toBeGreaterThan(20)
      expect(t.toLowerCase()).toContain('embedding')
      expect(t.toLowerCase()).toContain('cosine')
    })

    it('uses deterministic tier wording by score band', () => {
      const low = buildSemanticSearchExplanation({ semanticScore: 0.2 })
      const mid = buildSemanticSearchExplanation({ semanticScore: 0.5 })
      const high = buildSemanticSearchExplanation({ semanticScore: 0.9 })
      expect(low).toContain('is low')
      expect(mid).toContain('is moderate')
      expect(high).toContain('is high')
    })

    it('handles non-finite and non-positive scores safely', () => {
      expect(buildSemanticSearchExplanation({ semanticScore: NaN })).toContain('No usable')
      expect(buildSemanticSearchExplanation({ semanticScore: 0 })).toContain('No usable')
      expect(buildSemanticSearchExplanation({ semanticScore: -1 })).toContain('No usable')
    })
  })

  describe('rankVacanciesBySemanticQuery', () => {
    it('returns [] for empty or whitespace-only query without calling ML', async () => {
      mockedGetEmbedding.mockRejectedValue(new Error('should not be called'))
      await expect(rankVacanciesBySemanticQuery({ query: '', vacancies: [] })).resolves.toEqual([])
      await expect(rankVacanciesBySemanticQuery({ query: '   \t', vacancies: [] })).resolves.toEqual([])
      expect(mockedGetEmbedding).not.toHaveBeenCalled()
    })

    it('returns [] when ML service fails (deterministic, no throw)', async () => {
      mockedGetEmbedding.mockRejectedValue(new Error('ML down'))
      const out = await rankVacanciesBySemanticQuery({
        query: 'backend engineer',
        vacancies: [{ _id: 'a', title: 'X', embedding: embUnit(4, 0) }],
      })
      expect(out).toEqual([])
    })

    it('ranks by semantic score descending and applies stable tie-break on vacancyId', async () => {
      const q = embUnit(4, 0)
      mockedGetEmbedding.mockResolvedValue(q)

      const vacancies: SemanticVacancyInput[] = [
        { _id: 'zzz', title: 'Z', embedding: q.slice() },
        { _id: 'aaa', title: 'A', embedding: q.slice() },
        { _id: 'mid', title: 'M', embedding: embUnit(4, 1) },
      ]

      const out = await rankVacanciesBySemanticQuery({ query: 'q', vacancies })
      expect(out.map((r) => r.vacancyId)).toEqual(['aaa', 'zzz', 'mid'])
      expect(out[0]!.semanticScore).toBeGreaterThanOrEqual(out[1]!.semanticScore)
      expect(out[1]!.semanticScore).toBeGreaterThan(out[2]!.semanticScore)
    })

    it('skips vacancies without embeddings or with dimension mismatch', async () => {
      mockedGetEmbedding.mockResolvedValue(embUnit(3, 0))
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'no-emb', title: 'No', embedding: undefined },
        { _id: 'empty-emb', title: 'E', embedding: [] },
        { _id: 'bad-dim', title: 'B', embedding: embUnit(4, 0) },
        { _id: 'ok', title: 'OK role', embedding: embUnit(3, 0) },
      ]
      const out = await rankVacanciesBySemanticQuery({ query: 'python', vacancies })
      expect(out).toHaveLength(1)
      expect(out[0]!.vacancyId).toBe('ok')
    })

    it('respects optional limit', async () => {
      mockedGetEmbedding.mockResolvedValue(embUnit(2, 0))
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'b', title: 'B', embedding: [1, 0] },
        { _id: 'a', title: 'A', embedding: [1, 0] },
        { _id: 'c', title: 'C', embedding: [0, 1] },
      ]
      const out = await rankVacanciesBySemanticQuery({ query: 'q', vacancies, limit: 2 })
      expect(out).toHaveLength(2)
    })

    it('returns finite scores in [0, 1] for every ranked item', async () => {
      mockedGetEmbedding.mockResolvedValue(embUnit(5, 2))
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'v1', title: 'One', embedding: embUnit(5, 2) },
        { _id: 'v2', title: 'Two', embedding: embUnit(5, 3) },
      ]
      const out = await rankVacanciesBySemanticQuery({ query: 'data', vacancies })
      for (const r of out) {
        expect(Number.isFinite(r.semanticScore)).toBe(true)
        expect(r.semanticScore).toBeGreaterThan(0)
        expect(r.semanticScore).toBeLessThanOrEqual(1)
      }
    })

    it('fills output contract fields without hybrid or behaviour keys', async () => {
      mockedGetEmbedding.mockResolvedValue(embUnit(3, 0))
      const vacancies: SemanticVacancyInput[] = [
        {
          _id: '507f1f77bcf86cd799439011',
          title: ' ML Engineer ',
          embedding: embUnit(3, 0),
          employmentType: 'Part-time',
          workMode: 'REMOTE',
          employerId: { name: 'Acme Corp' },
        },
      ]
      const out = await rankVacanciesBySemanticQuery({ query: 'machine learning', vacancies })
      expect(out).toHaveLength(1)
      const r = out[0]!
      expect(Object.keys(r).sort()).toEqual(
        [
          'company',
          'employmentType',
          'explanation',
          'location',
          'semanticScore',
          'title',
          'vacancyId',
          'workMode',
        ].sort(),
      )
      expect(r.company).toBe('Acme Corp')
      expect(r.workMode).toBe('REMOTE')
      expect(r.location).toBe('Remote')
      expect(r.title).toBe('ML Engineer')
      expect(r.explanation).toBeTruthy()
    })

    it('is deterministic across repeated calls with the same fixtures', async () => {
      mockedGetEmbedding.mockResolvedValue(embUnit(4, 1))
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'x', title: 'X', embedding: embUnit(4, 0) },
        { _id: 'y', title: 'Y', embedding: embUnit(4, 2) },
      ]
      const a = await rankVacanciesBySemanticQuery({ query: 'same', vacancies, limit: 10 })
      const b = await rankVacanciesBySemanticQuery({ query: 'same', vacancies, limit: 10 })
      expect(a).toEqual(b)
    })
  })

  describe('semanticScoreBand and semanticMatchStrengthLabel', () => {
    it('maps scores to existing project bands', () => {
      expect(semanticScoreBand(0.8)).toBe('strong')
      expect(semanticScoreBand(0.75)).toBe('strong')
      expect(semanticScoreBand(0.6)).toBe('solid')
      expect(semanticScoreBand(0.55)).toBe('solid')
      expect(semanticScoreBand(0.4)).toBe('related')
      expect(semanticScoreBand(0.35)).toBe('related')
      expect(semanticScoreBand(0.1)).toBe('loose')
      expect(semanticScoreBand(0)).toBeNull()
      expect(semanticScoreBand(-1)).toBeNull()
    })

    it('returns tier labels aligned with bands', () => {
      expect(semanticMatchStrengthLabel(0.8)).toBe('Strong semantic similarity')
      expect(semanticMatchStrengthLabel(0.42)).toBe('Related semantic overlap')
      expect(semanticMatchStrengthLabel(0.1)).toBe('Loose semantic overlap')
    })
  })

  describe('rankVacanciesBySemanticQueryFromEmbeddingWithStats', () => {
    it('returns empty stats for invalid query embedding', () => {
      const out = rankVacanciesBySemanticQueryFromEmbeddingWithStats({
        queryEmbedding: [],
        vacancies: [{ _id: 'a', embedding: [1, 0] }],
      })
      expect(out.results).toEqual([])
      expect(out.weakResults).toEqual([])
      expect(out.stats).toEqual({
        checkedEmbeddings: 0,
        compatibleEmbeddings: 0,
        topSemanticScore: null,
        bandCounts: { strong: 0, solid: 0, related: 0, loose: 0 },
      })
    })

    it('counts checked vs compatible embeddings and band tallies', () => {
      const q = embUnit(4, 0)
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'skip-emb', title: 'X', embedding: undefined },
        { _id: 'bad-dim', title: 'B', embedding: embUnit(3, 0) },
        { _id: 'strong', title: 'S', embedding: q.slice() },
        { _id: 'related', title: 'R', embedding: embUnit(4, 2) },
        { _id: 'zero', title: 'Z', embedding: embUnit(4, 1) },
      ]
      const { results, weakResults, stats } = rankVacanciesBySemanticQueryFromEmbeddingWithStats({
        queryEmbedding: q,
        vacancies,
      })
      expect(stats.checkedEmbeddings).toBe(5)
      expect(stats.compatibleEmbeddings).toBe(3)
      expect(stats.topSemanticScore).not.toBeNull()
      expect(stats.bandCounts.strong).toBeGreaterThanOrEqual(1)
      for (const r of results) {
        expect(r.semanticScore).toBeGreaterThanOrEqual(SEMANTIC_SCORE_BAND_RELATED)
      }
      for (const r of weakResults) {
        expect(r.semanticScore).toBeGreaterThan(0)
        expect(r.semanticScore).toBeLessThan(SEMANTIC_SCORE_BAND_RELATED)
        expect(r.explanation.toLowerCase()).toContain('weak overlap')
      }
      expect(weakResults.length).toBeLessThanOrEqual(WEAK_SEMANTIC_RECOVERY_LIMIT)
    })

    it('places loose-band matches in weakResults, not primary results', () => {
      const q = [1, 0]
      // Raw cosine -0.6 maps to (cos+1)/2 = 0.2 on the project 0–1 scale.
      const weakEmb = [-0.6, 0.8]
      const { results, weakResults } = rankVacanciesBySemanticQueryFromEmbeddingWithStats({
        queryEmbedding: q,
        vacancies: [{ _id: 'w', title: 'Weak', embedding: weakEmb }],
      })
      expect(results).toHaveLength(0)
      expect(weakResults).toHaveLength(1)
      expect(weakResults[0]!.semanticScore).toBeCloseTo(0.2, 5)
    })

    it('keeps band counts on full ranked set while limit only trims results', () => {
      const q = embUnit(2, 0)
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'a', title: 'A', embedding: [1, 0] },
        { _id: 'b', title: 'B', embedding: [1, 0] },
        { _id: 'c', title: 'C', embedding: [0, 1] },
      ]
      const full = rankVacanciesBySemanticQueryFromEmbeddingWithStats({ queryEmbedding: q, vacancies })
      const limited = rankVacanciesBySemanticQueryFromEmbeddingWithStats({
        queryEmbedding: q,
        vacancies,
        limit: 1,
      })
      expect(limited.results).toHaveLength(1)
      expect(limited.stats.bandCounts).toEqual(full.stats.bandCounts)
      expect(limited.stats.topSemanticScore).toBe(full.stats.topSemanticScore)
    })
  })

  describe('resolveWeakSemanticActivation', () => {
    it('enables when only loose candidates exist', () => {
      expect(
        resolveWeakSemanticActivation({
          primaryCount: 0,
          weakCandidateCount: 2,
          topSemanticScore: 0.2,
        }),
      ).toEqual({ enabled: true, reason: 'Only loose semantic overlap was found' })
    })

    it('disables when primary related matches exist', () => {
      expect(
        resolveWeakSemanticActivation({
          primaryCount: 1,
          weakCandidateCount: 1,
          topSemanticScore: 0.5,
        }),
      ).toEqual({ enabled: false, reason: null })
    })
  })

  describe('rankVacanciesBySemanticQueryFromEmbedding', () => {
    it('returns [] for empty or invalid query embedding', () => {
      expect(rankVacanciesBySemanticQueryFromEmbedding({ queryEmbedding: [], vacancies: [] })).toEqual([])
      expect(
        rankVacanciesBySemanticQueryFromEmbedding({
          queryEmbedding: [1, NaN, 0],
          vacancies: [{ _id: 'a', embedding: [1, 0, 0] }],
        }),
      ).toEqual([])
    })

    it('matches rankVacanciesBySemanticQuery output when ML returns the same vector', async () => {
      const q = embUnit(3, 0)
      mockedGetEmbedding.mockResolvedValue(q)
      const vacancies: SemanticVacancyInput[] = [
        { _id: 'b', title: 'B', embedding: embUnit(3, 1) },
        { _id: 'a', title: 'A', embedding: embUnit(3, 0) },
      ]
      const viaMl = await rankVacanciesBySemanticQuery({ query: 'x', vacancies })
      const viaDirect = rankVacanciesBySemanticQueryFromEmbedding({ queryEmbedding: q, vacancies })
      expect(viaMl).toEqual(viaDirect)
    })
  })
})
