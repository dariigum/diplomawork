import { describe, expect, it } from 'vitest'
import { normalizeEmployerCvHref, resolveEmployerCvHref } from '@/lib/employer-cv-url'

describe('normalizeEmployerCvHref', () => {
  it('accepts canonical public upload paths', () => {
    expect(normalizeEmployerCvHref('/uploads/resumes/123-file.pdf')).toBe(
      '/uploads/resumes/123-file.pdf',
    )
  })

  it('fixes uploads path missing leading slash', () => {
    expect(normalizeEmployerCvHref('uploads/resumes/a.pdf')).toBe('/uploads/resumes/a.pdf')
  })

  it('rejects dashboard-relative paths that cause app 404', () => {
    expect(normalizeEmployerCvHref('uploads/resumes/x.pdf')).not.toContain('/dashboard')
    expect(normalizeEmployerCvHref('/dashboard/employee/resume/abc')).toBeNull()
  })

  it('rejects empty and unsafe values', () => {
    expect(normalizeEmployerCvHref('')).toBeNull()
    expect(normalizeEmployerCvHref('javascript:alert(1)')).toBeNull()
  })

  it('allows https external CV when safe', () => {
    expect(normalizeEmployerCvHref('https://example.com/cv.pdf')).toBe('https://example.com/cv.pdf')
  })

  it('prefers cvFile then cvLink', () => {
    expect(
      resolveEmployerCvHref('/uploads/resumes/a.pdf', 'https://example.com/backup.pdf'),
    ).toBe('/uploads/resumes/a.pdf')
    expect(resolveEmployerCvHref('', 'https://example.com/cv.pdf')).toBe('https://example.com/cv.pdf')
  })
})
