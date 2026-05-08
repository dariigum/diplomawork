import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'

import { getSession } from '@/lib/auth'
import dbConnect from '@/lib/db/mongoose'
import { HeadHunterImportJob } from '@/lib/db/schema'
import type {
  HeadHunterImportApiResponse,
  HeadHunterImportLogLevel,
} from '@/lib/headhunter-import-types'
import {
  countHeadHunterReadyVacancies,
  getHeadHunterContentBytes,
  HEADHUNTER_IMPORT_LIMIT_BYTES,
  importFetchedHeadHunterVacancy,
  LOG_LIMIT,
  probeHeadHunterServerAccess,
  pruneHeadHunterVacanciesOlderThan,
  pruneHeadHunterVacanciesToSizeLimit,
  resolveHeadHunterImportSettings,
  serializeHeadHunterImportSettings,
  type HeadHunterImportClientSettings,
  type HeadHunterVacancyDetail,
  type HeadHunterVacancySearchItem,
} from '@/lib/headhunter-sync'
import {
  getLatestHeadHunterImportJobSnapshot,
  HEADHUNTER_IMPORT_JOB_KEY,
  serializeHeadHunterImportJob,
  startHeadHunterSyncJob,
} from '@/lib/headhunter-sync-job'

export const runtime = 'nodejs'

type ClientAction = 'prepare_client' | 'ingest_client' | 'finalize_client' | 'fail_client'
type ImportMode = 'browser' | 'server'
type PersistedHeadHunterLogEntry = {
  timestamp: Date
  level: HeadHunterImportLogLevel
  message: string
}

type VacancyImportRecord = {
  item: HeadHunterVacancySearchItem
  detail: HeadHunterVacancyDetail
}

function isSyncAuthorized(request: NextRequest, sessionRole?: string) {
  const syncSecret = process.env.HH_SYNC_SECRET
  const requestSecret = request.headers.get('x-hh-sync-secret')

  if (syncSecret && requestSecret === syncSecret) {
    return true
  }

  return sessionRole === 'ADMIN'
}

function calculateProgressPercent(totalBytes: number, limitBytes: number) {
  if (!limitBytes) return 0
  return Math.min(100, Number(((totalBytes / limitBytes) * 100).toFixed(2)))
}

function createLog(level: HeadHunterImportLogLevel, message: string): PersistedHeadHunterLogEntry {
  return {
    timestamp: new Date(),
    level,
    message,
  }
}

function extractSyncOptions(body: Record<string, unknown>) {
  return {
    text: typeof body.text === 'string' ? body.text : undefined,
    areaIds: Array.isArray(body.areaIds)
      ? body.areaIds.filter((value): value is string => typeof value === 'string')
      : typeof body.areaIds === 'string'
        ? [body.areaIds]
        : undefined,
    perPage:
      typeof body.perPage === 'number'
        ? body.perPage
        : typeof body.perPage === 'string'
          ? Number(body.perPage)
          : undefined,
    maxPages:
      typeof body.maxPages === 'number'
        ? body.maxPages
        : typeof body.maxPages === 'string'
          ? Number(body.maxPages)
          : undefined,
  }
}

async function getOrCreateHeadHunterJob() {
  let job = await HeadHunterImportJob.findOne({ key: HEADHUNTER_IMPORT_JOB_KEY })
  if (!job) {
    job = await HeadHunterImportJob.create({
      key: HEADHUNTER_IMPORT_JOB_KEY,
      status: 'IDLE',
      limitBytes: HEADHUNTER_IMPORT_LIMIT_BYTES,
      logs: [],
      searchTerms: [],
    })
  }
  return job
}

