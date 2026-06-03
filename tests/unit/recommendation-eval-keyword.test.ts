import { describe, expect, it } from 'vitest'
import {
  buildEvalSkillTokenSet,
  computeSkillJaccardScore,
} from '@/lib/recommendation-eval-keyword'

describe('keyword eval baseline', () => {
  it('buildEvalSkillTokenSet merges delimited and recognized skills', () => {
    const tokens = buildEvalSkillTokenSet(['react, docker', 'Experience with node.js backend'])
    expect(tokens.has('react')).toBe(true)
    expect(tokens.has('docker')).toBe(true)
    expect(tokens.has('nodejs')).toBe(true)
  })

  it('computeSkillJaccardScore is 1 for identical token sets', () => {
    const a = new Set(['react', 'nodejs'])
    expect(computeSkillJaccardScore(a, new Set(a))).toBe(1)
  })

  it('computeSkillJaccardScore is 0 when one side is empty', () => {
    expect(computeSkillJaccardScore(new Set(['react']), new Set())).toBe(0)
    expect(computeSkillJaccardScore(new Set(), new Set(['react']))).toBe(0)
  })

  it('computeSkillJaccardScore uses intersection over union', () => {
    const resume = new Set(['react', 'nodejs', 'mongodb'])
    const vacancy = new Set(['react', 'docker'])
    expect(computeSkillJaccardScore(resume, vacancy)).toBeCloseTo(1 / 4)
  })
})
