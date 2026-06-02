import { describe, expect, it } from 'vitest'
import { formatSelectedFileLabel } from '@/lib/format-selected-file-label'

describe('formatSelectedFileLabel', () => {
  it('truncates basename to 5 chars and appends extension', () => {
    expect(formatSelectedFileLabel('resume-final.pdf')).toBe('resum...pdf')
  })

  it('handles short names', () => {
    expect(formatSelectedFileLabel('a.pdf')).toBe('a...pdf')
  })

  it('handles names without extension', () => {
    expect(formatSelectedFileLabel('document')).toBe('docum...')
  })
})
