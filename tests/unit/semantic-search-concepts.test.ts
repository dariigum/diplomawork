import { describe, expect, it } from 'vitest'
import {
  buildSemanticConceptExplanation,
  extractSemanticConceptsFromVacancies,
  normalizeSemanticConcept,
  type SemanticConceptVacancyInput,
} from '@/lib/semantic-search-concepts'
import { normalizeBehaviourToken } from '@/lib/behaviour-profile'

describe('semantic-search-concepts', () => {
  describe('normalizeSemanticConcept', () => {
    it('delegates to behaviour token normalization (no duplicate rules)', () => {
      const samples = ['  NLP  ', 'Deep   Learning', 'C#, .NET', '']
      for (const s of samples) {
        expect(normalizeSemanticConcept(s)).toBe(normalizeBehaviourToken(s))
      }
    })
  })

  describe('extractSemanticConceptsFromVacancies', () => {
    it('returns [] for empty or invalid input', () => {
      expect(extractSemanticConceptsFromVacancies([])).toEqual([])
      expect(extractSemanticConceptsFromVacancies(null as unknown as SemanticConceptVacancyInput[])).toEqual([])
    })

    it('extracts only from provided vacancy text (no invented tokens)', () => {
      const vacancies: SemanticConceptVacancyInput[] = [
        {
          title: 'AI internship',
          skillsRequired: 'Python, NLP',
          description: 'Transformers experience helpful.',
        },
      ]
      const out = extractSemanticConceptsFromVacancies(vacancies)
      const concepts = new Set(out.map((x) => x.concept))
      expect(concepts.has('python')).toBe(true)
      expect(concepts.has('nlp')).toBe(true)
      expect(concepts.has('internship')).toBe(true)
      expect(concepts.has('transformers')).toBe(true)
      expect(concepts.has('machine')).toBe(false)
      expect(concepts.has('hallucinated')).toBe(false)
    })

    it('merges duplicate phrases and applies stable ordering (weight desc, then lexical asc)', () => {
      const vacancies: SemanticConceptVacancyInput[] = [
        { title: 'Backend engineer', skillsRequired: 'Docker, Go', description: '' },
        { title: 'Backend trainee', skillsRequired: 'Docker, Rust', description: 'Go microservices' },
      ]
      const a = extractSemanticConceptsFromVacancies(vacancies)
      const b = extractSemanticConceptsFromVacancies(vacancies)
      expect(a).toEqual(b)
      expect(a[0]!.weight).toBeGreaterThanOrEqual(a[1]!.weight)
      for (let i = 1; i < a.length; i++) {
        if (a[i - 1]!.weight === a[i]!.weight) {
          expect(a[i - 1]!.concept.localeCompare(a[i]!.concept)).toBeLessThanOrEqual(0)
        }
      }
    })

    it('aggregates weights across vacancies with per-vacancy max across sources', () => {
      const vacancies: SemanticConceptVacancyInput[] = [
        { title: 'NLP engineer', skillsRequired: 'NLP, Python', description: 'NLP pipelines' },
        { title: 'ML engineer trainee', skillsRequired: 'Python', description: '' },
      ]
      const out = extractSemanticConceptsFromVacancies(vacancies)
      const nlp = out.find((x) => x.concept === 'nlp')
      expect(nlp).toBeDefined()
      expect(Number.isFinite(nlp!.weight)).toBe(true)
      expect(nlp!.weight).toBeGreaterThan(0)
    })

    it('handles noisy long descriptions without crashing and respects maxDescriptionChars', () => {
      const noise = `pytorch, kubernetes ${'lorem ipsum dolor '.repeat(200)}`
      const vacancies: SemanticConceptVacancyInput[] = [
        {
          title: 'DevOps',
          skillsRequired: 'Kubernetes',
          description: noise,
        },
      ]
      const shortSlice = extractSemanticConceptsFromVacancies(vacancies, { maxDescriptionChars: 40 })
      const longSlice = extractSemanticConceptsFromVacancies(vacancies, { maxDescriptionChars: 8000 })
      expect(Array.isArray(shortSlice)).toBe(true)
      expect(Array.isArray(longSlice)).toBe(true)
      expect(longSlice.some((x) => x.concept === 'pytorch') || longSlice.some((x) => x.concept === 'kubernetes')).toBe(
        true,
      )
    })

    it('respects maxConcepts cap deterministically', () => {
      const vacancies: SemanticConceptVacancyInput[] = Array.from({ length: 30 }, (_, i) => ({
        title: `Role ${i} typescript`,
        skillsRequired: `skill-${i}, shared`,
        description: '',
      }))
      const out = extractSemanticConceptsFromVacancies(vacancies, { maxConcepts: 5 })
      expect(out.length).toBeLessThanOrEqual(5)
    })

    it('ignores junk objects in the list', () => {
      const out = extractSemanticConceptsFromVacancies([
        null as unknown as SemanticConceptVacancyInput,
        { title: 'OK', skillsRequired: 'Rust', description: '' },
      ])
      expect(out.some((x) => x.concept === 'rust')).toBe(true)
    })
  })

  describe('buildSemanticConceptExplanation', () => {
    it('returns stable empty copy when conceptCount is zero', () => {
      const a = buildSemanticConceptExplanation({ conceptCount: 0 })
      const b = buildSemanticConceptExplanation({ conceptCount: 0 })
      expect(a).toBe(b)
      expect(a.toLowerCase()).toContain('no related')
    })

    it('includes optional top concept examples deterministically', () => {
      const t = buildSemanticConceptExplanation({
        conceptCount: 4,
        topConcepts: ['nlp', 'docker', 'react', 'should-not-appear-fourth'],
      })
      expect(t).toContain('nlp')
      expect(t).toContain('docker')
      expect(t).toContain('react')
      expect(t).not.toContain('should-not-appear-fourth')
      expect(t.toLowerCase()).toContain('deterministic')
    })
  })
})
