import type { RawHHVacancy } from '../types/raw-hh'
import { readStringField, safeNumber, safeRecord, safeString } from './parse-safe'

function mergeEmployer(a: unknown, b: unknown) {
  const ra = safeRecord(a)
  const rb = safeRecord(b)
  if (!ra && !rb) return null
  const m = { ...ra, ...rb }
  const out = {
    id: readStringField(m, 'id'),
    name: safeString(m.name) ?? null,
    alternate_url: safeString(m.alternate_url) ?? null,
  }
  if (!out.id && !out.name && !out.alternate_url) return null
  return out
}

function mergeSalary(a: unknown, b: unknown) {
  const ra = safeRecord(a)
  const rb = safeRecord(b)
  if (!ra && !rb) return null
  const m = { ...ra, ...rb }
  const from = safeNumber(m.from)
  const to = safeNumber(m.to)
  if (from == null && to == null && !safeString(m.currency)) return null
  return {
    from,
    to,
    currency: safeString(m.currency) ?? null,
  }
}

function mergeArea(a: unknown, b: unknown) {
  const ra = safeRecord(a)
  const rb = safeRecord(b)
  if (!ra && !rb) return null
  const m = { ...ra, ...rb }
  const id = readStringField(m, 'id')
  const name = safeString(m.name) ?? null
  if (!id && !name) return null
  return { id, name }
}

function mergeAddress(a: unknown, b: unknown) {
  const ra = safeRecord(a)
  const rb = safeRecord(b)
  if (!ra && !rb) return null
  const m = { ...ra, ...rb }
  const city = safeString(m.city) ?? null
  const raw = safeString(m.raw) ?? null
  if (!city && !raw) return null
  return { city, raw }
}

function mergeNamedField(a: unknown, b: unknown) {
  const ra = safeRecord(a)
  const rb = safeRecord(b)
  if (!ra && !rb) return null
  const m = { ...ra, ...rb }
  const name = safeString(m.name) ?? null
  if (!name) return null
  return { name }
}

function mergeSchedule(a: unknown, b: unknown) {
  const ra = safeRecord(a)
  const rb = safeRecord(b)
  if (!ra && !rb) return null
  const m = { ...ra, ...rb }
  const id = readStringField(m, 'id')
  const name = safeString(m.name) ?? null
  if (!id && !name) return null
  return { id, name }
}

function mergeKeySkills(a: unknown, b: unknown): RawHHVacancy['key_skills'] {
  const pick = (v: unknown) => (Array.isArray(v) ? v : undefined)
  const merged = [...(pick(a) ?? []), ...(pick(b) ?? [])]
  if (merged.length === 0) return null
  const out: Array<{ name?: string | null }> = []
  const seen = new Set<string>()
  for (const entry of merged) {
    const r = safeRecord(entry)
    if (!r) continue
    const name = safeString(r.name)
    if (!name) continue
    const key = name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ name })
  }
  return out.length > 0 ? out : null
}

/**
 * Merges search-hit JSON with `/vacancies/{id}` detail into `RawHHVacancy`.
 * Returns null if id cannot be determined.
 */
export function mergeSearchItemAndDetail(item: unknown, detail: unknown): RawHHVacancy | null {
  const i = safeRecord(item) ?? {}
  const d = safeRecord(detail) ?? {}
  const merged: Record<string, unknown> = { ...i, ...d }

  const idRaw = merged.id
  const id = idRaw != null ? String(idRaw).trim() : ''
  if (!id) return null

  return {
    id,
    name: safeString(merged.name),
    description: typeof merged.description === 'string' ? merged.description : undefined,
    employer: mergeEmployer(i.employer, d.employer),
    salary: mergeSalary(i.salary, d.salary),
    area: mergeArea(i.area, d.area),
    address: mergeAddress(i.address, d.address),
    employment: mergeNamedField(i.employment, d.employment),
    experience: mergeNamedField(i.experience, d.experience),
    schedule: mergeSchedule(i.schedule, d.schedule),
    key_skills: mergeKeySkills(i.key_skills, d.key_skills),
    alternate_url: safeString(merged.alternate_url),
    published_at: safeString(merged.published_at),
    created_at: safeString(merged.created_at),
  }
}
