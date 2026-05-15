import { describe, expect, it } from 'vitest'
import {
  buildVacancyDetailView,
  formatEmployerLogoMark,
  formatPostedDate,
  formatVacancyLocation,
  parseSafeExternalUrl,
  VACANCY_POSTED_FALLBACK,
} from '@/lib/vacancy-detail-display'

describe('vacancy-detail-display', () => {
  it('formats location and posted date safely', () => {
    expect(formatVacancyLocation({ workMode: 'REMOTE' })).toBe('Remote')
    expect(formatVacancyLocation({ city: 'Berlin', country: 'DE' })).toBe('Berlin, DE')
    expect(formatPostedDate('not-a-date')).toBe(VACANCY_POSTED_FALLBACK)
    expect(formatPostedDate('2024-06-15T12:00:00.000Z')).not.toBe(VACANCY_POSTED_FALLBACK)
  })

  it('accepts only safe external URLs', () => {
    expect(parseSafeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(parseSafeExternalUrl('example.com')).toMatchObject({
      href: 'https://example.com/',
    })
    expect(parseSafeExternalUrl('https://hh.ru/vacancy/1')).not.toBeNull()
  })

  it('uses initials instead of raw logo URLs', () => {
    expect(formatEmployerLogoMark({ logoUrl: 'https://cdn.example.com/logo.png' })).toBe('JC')
    expect(formatEmployerLogoMark({ logoUrl: '🏢', name: 'Acme' })).toBe('🏢')
  })

  it('builds a view without throwing on malformed records', () => {
    const view = buildVacancyDetailView(
      {
        title: null,
        description: '',
        responsibilities: 'Do things, Ship code',
        requirements: { bad: true },
        skillsRequired: ['React'],
        salaryMin: null,
        createdAt: 'invalid',
        employerId: null,
        sourceUrl: 'not a url',
      },
      'abc',
    )

    expect(view.title).toBe('Untitled vacancy')
    expect(view.responsibilities).toEqual(['Do things', 'Ship code'])
    expect(view.requirements).toEqual([])
    expect(view.skills).toEqual(['React'])
    expect(view.showRequirementsSection).toBe(false)
    expect(view.companyWebsite).toBeNull()
    expect(view.sourceListing).toBeNull()
    expect(view.metadataIncomplete).toBe(true)
  })
})