async function handlePrepareClientImport(body: Record<string, unknown>) {
  await dbConnect()

  const options = extractSyncOptions(body)
  const requestedMode = body.mode === 'browser' ? 'browser' : 'server'

  if (requestedMode === 'server') {
    try {
      await probeHeadHunterServerAccess()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reach HeadHunter API'
      if (/403 forbidden/i.test(message) || /ddos-guard/i.test(message) || /forbidden/i.test(message)) {
        const hasServerToken =
          Boolean(process.env.HH_API_TOKEN?.trim()) ||
          (Boolean(process.env.HH_CLIENT_ID?.trim()) && Boolean(process.env.HH_CLIENT_SECRET?.trim()))

        const hasTelegramFallback = Boolean(process.env.TG_IMPORT_CHANNELS?.trim())

        if (!hasServerToken && hasTelegramFallback) {
          const response = await startHeadHunterSyncJob(options)
          return NextResponse.json(
            {
              ...response,
              mode: 'server' satisfies ImportMode,
            },
            { status: response.alreadyRunning ? 200 : 202 }
          )
        }

        if (!hasServerToken) {
          return NextResponse.json(
            {
              error:
                'HeadHunter blocked access (403/ddos-guard). Browser-assisted import also fails in this environment. ' +
                'To fix: configure server token. Set either HH_API_TOKEN, or HH_CLIENT_ID + HH_CLIENT_SECRET, and also set a valid HH_USER_AGENT like "JobFlow/1.0 (you@example.com)".',
            },
            { status: 503 }
          )
        }

        const response = await startHeadHunterSyncJob(options)
        return NextResponse.json(
          {
            ...response,
            mode: 'server' satisfies ImportMode,
          },
          { status: response.alreadyRunning ? 200 : 202 }
        )
      }
      throw error
    }

    const response = await startHeadHunterSyncJob(options)
    return NextResponse.json(
      {
        ...response,
        mode: 'server' satisfies ImportMode,
      },
      { status: response.alreadyRunning ? 200 : 202 }
    )
  }

  const settings = resolveHeadHunterImportSettings(options)
  const serializedSettings = serializeHeadHunterImportSettings(settings)
  const existingJob = await getOrCreateHeadHunterJob()

  if (existingJob.status === 'RUNNING') {
    return NextResponse.json(
      {
        job: serializeHeadHunterImportJob(existingJob.toObject()),
        alreadyRunning: true,
        settings: serializedSettings,
      },
      { status: 200 }
    )
  }

  const deletedByAgeCount = await pruneHeadHunterVacanciesOlderThan(settings.cutoffDate)
  const readyCount = await countHeadHunterReadyVacancies()
  const totalBytes = await getHeadHunterContentBytes()
  const logs = [
    createLog(
      'INFO',
      `Starting browser-assisted HeadHunter import for IT vacancies. Terms: ${settings.searchTerms.join(', ')}`
    ),
  ]

  if (deletedByAgeCount > 0) {
    logs.push(
      createLog(
        'INFO',
        `Deleted ${deletedByAgeCount} outdated HeadHunter vacancies older than ${settings.cutoffDate.toISOString()}.`
      )
    )
  }

  await HeadHunterImportJob.findByIdAndUpdate(existingJob._id, {
    $set: {
      status: 'RUNNING',
      startedAt: new Date(),
      finishedAt: null,
      limitBytes: HEADHUNTER_IMPORT_LIMIT_BYTES,
      totalBytes,
      progressPercent: calculateProgressPercent(totalBytes, HEADHUNTER_IMPORT_LIMIT_BYTES),
      downloadedCount: 0,
      processedCount: 0,
      readyCount,
      importedCount: 0,
      updatedCount: 0,
      employersCreatedCount: 0,
      skippedWithoutSalaryCount: 0,
      deletedByAgeCount,
      deletedBySizeCount: 0,
      errorCount: 0,
      currentQuery: '',
      currentPage: 0,
      stopReason: '',
      lastError: '',
      searchTerms: settings.searchTerms,
      logs,
    },
  })

  const refreshedJob = await HeadHunterImportJob.findById(existingJob._id).lean()
  return NextResponse.json(
    {
      job: refreshedJob ? serializeHeadHunterImportJob(refreshedJob) : null,
      alreadyRunning: false,
      settings: serializedSettings,
      mode: 'browser' satisfies ImportMode,
    },
    { status: 202 }
  )
}

