/**
 * Minimal HeadHunter-style vacancy payload (search item + detail overlap).
 * Not a full OpenAPI mirror — only fields needed for deterministic normalization in 6A.
 */
export interface RawHHVacancy {
  id: string
  name?: string
  description?: string
  employer?: { id?: string; name?: string | null; alternate_url?: string | null } | null
  salary?: {
    from?: number | null
    to?: number | null
    currency?: string | null
  } | null
  area?: { id?: string; name?: string | null } | null
  address?: { city?: string | null; raw?: string | null } | null
  employment?: { name?: string | null } | null
  experience?: { name?: string | null } | null
  schedule?: { id?: string; name?: string | null } | null
  /** Detail endpoint returns key_skills; search item may omit. */
  key_skills?: Array<{ name?: string | null }> | null
  alternate_url?: string | null
  published_at?: string | null
  created_at?: string | null
}
