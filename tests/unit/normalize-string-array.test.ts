import { describe, expect, it } from 'vitest'
import { normalizeStringArray, safeStringArray } from '@/lib/normalize-string-array'

describe('normalizeStringArray', () => {
  it('returns string arrays as trimmed unique items', () => {
    expect(normalizeStringArray(['React', 'TypeScript'])).toEqual(['React', 'TypeScript'])
    expect(normalizeStringArray(['React', '', null, '   ', 'React'])).toEqual(['React'])
  })

  it('wraps a single string', () => {
    expect(normalizeStringArray('React')).toEqual(['React'])
  })

  it('splits delimited strings', () => {
    expect(normalizeStringArray('React, TypeScript')).toEqual(['React', 'TypeScript'])
    expect(normalizeStringArray('A; B | C')).toEqual(['A', 'B', 'C'])
    expect(normalizeStringArray('Line one\nLine two')).toEqual(['Line one', 'Line two'])
  })

  it('returns empty for nullish and malformed input', () => {
    expect(normalizeStringArray(null)).toEqual([])
    expect(normalizeStringArray(undefined)).toEqual([])
    expect(normalizeStringArray(NaN)).toEqual([])
    expect(normalizeStringArray({})).toEqual([])
    expect(normalizeStringArray(true)).toEqual([])
    expect(normalizeStringArray(42)).toEqual([])
  })

  it('exposes safeStringArray alias', () => {
    expect(safeStringArray(['Go'])).toEqual(['Go'])
  })
})
