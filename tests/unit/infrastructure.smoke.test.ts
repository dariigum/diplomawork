import { describe, expect, it } from 'vitest'
import { cn } from '@/lib/utils'

describe('vitest infrastructure', () => {
  it('runs a basic assertion', () => {
    expect(1 + 1).toBe(2)
  })

  it('resolves the @/* path alias', () => {
    expect(cn('block', 'flex')).toBe('flex')
  })

  it('loads jest-dom matchers from tests/setup.ts', () => {
    document.body.innerHTML = '<div data-testid="smoke">ok</div>'
    expect(document.querySelector('[data-testid="smoke"]')).toBeInTheDocument()
  })
})
