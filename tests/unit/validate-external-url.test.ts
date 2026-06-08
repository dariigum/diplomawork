import { afterEach, describe, expect, it, vi } from 'vitest'
import { isExternalUrlReachable } from '@/lib/validate-external-url'
import { resolveVacancySourceListing } from '@/lib/vacancy-detail-display'

describe('validate-external-url', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('accepts reachable http(s) responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 200, ok: true }),
    )

    await expect(isExternalUrlReachable('https://example.com/job/1')).resolves.toBe(true)
  })

  it('rejects unreachable or error responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 404, ok: false }),
    )

    await expect(isExternalUrlReachable('https://example.com/missing')).resolves.toBe(false)
  })

  it('resolveVacancySourceListing returns null for unsafe or dead links', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 500, ok: false }),
    )

    await expect(resolveVacancySourceListing('https://hh.ru/vacancy/1')).resolves.toBeNull()
    await expect(resolveVacancySourceListing('javascript:alert(1)')).resolves.toBeNull()
  })
})
