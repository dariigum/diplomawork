import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

import dbConnect from '@/lib/db/mongoose'
import { ChatMessage, Response, SavedVacancy, User, Vacancy } from '@/lib/db/schema'
import { DEFAULT_SALARY_CURRENCY, normalizeCurrencyCode } from '@/lib/format-salary'
import type { HeadHunterImportLogLevel } from '@/lib/headhunter-import-types'

const HEADHUNTER_API_BASE = process.env.HH_API_BASE_URL || 'https://api.hh.ru'
const HEADHUNTER_LOOKBACK_DAYS = 12
export const HEADHUNTER_IMPORT_LIMIT_BYTES = 350 * 1024 * 1024
const DEFAULT_PER_PAGE = 100
const LOG_LIMIT = 400
const DEFAULT_HH_CONTACT_EMAIL = process.env.HH_CONTACT_EMAIL || 'alimzhan.gabit@gmail.com'
const DEFAULT_HH_APP_NAME = process.env.HH_APP_NAME || 'JobFlow'

const DEFAULT_IT_SEARCH_TERMS = [
  'frontend developer',
  'backend developer',
  'fullstack developer',
  'react developer',
  'vue developer',
  'angular developer',
  'node.js developer',
  'python developer',
  'golang developer',
  'java developer',
  'devops engineer',
  'sre',
  'mobile developer',
  'ios developer',
  'android developer',
  'flutter developer',
  'react native developer',
  'machine learning engineer',
  'ai engineer',
  'data engineer',
  'qa automation',
  'фронтенд разработчик',
  'бэкенд разработчик',
  'мобильный разработчик',
  'devops',
]

const DEFAULT_KAZAKHSTAN_PRIORITY_AREA_IDS = [
  '159', // Астана
  '160', // Алматы
  '177', // Караганда
  '205', // Шымкент
  '180', // Петропавловск
  '181', // Павлодар
  '185', // Семей
  '194', // Усть-Каменогорск / Оскемен
  '176', // Кокшетау
  '154', // Актобе
  '153', // Атырау
  '152', // Актау
  '172', // Костанай
  '187', // Тараз
  '188', // Талдыкорган
  '174', // Кызылорда
  '193', // Уральск
  '192', // Туркестан
  '166', // Жезказган
  '190', // Темиртау
  '198', // Экибастуз
  '171', // Конаев
  '6251', // Абай
  '11331', // Жетысу
]

const STACK_KEYWORDS = [
  'React',
  'Next.js',
  'Vue',
  'Angular',
  'Svelte',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'NestJS',
  'Express',
  'Python',
  'Django',
  'FastAPI',
  'Flask',
  'Go',
  'Golang',
  'Java',
  'Spring',
  'Kotlin',
  'Swift',
  'Flutter',
  'Dart',
  'React Native',
  'iOS',
  'Android',
  'Docker',
  'Kubernetes',
  'AWS',
  'GCP',
  'Azure',
  'Terraform',
  'Ansible',
  'PostgreSQL',
  'MongoDB',
  'Redis',
  'GraphQL',
  'Kafka',
  'RabbitMQ',
  'PyTorch',
  'TensorFlow',
  'LLM',
  'OpenAI',
  'SQL',
  'CI/CD',
]

export interface HeadHunterEmployer {
  id?: string
  name?: string
  alternate_url?: string
}

interface HeadHunterSalary {
  from?: number | null
  to?: number | null
  currency?: string | null
}

interface HeadHunterArea {
  id?: string
  name?: string
}

interface HeadHunterAddress {
  city?: string | null
  raw?: string | null
}

interface HeadHunterSkill {
  name?: string
}

export interface HeadHunterVacancySearchItem {
  id: string
  name?: string
  employer?: HeadHunterEmployer | null
  salary?: HeadHunterSalary | null
  area?: HeadHunterArea | null
  published_at?: string
  created_at?: string
  alternate_url?: string
}