async function handleIngestClientImport(body: Record<string, unknown>) {
  await dbConnect()

  const job = await HeadHunterImportJob.findOne({ key: HEADHUNTER_IMPORT_JOB_KEY })
  if (!job || job.status !== 'RUNNING') {
    return NextResponse.json({ error: 'HeadHunter import is not running' }, { status: 409 })
  }

  const settings = body.settings as HeadHunterImportClientSettings | undefined
  if (!settings?.cutoffDate || !settings?.dateTo) {
    return NextResponse.json({ error: 'Missing import settings' }, { status: 400 })
  }

  const records = Array.isArray(body.records) ? (body.records as VacancyImportRecord[]) : []
  const currentQuery = typeof body.currentQuery === 'string' ? body.currentQuery : job.currentQuery
  const currentPage =
    typeof body.currentPage === 'number'
      ? body.currentPage
      : typeof body.currentPage === 'string'
        ? Number(body.currentPage)
        : job.currentPage

  const cutoffDate = new Date(settings.cutoffDate)
  const now = new Date(settings.dateTo)
  const placeholderPasswordHash = await bcrypt.hash(
    process.env.HH_IMPORTED_EMPLOYER_PASSWORD || 'headhunter-imported-employer',
    10
  )

  let downloadedCount = job.downloadedCount || 0
  let processedCount = job.processedCount || 0
  let readyCount = job.readyCount || 0
  let importedCount = job.importedCount || 0
  let updatedCount = job.updatedCount || 0
  let employersCreatedCount = job.employersCreatedCount || 0
  let errorCount = job.errorCount || 0
  let totalBytes = job.totalBytes || 0
  let stopReason = job.stopReason || ''
  let lastError = job.lastError || ''
  const logs: PersistedHeadHunterLogEntry[] = []

  for (const record of records) {
    if (!record?.item?.id || !record?.detail?.id) {
      continue
    }

    downloadedCount += 1

    try {
      const result = await importFetchedHeadHunterVacancy({
        item: record.item,
        detail: record.detail,
        cutoffDate,
        now,
        placeholderPasswordHash,
      })

      totalBytes = result.totalContentBytes

      if (result.stopReason) {
        stopReason = result.stopReason
        logs.push(createLog('WARNING', stopReason))
        break
      }

      if (!result.processed) {
        continue
      }

      processedCount += 1
      employersCreatedCount += result.employersCreated

      if (result.updated) {
        updatedCount += 1
      } else if (result.imported) {
        importedCount += 1
        readyCount += 1
      }

      logs.push(
        createLog(
          result.updated ? 'INFO' : 'SUCCESS',
          `${result.updated ? 'Updated' : 'Imported'} vacancy "${result.title}" for employer "${result.employerName}".`
        )
      )
    } catch (error) {
      errorCount += 1
      lastError =
        error instanceof Error ? error.message : 'Unknown HeadHunter vacancy processing error'
      logs.push(createLog('ERROR', `Vacancy ${record.item.id} failed: ${lastError}`))
    }
  }

  const patch = {
    totalBytes,
    progressPercent: calculateProgressPercent(totalBytes, HEADHUNTER_IMPORT_LIMIT_BYTES),
    downloadedCount,
    processedCount,
    readyCount,
    importedCount,
    updatedCount,
    employersCreatedCount,
    errorCount,
    currentQuery,
    currentPage,
    stopReason,
    lastError,
  }

  await HeadHunterImportJob.findByIdAndUpdate(job._id, {
    $set: patch,
    ...(logs.length > 0
      ? {
          $push: {
            logs: {
              $each: logs,
              $slice: -LOG_LIMIT,
            },
          },
        }
      : {}),
  })

  const refreshedJob = await HeadHunterImportJob.findById(job._id).lean()
  return NextResponse.json(
    {
      job: refreshedJob ? serializeHeadHunterImportJob(refreshedJob) : null,
      stopRequested: Boolean(stopReason),
    },
    { status: 200 }
  )
}

