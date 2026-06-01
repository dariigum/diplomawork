import { describe, expect, it } from 'vitest'
import {
  computeOverlapSkills,
  employerMatchFitLevel,
  matchScorePercent,
} from '@/lib/employer-candidate-matching'

describe('employer-candidate-matching', () => {
  it('maps semantic score to percent', () => {
    expect(matchScorePercent(0.87)).toBe(87)
    expect(matchScorePercent(0)).toBe(0)
    expect(matchScorePercent(NaN)).toBe(0)
  })

  it('assigns fit levels at 80/60 thresholds', () => {
    expect(employerMatchFitLevel(80)).toBe('Strong Fit')
    expect(employerMatchFitLevel(79)).toBe('Related')
    expect(employerMatchFitLevel(60)).toBe('Related')
    expect(employerMatchFitLevel(59)).toBe('Exploratory')
  })

  it('computes deterministic skill overlap', () => {
    const vacancyText = 'React, TypeScript, Next.js'
    const resumeText = 'React, TypeScript, Python'
    const overlap = computeOverlapSkills(vacancyText, resumeText)
    expect(overlap.map((s) => s.toLowerCase())).toContain('react')
    expect(overlap.map((s) => s.toLowerCase())).toContain('typescript')
    expect(overlap.map((s) => s.toLowerCase())).not.toContain('python')
  })
})