export interface HeadHunterVacancyDetail extends HeadHunterVacancySearchItem {
  description?: string
  key_skills?: HeadHunterSkill[]
  address?: HeadHunterAddress | null
  employment?: { name?: string } | null
  experience?: { name?: string } | null
  schedule?: { id?: string; name?: string } | null
}

export interface HeadHunterSearchResponse {
  items: HeadHunterVacancySearchItem[]
  pages: number
}

export interface SyncHeadHunterVacanciesProgress {
  downloadedCount: number
  processedCount: number
  readyCount: number
  importedCount: number
  updatedCount: number
  employersCreatedCount: number
  skippedWithoutSalaryCount: number
  deletedByAgeCount: number
  deletedBySizeCount: number
  errorCount: number
  totalPagesProcessed: number
  totalContentBytes: number
  limitBytes: number
  progressPercent: number
  currentQuery: string
  currentPage: number
  stopReason: string
}

export interface SyncHeadHunterVacanciesResult extends SyncHeadHunterVacanciesProgress {
  fetched: number
  imported: number
  updated: number
  employersCreated: number
  skippedWithoutSalary: number
  deletedByAge: number
  deletedBySize: number
  totalVacancyBytes: number
  collectionLimitBytes: number
  lookbackDays: number
  cutoffDate: string
  searchTerms: string[]
  stoppedByLimit: boolean
}

export interface SyncHeadHunterVacanciesOptions {
  text?: string
  areaIds?: string[]
  perPage?: number
  maxPages?: number
  searchTerms?: string[]
  onLog?: (
    level: HeadHunterImportLogLevel,
    message: string,
    progress: SyncHeadHunterVacanciesProgress
  ) => Promise<void> | void
  onProgress?: (progress: SyncHeadHunterVacanciesProgress) => Promise<void> | void
}

export interface HeadHunterImportClientSettings {
  cutoffDate: string
  dateTo: string
  areaIds: string[]
  perPage: number
  maxPages: number | null
  searchTerms: string[]
}

type ResolvedHeadHunterImportSettings = {
  cutoffDate: Date
  now: Date
  areaIds: string[]
  perPage: number
  maxPages: number | null
  searchTerms: string[]
}

export type ImportFetchedHeadHunterVacancyResult = {
  processed: boolean
  imported: boolean
  updated: boolean
  employersCreated: number
  totalContentBytes: number
  title?: string
  employerName?: string
  stopReason?: string
}

type LeanVacancy = Awaited<ReturnType<typeof Vacancy.findOne>> extends { lean(): infer T } ? T : any
type LeanEmployer = Awaited<ReturnType<typeof User.findOne>> extends { lean(): infer T } ? T : any

function getHeadHunterHeaders() {
  const configuredUserAgent = process.env.HH_USER_AGENT?.trim()
  const userAgent =
    configuredUserAgent || `${DEFAULT_HH_APP_NAME}/1.0 (${DEFAULT_HH_CONTACT_EMAIL})`

  if (!userAgent || /example\.com/i.test(userAgent) || !/@/.test(userAgent)) {
    throw new Error(
      'Invalid HH User-Agent. Set HH_USER_AGENT like "JobFlow/1.0 (your-email@example.com)" or configure HH_CONTACT_EMAIL.'
    )
  }

  const headers = new Headers({
    Accept: 'application/json',
    'User-Agent': userAgent,
  })

  if (process.env.HH_API_TOKEN) {
    headers.set('Authorization', `Bearer ${process.env.HH_API_TOKEN}`)
  }

  return headers
}

