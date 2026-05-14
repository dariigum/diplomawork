import { describe, expect, it } from 'vitest'
import {
  buildSemanticConceptExplanation,
  extractSemanticConceptsFromVacancies,
  normalizeSemanticConcept,
  type SemanticConceptVacancyInput,
} from '@/lib/semantic-search-concepts'
import { normalizeBehaviourToken } from '@/lib/behaviour-profile'

/** Lowercased bundle of vacancy text fields for substring grounding checks. */
function vacancyTextHaystack(v: SemanticConceptVacancyInput): string {
  return [v.title, v.skillsRequired, v.description].map((x) => String(x ?? '').toLowerCase()).join('\n')
}

/** Every extracted concept must appear as a substring of at least one vacancy's raw text (post lowercasing). */
function assertConceptsGroundedInVacancyText(
  vacancies: SemanticConceptVacancyInput[],
  entries: { concept: string }[],
): void {
  const haystacks = vacancies.map(vacancyTextHaystack)
  for (const { concept } of entries) {
    const ok = haystacks.some((h) => h.includes(concept))
    expect(ok, `concept "${concept}" not found in any vacancy text field`).toBe(true)
  }
}

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

    it('returns [] when all text fields are empty (safety)', () => {
      expect(
        extractSemanticConceptsFromVacancies([
          { title: '', skillsRequired: '', description: '' },
          { title: '   ', skillsRequired: '\t', description: undefined },
        ]),
      ).toEqual([])
    })

    it('is bitwise repeatable across many runs (deterministic repeatability)', () => {
      const vacancies: SemanticConceptVacancyInput[] = [
        { title: 'SRE platform', skillsRequired: 'Kubernetes, Go', description: 'on-call rotation' },
        { title: 'Platform engineer', skillsRequired: 'Go, Terraform', description: 'kubernetes clusters' },
      ]
      const first = extractSemanticConceptsFromVacancies(vacancies)
      for (let i = 0; i < 12; i++) {
        expect(extractSemanticConceptsFromVacancies(vacancies)).toEqual(first)
      }
    })

    it('dedupes repeated skill tokens in one skillsRequired string to one concept key', () => {
      const out = extractSemanticConceptsFromVacancies([
        { title: '', skillsRequired: 'Rust, rust, RUST', description: '' },
      ])
      const rust = out.filter((x) => x.concept === 'rust')
      expect(rust).toHaveLength(1)
      expect(rust[0]!.weight).toBe(3)
    })

    it('outputs concepts that are normalization-consistent and grounded (no hallucinated tokens)', () => {
      const vacancies: SemanticConceptVacancyInput[] = [
        {
          title: 'AI internship',
          skillsRequired: 'Python, NLP',
          description: 'Transformers experience helpful.',
        },
      ]
      const out = extractSemanticConceptsFromVacancies(vacancies)
      assertConceptsGroundedInVacancyText(vacancies, out)
      for (const row of out) {
        expect(row.concept).toBe(normalizeSemanticConcept(row.concept))
        expect(row.concept).not.toMatch(/[A-Z]/)
        expect(Number.isFinite(row.weight)).toBe(true)
        expect(row.weight).toBeGreaterThan(0)
        expect(row.weight).toBeLessThan(1_000_000)
        expect(Number.isInteger(row.weight)).toBe(true)
      }
      const concepts = new Set(out.map((x) => x.concept))
      expect(concepts.has('blockchain')).toBe(false)
      expect(concepts.has('quantum')).toBe(false)
    })

    it('uses lexical tie-break when two concepts share the same weight', () => {
      const vacancies: SemanticConceptVacancyInput[] = [
        { title: '', skillsRequired: 'Zebra, Apple', description: '' },
        { title: '', skillsRequired: 'Apple, Zebra', description: '' },
      ]
      const out = extractSemanticConceptsFromVacancies(vacancies)
      const apple = out.find((x) => x.concept === 'apple')
      const zebra = out.find((x) => x.concept === 'zebra')
      expect(apple).toBeDefined()
      expect(zebra).toBeDefined()
      expect(apple!.weight).toBe(zebra!.weight)
      const idxApple = out.findIndex((x) => x.concept === 'apple')
      const idxZebra = out.findIndex((x) => x.concept === 'zebra')
      expect(idxApple).toBeLessThan(idxZebra)
    })

    it('treats maxDescriptionChars 0 as no description contribution (skills/title only)', () => {
      const withDesc: SemanticConceptVacancyInput = {
        title: 'Engineer',
        skillsRequired: 'Go',
        description: 'only-in-description-pytorch-keyword',
      }
      const noSlice = extractSemanticConceptsFromVacancies([withDesc])
      const zeroSlice = extractSemanticConceptsFromVacancies([withDesc], { maxDescriptionChars: 0 })
      expect(zeroSlice.some((x) => x.concept === 'pytorch')).toBe(false)
      expect(noSlice.some((x) => x.concept === 'pytorch')).toBe(true)
    })
  })

  describe('buildSemanticConceptExplanation', () => {
    it('returns stable empty copy when conceptCount is zero', () => {
      const a = buildSemanticConceptExplanation({ conceptCount: 0 })
      const b = buildSemanticConceptExplanation({ conceptCount: 0 })
      expect(a).toBe(b)
      expect(a.toLowerCase()).toContain('matched vacancy')
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

    it('treats non-finite conceptCount like empty (safe copy)', () => {
      const t = buildSemanticConceptExplanation({ conceptCount: NaN })
      expect(t).toBe(buildSemanticConceptExplanation({ conceptCount: NaN }))
      expect(t.toLowerCase()).toContain('no semantic concepts')
    })

    it('uses grounded, non-autonomous wording (explanation safety)', () => {
      const positive = buildSemanticConceptExplanation({
        conceptCount: 2,
        topConcepts: ['go'],
      })
      const lower = positive.toLowerCase()
      expect(lower).toContain('matched vacancy')
      expect(lower).toContain('deterministic')
      expect(lower).toContain('not ai-generated')
      expect(lower).not.toContain('gpt')
      expect(lower).not.toContain('self-learning')
      expect(lower).not.toContain('neural network')
      expect(lower).not.toContain('trained model')
    })
  })
})
