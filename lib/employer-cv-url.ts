import { parseSafeExternalUrl } from '@/lib/vacancy-detail-display'

/** Local PDF paths saved under public/uploads/resumes/ */
const LOCAL_CV_PATTERN = /^\/uploads\/resumes\/.+/

/**
 * Canonical href for employer "View CV" links.
 * - Local uploads must be absolute paths under /uploads/resumes/
 * - External values must pass parseSafeExternalUrl (http/https only)
 */
export function normalizeEmployerCvHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  let value = raw.trim()
  if (!value) return null

  if (value.startsWith('public/')) {
    value = `/${value.slice('public'.length)}`
  }
  if (value.startsWith('uploads/')) {
    value = `/${value}`
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    const external = parseSafeExternalUrl(value)
    return external?.href ?? null
  }

  if (!value.startsWith('/')) {
    return null
  }

  if (value.includes('..') || !LOCAL_CV_PATTERN.test(value)) {
    return null
  }

  return value
}

export function employerCvRawIndicatesUpload(raw: unknown): boolean {
  return typeof raw === 'string' && raw.trim().length > 0
}

/** Prefer uploaded PDF path; fall back to external cvLink. */
export function resolveEmployerCvHref(rawCvFile: unknown, rawCvLink?: unknown): string | null {
  return normalizeEmployerCvHref(rawCvFile) ?? normalizeEmployerCvHref(rawCvLink)
}

/** PDF download: external cvLink first, then uploaded cvFile. */
export function resolveEmployerPdfDownloadHref(rawCvFile: unknown, rawCvLink?: unknown): string | null {
  return normalizeEmployerCvHref(rawCvLink) ?? normalizeEmployerCvHref(rawCvFile)
}