function normalizeAreaIds(input?: string[]) {
  return (input || [])
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalizeSearchTerms(input?: string[]) {
  const configured =
    input && input.length > 0
      ? input
      : process.env.HH_IMPORT_IT_TERMS
        ? process.env.HH_IMPORT_IT_TERMS.split(',')
        : DEFAULT_IT_SEARCH_TERMS

  return [...new Set(configured.map((value) => value.trim()).filter(Boolean))]
}

export function resolveHeadHunterImportSettings(
  options: SyncHeadHunterVacanciesOptions = {},
  referenceDate = new Date()
): ResolvedHeadHunterImportSettings {
  const cutoffDate = new Date(referenceDate.getTime() - HEADHUNTER_LOOKBACK_DAYS * 24 * 60 * 60 * 1000)
  const requestedAreaIds = normalizeAreaIds(
    options.areaIds && options.areaIds.length > 0
      ? options.areaIds
      : process.env.HH_IMPORT_AREA_IDS
        ? process.env.HH_IMPORT_AREA_IDS.split(',')
        : DEFAULT_KAZAKHSTAN_PRIORITY_AREA_IDS
  )
  const areaIds = requestedAreaIds.length > 0 ? requestedAreaIds : DEFAULT_KAZAKHSTAN_PRIORITY_AREA_IDS
  const configuredPerPage = toFinitePositiveNumber(options.perPage ?? null)
  const perPage = Math.max(1, Math.min(configuredPerPage || DEFAULT_PER_PAGE, 100))
  const maxPages =
    toFinitePositiveNumber(options.maxPages ?? null) ||
    toFinitePositiveNumber(process.env.HH_IMPORT_MAX_PAGES ? Number(process.env.HH_IMPORT_MAX_PAGES) : null)
  const searchTerms = options.text?.trim()
    ? normalizeSearchTerms([options.text.trim()])
    : normalizeSearchTerms(options.searchTerms)

  return {
    cutoffDate,
    now: referenceDate,
    areaIds,
    perPage,
    maxPages,
    searchTerms,
  }
}

export function serializeHeadHunterImportSettings(
  settings: ResolvedHeadHunterImportSettings
): HeadHunterImportClientSettings {
  return {
    cutoffDate: settings.cutoffDate.toISOString(),
    dateTo: settings.now.toISOString(),
    areaIds: settings.areaIds,
    perPage: settings.perPage,
    maxPages: settings.maxPages,
    searchTerms: settings.searchTerms,
  }
}

function toFinitePositiveNumber(value: number | null | undefined) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function parseDate(value?: string | null) {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
}

function htmlToPlainText(value?: string | null) {
  if (!value) return ''

  return decodeHtmlEntities(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
  ).trim()
}

function buildEmployerExternalId(employer: HeadHunterEmployer | null | undefined, vacancyId: string) {
  if (employer?.id?.trim()) {
    return employer.id.trim()
  }

  const companyName = employer?.name?.trim() || 'company'
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

  return `fallback-${slug || 'company'}-${vacancyId}`
}

function buildImportedEmployerEmail(externalId: string) {
  return `hh-employer-${externalId}@headhunter.import`
}

function getLocation(detail: HeadHunterVacancyDetail, item: HeadHunterVacancySearchItem) {
  return detail.address?.city || detail.address?.raw || detail.area?.name || item.area?.name || ''
}

function detectRemote(detail: HeadHunterVacancyDetail, location: string) {
  const scheduleId = detail.schedule?.id?.toLowerCase() || ''
  const scheduleName = detail.schedule?.name?.toLowerCase() || ''
  const locationValue = location.toLowerCase()

  return (
    scheduleId.includes('remote') ||
    scheduleName.includes('remote') ||
    scheduleName.includes('удален') ||
    locationValue.includes('remote') ||
    locationValue.includes('удален')
  )
}

function extractStack(detail: HeadHunterVacancyDetail, item: HeadHunterVacancySearchItem) {
  const directSkills = (detail.key_skills || [])
    .map((skill) => skill.name?.trim())
    .filter(Boolean) as string[]

  if (directSkills.length > 0) {
    return [...new Set(directSkills)]
  }

  const haystack = `${detail.name || item.name || ''}\n${htmlToPlainText(detail.description)}`.toLowerCase()
  return STACK_KEYWORDS.filter((keyword) => haystack.includes(keyword.toLowerCase()))
}

async function fetchHeadHunterJson<T>(path: string, searchParams?: URLSearchParams) {
  const url = new URL(path, HEADHUNTER_API_BASE)
  if (searchParams) {
    url.search = searchParams.toString()
  }

  const response = await fetch(url.toString(), {
    headers: getHeadHunterHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(formatHeadHunterRequestError(response.status, errorText))
  }

  return response.json() as Promise<T>
}

export function formatHeadHunterRequestError(status: number, errorText: string) {
  if (status === 403 && /"type"\s*:\s*"forbidden"/i.test(errorText)) {
    return [
      'HeadHunter request failed (403 forbidden).',
      'HH API blocked automated access from the current server or IP, most likely via ddos-guard.',
      'Try running the browser-assisted import from the admin panel or configure a registered HH app token in HH_API_TOKEN.',
      `HH response: ${errorText}`,
    ].join(' ')
  }

  return `HeadHunter request failed (${status}): ${errorText}`
}

async function computeCollectionBytes(model: any, match: Record<string, unknown>) {
  try {
    const stats = (await model.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalBytes: { $sum: { $bsonSize: '$$ROOT' } },
        },
      },
    ])) as Array<{ totalBytes: number }>

    return stats[0]?.totalBytes || 0
  } catch {
    const documents = (await model.find(match).lean()) as Record<string, unknown>[]
    return documents.reduce((total: number, document: Record<string, unknown>) => {
      return total + Buffer.byteLength(JSON.stringify(document), 'utf8')
    }, 0)
  }
}