async function handleFinalizeClientImport() {
  await dbConnect()

  const job = await HeadHunterImportJob.findOne({ key: HEADHUNTER_IMPORT_JOB_KEY })
  if (!job) {
    return NextResponse.json({ error: 'HeadHunter import job not found' }, { status: 404 })
  }

  if (job.status !== 'RUNNING') {
    return NextResponse.json({ job: serializeHeadHunterImportJob(job.toObject()) }, { status: 200 })
  }

  const pruneResult = await pruneHeadHunterVacanciesToSizeLimit(HEADHUNTER_IMPORT_LIMIT_BYTES)
  const readyCount = await countHeadHunterReadyVacancies()
  const totalBytes = pruneResult.totalBytes
  const deletedBySizeCount = (job.deletedBySizeCount || 0) + pruneResult.deleted
  const stopReason =
    job.stopReason || `Import finished with ${job.processedCount} vacancies ready on the site.`
  const logs: PersistedHeadHunterLogEntry[] = []

  if (pruneResult.deleted > 0) {
    logs.push(
      createLog(
        'WARNING',
        `Storage exceeded the limit after sync, deleted ${pruneResult.deleted} oldest imported vacancies.`
      )
    )
  }

  logs.push(
    createLog(
      job.stopReason ? 'WARNING' : 'SUCCESS',
      job.stopReason
        ? 'HeadHunter import completed after reaching the storage limit.'
        : 'HeadHunter import completed successfully.'
    )
  )

  await HeadHunterImportJob.findByIdAndUpdate(job._id, {
    $set: {
      status: 'COMPLETED',
      finishedAt: new Date(),
      totalBytes,
      progressPercent: calculateProgressPercent(totalBytes, HEADHUNTER_IMPORT_LIMIT_BYTES),
      readyCount,
      deletedBySizeCount,
      stopReason,
    },
    $push: {
      logs: {
        $each: logs,
        $slice: -LOG_LIMIT,
      },
    },
  })

  const refreshedJob = await HeadHunterImportJob.findById(job._id).lean()
  return NextResponse.json({ job: refreshedJob ? serializeHeadHunterImportJob(refreshedJob) : null })
}

async function handleFailClientImport(body: Record<string, unknown>) {
  await dbConnect()

  const job = await HeadHunterImportJob.findOne({ key: HEADHUNTER_IMPORT_JOB_KEY })
  if (!job) {
    return NextResponse.json({ error: 'HeadHunter import job not found' }, { status: 404 })
  }

  const message =
    typeof body.message === 'string' && body.message.trim().length > 0
      ? body.message.trim()
      : 'HeadHunter browser-assisted import failed'

  await HeadHunterImportJob.findByIdAndUpdate(job._id, {
    $set: {
      status: 'FAILED',
      finishedAt: new Date(),
      lastError: message,
    },
    $inc: {
      errorCount: 1,
    },
    $push: {
      logs: {
        $each: [createLog('ERROR', message)],
        $slice: -LOG_LIMIT,
      },
    },
  })

  const refreshedJob = await HeadHunterImportJob.findById(job._id).lean()
  return NextResponse.json({ job: refreshedJob ? serializeHeadHunterImportJob(refreshedJob) : null })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!isSyncAuthorized(request, session?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  try {
    const action = body.action as ClientAction | undefined

    if (action === 'prepare_client') {
      return await handlePrepareClientImport(body)
    }

    if (action === 'ingest_client') {
      return await handleIngestClientImport(body)
    }

    if (action === 'finalize_client') {
      return await handleFinalizeClientImport()
    }

    if (action === 'fail_client') {
      return await handleFailClientImport(body)
    }

    const response = await startHeadHunterSyncJob(extractSyncOptions(body))
    return NextResponse.json(response, { status: response.alreadyRunning ? 200 : 202 })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sync HeadHunter vacancies',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!isSyncAuthorized(request, session?.user?.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const job = await getLatestHeadHunterImportJobSnapshot()
    return NextResponse.json({ job } satisfies HeadHunterImportApiResponse)
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to read HeadHunter sync status',
      },
      { status: 500 }
    )
  }
}