export async function getHeadHunterContentBytes() {
  const [vacancyBytes, employerBytes] = await Promise.all([
    computeCollectionBytes(Vacancy, { source: 'HEADHUNTER' }),
    computeCollectionBytes(User, { role: 'EMPLOYER', source: 'HEADHUNTER' }),
  ])

  return vacancyBytes + employerBytes
}

export async function countHeadHunterReadyVacancies() {
  return Vacancy.countDocuments({ source: 'HEADHUNTER' })
}

async function deleteVacancyIdsCascade(vacancyIds: mongoose.Types.ObjectId[]) {
  if (vacancyIds.length === 0) return 0

  const vacancies = await Vacancy.find({ _id: { $in: vacancyIds } })
    .select('_id employerId source')
    .lean()

  const employerIds = vacancies
    .filter((vacancy) => vacancy.source === 'HEADHUNTER')
    .map((vacancy) => vacancy.employerId?.toString())
    .filter(Boolean) as string[]

  const responses = await Response.find({ vacancyId: { $in: vacancyIds } }).select('_id').lean()
  const responseIds = responses.map((response) => response._id)

  if (responseIds.length > 0) {
    await ChatMessage.deleteMany({ responseId: { $in: responseIds } })
    await Response.deleteMany({ _id: { $in: responseIds } })
  }

  await SavedVacancy.deleteMany({ vacancyId: { $in: vacancyIds } })
  await ChatMessage.deleteMany({ vacancyId: { $in: vacancyIds } })
  await Vacancy.deleteMany({ _id: { $in: vacancyIds } })

  if (employerIds.length > 0) {
    const uniqueEmployerIds = [...new Set(employerIds)].map((id) => new mongoose.Types.ObjectId(id))
    const remainingVacancies = await Vacancy.aggregate<{ _id: mongoose.Types.ObjectId }>([
      { $match: { employerId: { $in: uniqueEmployerIds } } },
      { $group: { _id: '$employerId' } },
    ])

    const remainingSet = new Set(remainingVacancies.map((entry) => entry._id.toString()))
    const orphanEmployerIds = uniqueEmployerIds.filter((id) => !remainingSet.has(id.toString()))

    if (orphanEmployerIds.length > 0) {
      await User.deleteMany({
        _id: { $in: orphanEmployerIds },
        role: 'EMPLOYER',
        source: 'HEADHUNTER',
      })
    }
  }

  return vacancyIds.length
}

export async function pruneHeadHunterVacanciesOlderThan(cutoffDate: Date) {
  let deleted = 0

  while (true) {
    const staleVacancies = await Vacancy.find({
      source: 'HEADHUNTER',
      $or: [
        { externalPublishedAt: { $lt: cutoffDate } },
        { externalPublishedAt: { $exists: false }, createdAt: { $lt: cutoffDate } },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(250)
      .select('_id')
      .lean()

    if (staleVacancies.length === 0) {
      break
    }

    deleted += await deleteVacancyIdsCascade(staleVacancies.map((vacancy) => vacancy._id))
  }

  return deleted
}

export async function pruneHeadHunterVacanciesToSizeLimit(limitBytes: number) {
  let totalBytes = await getHeadHunterContentBytes()
  let deleted = 0

  while (totalBytes > limitBytes) {
    const oldestVacancies = await Vacancy.find({ source: 'HEADHUNTER' })
      .sort({ createdAt: 1 })
      .limit(100)
      .select('_id')
      .lean()

    if (oldestVacancies.length === 0) {
      break
    }

    deleted += await deleteVacancyIdsCascade(oldestVacancies.map((vacancy) => vacancy._id))
    totalBytes = await getHeadHunterContentBytes()
  }

  return { deleted, totalBytes }
}

type FindOrCreateEmployerResult = {
  employer: any
  created: boolean
  previousSnapshot: LeanEmployer | null
}

async function findOrCreateHeadHunterEmployer(
  employer: HeadHunterEmployer | null | undefined,
  fallbackLocation: string,
  vacancyId: string,
  placeholderPasswordHash: string
): Promise<FindOrCreateEmployerResult> {
  const externalId = buildEmployerExternalId(employer, vacancyId)
  const nextName = employer?.name?.trim() || 'HeadHunter Employer'
  const nextLocation = fallbackLocation.trim()
  const nextWebsite = employer?.alternate_url?.trim() || ''

  const existingImportedEmployer = await User.findOne({
    source: 'HEADHUNTER',
    externalId,
  })

  if (existingImportedEmployer) {
    const previousSnapshot = existingImportedEmployer.toObject()

    if (
      existingImportedEmployer.name !== nextName ||
      (existingImportedEmployer.location || '') !== nextLocation ||
      (existingImportedEmployer.website || '') !== nextWebsite
    ) {
      existingImportedEmployer.name = nextName
      existingImportedEmployer.location = nextLocation
      existingImportedEmployer.website = nextWebsite
      existingImportedEmployer.importedAt = new Date()
      await existingImportedEmployer.save()
    }

    return { employer: existingImportedEmployer, created: false, previousSnapshot }
  }

  const matchingEmployer = await User.findOne({
    role: 'EMPLOYER',
    name: nextName,
    location: nextLocation,
    ...(nextWebsite ? { website: nextWebsite } : {}),
  })

  if (matchingEmployer) {
    const previousSnapshot = matchingEmployer.toObject()

    let changed = false
    if (!matchingEmployer.location && nextLocation) {
      matchingEmployer.location = nextLocation
      changed = true
    }
    if (!matchingEmployer.website && nextWebsite) {
      matchingEmployer.website = nextWebsite
      changed = true
    }
    if (changed) {
      matchingEmployer.importedAt = new Date()
      await matchingEmployer.save()
    }

    return { employer: matchingEmployer, created: false, previousSnapshot }
  }

  const newEmployer = await User.create({
    email: buildImportedEmployerEmail(externalId),
    passwordHash: placeholderPasswordHash,
    name: nextName,
    role: 'EMPLOYER',
    source: 'HEADHUNTER',
    externalId,
    location: nextLocation,
    website: nextWebsite,
    logoUrl: nextName.slice(0, 2).toUpperCase(),
    importedAt: new Date(),
  })

  return { employer: newEmployer, created: true, previousSnapshot: null }
}

async function restoreEmployerSnapshot(snapshot: LeanEmployer | null, employerId: mongoose.Types.ObjectId) {
  if (!snapshot) {
    const hasVacancies = await Vacancy.exists({ employerId })
    if (!hasVacancies) {
      await User.deleteOne({ _id: employerId, source: 'HEADHUNTER', role: 'EMPLOYER' })
    }
    return
  }

  await User.replaceOne({ _id: employerId }, snapshot, { upsert: true })
}

async function restoreVacancySnapshot(snapshot: LeanVacancy | null, vacancyId: mongoose.Types.ObjectId) {
  if (!snapshot) {
    await deleteVacancyIdsCascade([vacancyId])
    return
  }

  await Vacancy.replaceOne({ _id: vacancyId }, snapshot, { upsert: true })
}

export async function importFetchedHeadHunterVacancy({
  item,
  detail,
  cutoffDate,
  now,
  placeholderPasswordHash,
}: {
  item: HeadHunterVacancySearchItem
  detail: HeadHunterVacancyDetail
  cutoffDate: Date
  now: Date
  placeholderPasswordHash: string
}): Promise<ImportFetchedHeadHunterVacancyResult> {
  const salaryFrom = detail.salary?.from ?? item.salary?.from ?? detail.salary?.to ?? item.salary?.to
  const salaryTo = detail.salary?.to ?? item.salary?.to ?? detail.salary?.from ?? item.salary?.from

  const location = getLocation(detail, item)
  const remote = detectRemote(detail, location)
  const stack = extractStack(detail, item)
  const description = htmlToPlainText(detail.description)
  const salaryCurrency =
    normalizeCurrencyCode(detail.salary?.currency || item.salary?.currency || '') ||
    DEFAULT_SALARY_CURRENCY
  const createdAtValue =
    detail.created_at ||
    item.created_at ||
    detail.published_at ||
    item.published_at ||
    now.toISOString()
  const publishedAtValue =
    detail.published_at ||
    item.published_at ||
    detail.created_at ||
    item.created_at ||
    createdAtValue

  const createdDate = parseDate(createdAtValue) || now
  const publishedDate = parseDate(publishedAtValue) || createdDate

  if (publishedDate < cutoffDate) {
    return {
      processed: false,
      imported: false,
      updated: false,
      employersCreated: 0,
      totalContentBytes: await getHeadHunterContentBytes(),
    }
  }

  const employerResult = await findOrCreateHeadHunterEmployer(
    detail.employer,
    location,
    item.id,
    placeholderPasswordHash
  )

  const previousVacancy = await Vacancy.findOne({
    source: 'HEADHUNTER',
    externalId: item.id,
  }).lean()

  const vacancyPayload = {
    employerId: employerResult.employer._id,
    source: 'HEADHUNTER' as const,
    externalId: item.id,
    title: detail.name?.trim() || item.name?.trim() || 'Untitled vacancy',
    description,
    skillsRequired: stack.join(', '),
    salaryMin: salaryFrom ?? salaryTo ?? null,
    salaryMax: salaryTo ?? salaryFrom ?? null,
    salaryCurrency,
    experience: detail.experience?.name || 'Not specified',
    employmentType: detail.employment?.name || 'Full-time',
    workFormat: detail.schedule?.name || (remote ? 'Remote' : 'Onsite'),
    workMode: remote ? 'REMOTE' : 'ONSITE',
    country: '',
    city: location,
    address: location || (remote ? 'Remote' : ''),
    sourceUrl: detail.alternate_url || item.alternate_url || '',
    externalPublishedAt: publishedDate,
    importedAt: new Date(),
    createdAt: createdDate,
    requirements: stack.length > 0 ? stack : undefined,
  }

  const savedVacancy = await Vacancy.findOneAndUpdate(
    { source: 'HEADHUNTER', externalId: item.id },
    { $set: vacancyPayload },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const isUpdate = Boolean(previousVacancy)
  const totalContentBytes = await getHeadHunterContentBytes()

  if (totalContentBytes > HEADHUNTER_IMPORT_LIMIT_BYTES) {
    await restoreVacancySnapshot(previousVacancy, savedVacancy._id)
    await restoreEmployerSnapshot(employerResult.previousSnapshot, employerResult.employer._id)

    const rolledBackBytes = await getHeadHunterContentBytes()
    return {
      processed: false,
      imported: false,
      updated: false,
      employersCreated: 0,
      totalContentBytes: rolledBackBytes,
      stopReason:
        `Storage limit reached at ${toMegabytes(rolledBackBytes)} MB. The last incomplete vacancy was rolled back.`,
    }
  }

  return {
    processed: true,
    imported: !isUpdate,
    updated: isUpdate,
    employersCreated: employerResult.created ? 1 : 0,
    totalContentBytes,
    title: vacancyPayload.title,
    employerName: employerResult.employer.name,
  }
}

function createInitialProgress(limitBytes: number): SyncHeadHunterVacanciesProgress {
  return {
    downloadedCount: 0,
    processedCount: 0,
    readyCount: 0,
    importedCount: 0,
    updatedCount: 0,
    employersCreatedCount: 0,
    skippedWithoutSalaryCount: 0,
    deletedByAgeCount: 0,
    deletedBySizeCount: 0,
    errorCount: 0,
    totalPagesProcessed: 0,
    totalContentBytes: 0,
    limitBytes,
    progressPercent: 0,
    currentQuery: '',
    currentPage: 0,
    stopReason: '',
  }
}

function withProgressPercent(progress: SyncHeadHunterVacanciesProgress) {
  return {
    ...progress,
    progressPercent:
      progress.limitBytes > 0
        ? Math.min(100, Number(((progress.totalContentBytes / progress.limitBytes) * 100).toFixed(2)))
        : 0,
  }
}

function toMegabytes(bytes: number) {
  return Number((bytes / (1024 * 1024)).toFixed(2))
}

export async function syncHeadHunterVacancies(
  options: SyncHeadHunterVacanciesOptions = {}
): Promise<SyncHeadHunterVacanciesResult> {
  await dbConnect()

  const settings = resolveHeadHunterImportSettings(options)
  const {
    cutoffDate,
    areaIds: normalizedAreaIds,
    perPage,
    maxPages: configuredMaxPages,
    searchTerms,
    now,
  } = settings
  const placeholderPasswordHash = await bcrypt.hash(
    process.env.HH_IMPORTED_EMPLOYER_PASSWORD || 'headhunter-imported-employer',
    10
  )

  let progress = createInitialProgress(HEADHUNTER_IMPORT_LIMIT_BYTES)
  const emitProgress = async () => {
    progress = withProgressPercent(progress)
    await options.onProgress?.(progress)
  }
  const emitLog = async (level: HeadHunterImportLogLevel, message: string) => {
    await options.onLog?.(level, message, withProgressPercent(progress))
  }

  await emitLog(
    'INFO',
    `Starting HeadHunter import for IT vacancies. Terms: ${searchTerms.join(', ')}`
  )

  progress.deletedByAgeCount = await pruneHeadHunterVacanciesOlderThan(cutoffDate)
  if (progress.deletedByAgeCount > 0) {
    await emitLog(
      'INFO',
      `Deleted ${progress.deletedByAgeCount} outdated HeadHunter vacancies older than ${cutoffDate.toISOString()}.`
    )
  }

  progress.readyCount = await countHeadHunterReadyVacancies()
  progress.totalContentBytes = await getHeadHunterContentBytes()
  await emitProgress()

  const seenVacancyIds = new Set<string>()
  let stoppedByLimit = false

  for (const searchTerm of searchTerms) {
    if (stoppedByLimit) break

    let page = 0
    let totalPages = 1
    progress.currentQuery = searchTerm
    progress.currentPage = 0
    await emitLog('INFO', `Searching HH for "${searchTerm}".`)
    await emitProgress()

    while (page < totalPages && (configuredMaxPages === null || page < configuredMaxPages)) {
      if (stoppedByLimit) break

      const searchParams = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        order_by: 'publication_time',
        date_from: cutoffDate.toISOString(),
        date_to: now.toISOString(),
        text: searchTerm,
      })

      for (const areaId of normalizedAreaIds) {
        searchParams.append('area', areaId)
      }

      const searchResponse = await fetchHeadHunterJson<HeadHunterSearchResponse>('/vacancies', searchParams)
      totalPages = searchResponse.pages || 0
      progress.totalPagesProcessed += 1
      progress.currentPage = page + 1
      await emitLog(
        'INFO',
        `Query "${searchTerm}": page ${page + 1}/${Math.max(totalPages, 1)}, ${searchResponse.items.length} vacancies received.`
      )
      await emitProgress()

      for (const item of searchResponse.items) {
        if (stoppedByLimit) break
        if (seenVacancyIds.has(item.id)) {
          continue
        }
        seenVacancyIds.add(item.id)
        progress.downloadedCount += 1

        try {
          const detail = await fetchHeadHunterJson<HeadHunterVacancyDetail>(`/vacancies/${item.id}`)
          const result = await importFetchedHeadHunterVacancy({
            item,
            detail,
            cutoffDate,
            now,
            placeholderPasswordHash,
          })

          progress.totalContentBytes = result.totalContentBytes

          if (result.stopReason) {
            progress.stopReason = result.stopReason
            stoppedByLimit = true
            await emitLog('WARNING', progress.stopReason)
            await emitProgress()
            break
          }

          if (!result.processed) {
            continue
          }

          progress.employersCreatedCount += result.employersCreated
          if (result.updated) {
            progress.updatedCount += 1
          } else if (result.imported) {
            progress.importedCount += 1
            progress.readyCount += 1
          }

          progress.processedCount += 1

          await emitLog(
            result.updated ? 'INFO' : 'SUCCESS',
            `${result.updated ? 'Updated' : 'Imported'} vacancy "${result.title}" for employer "${result.employerName}".`
          )
          await emitProgress()
        } catch (error) {
          progress.errorCount += 1
          const message =
            error instanceof Error ? error.message : 'Unknown HeadHunter vacancy processing error'
          await emitLog('ERROR', `Vacancy ${item.id} failed: ${message}`)
          await emitProgress()
        }
      }

      page += 1
    }
  }

  if (!stoppedByLimit) {
    const pruneResult = await pruneHeadHunterVacanciesToSizeLimit(HEADHUNTER_IMPORT_LIMIT_BYTES)
    progress.deletedBySizeCount = pruneResult.deleted
    progress.readyCount = Math.max(0, progress.readyCount - pruneResult.deleted)
    progress.totalContentBytes = pruneResult.totalBytes
    if (pruneResult.deleted > 0) {
      await emitLog(
        'WARNING',
        `Storage exceeded the limit after sync, deleted ${pruneResult.deleted} oldest imported vacancies.`
      )
    }
  }

  if (!progress.stopReason) {
    progress.stopReason = stoppedByLimit
      ? progress.stopReason
      : `Import finished with ${progress.processedCount} vacancies ready on the site.`
  }

  await emitLog(
    stoppedByLimit ? 'WARNING' : 'SUCCESS',
    stoppedByLimit
      ? 'Import stopped because the 350 MB limit was reached.'
      : 'HeadHunter import completed successfully.'
  )

  await emitProgress()

  return {
    ...withProgressPercent(progress),
    fetched: progress.downloadedCount,
    imported: progress.importedCount,
    updated: progress.updatedCount,
    employersCreated: progress.employersCreatedCount,
    skippedWithoutSalary: progress.skippedWithoutSalaryCount,
    deletedByAge: progress.deletedByAgeCount,
    deletedBySize: progress.deletedBySizeCount,
    totalVacancyBytes: progress.totalContentBytes,
    collectionLimitBytes: HEADHUNTER_IMPORT_LIMIT_BYTES,
    lookbackDays: HEADHUNTER_LOOKBACK_DAYS,
    cutoffDate: cutoffDate.toISOString(),
    searchTerms,
    stoppedByLimit,
  }
}

export { LOG_LIMIT }
