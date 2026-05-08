import { revalidatePath } from 'next/cache'

import { HeadHunterImportJob } from '@/lib/db/schema'
import dbConnect from '@/lib/db/mongoose'
import {
  HEADHUNTER_IMPORT_LIMIT_BYTES,
  LOG_LIMIT,
  syncHeadHunterVacancies,
} from '@/lib/headhunter-sync'
import type {
  HeadHunterImportApiResponse,
  HeadHunterImportLogEntry,
  HeadHunterImportLogLevel,
  HeadHunterImportSnapshot,
} from '@/lib/headhunter-import-types'

export const HEADHUNTER_IMPORT_JOB_KEY = 'default'

type StartHeadHunterSyncOptions = {
  text?: string
  areaIds?: string[]
  perPage?: number
  maxPages?: number
  searchTerms?: string[]
}

function serializeLogs(logs: any[]): HeadHunterImportLogEntry[] {
  return (logs || []).map((entry) => ({
    timestamp: new Date(entry.timestamp).toISOString(),
    level: entry.level,
    message: entry.message,
  }))
}

export function serializeHeadHunterImportJob(job: any): HeadHunterImportSnapshot {
  return {
    id: job._id.toString(),
    status: job.status,
    startedAt: job.startedAt ? new Date(job.startedAt).toISOString() : null,
    finishedAt: job.finishedAt ? new Date(job.finishedAt).toISOString() : null,
    limitBytes: job.limitBytes || 0,
    totalBytes: job.totalBytes || 0,
    progressPercent: job.progressPercent || 0,
    downloadedCount: job.downloadedCount || 0,
    processedCount: job.processedCount || 0,
    readyCount: job.readyCount || 0,
    importedCount: job.importedCount || 0,
    updatedCount: job.updatedCount || 0,
    employersCreatedCount: job.employersCreatedCount || 0,
    skippedWithoutSalaryCount: job.skippedWithoutSalaryCount || 0,
    deletedByAgeCount: job.deletedByAgeCount || 0,
    deletedBySizeCount: job.deletedBySizeCount || 0,
    errorCount: job.errorCount || 0,
    currentQuery: job.currentQuery || '',
    currentPage: job.currentPage || 0,
    stopReason: job.stopReason || '',
    lastError: job.lastError || '',
    searchTerms: job.searchTerms || [],
    logs: serializeLogs(job.logs || []),
    createdAt: new Date(job.createdAt).toISOString(),
    updatedAt: new Date(job.updatedAt).toISOString(),
  }
}

async function appendHeadHunterLog(
  jobId: string,
  level: HeadHunterImportLogLevel,
  message: string
) {
  await HeadHunterImportJob.findByIdAndUpdate(jobId, {
    $push: {
      logs: {
        $each: [{ timestamp: new Date(), level, message }],
        $slice: -LOG_LIMIT,
      },
    },
  })
}

async function updateHeadHunterJobSnapshot(jobId: string, patch: Record<string, unknown>) {
  await HeadHunterImportJob.findByIdAndUpdate(jobId, {
    $set: patch,
  })
}

async function runHeadHunterSyncJob(jobId: string, options: StartHeadHunterSyncOptions) {
  try {
    const result = await syncHeadHunterVacancies({
      ...options,
      onLog: async (level, message) => {
        await appendHeadHunterLog(jobId, level, message)
      },
      onProgress: async (progress) => {
        await updateHeadHunterJobSnapshot(jobId, {
          limitBytes: progress.limitBytes,
          totalBytes: progress.totalContentBytes,
          progressPercent: progress.progressPercent,
          downloadedCount: progress.downloadedCount,
          processedCount: progress.processedCount,
          readyCount: progress.readyCount,
          importedCount: progress.importedCount,
          updatedCount: progress.updatedCount,
          employersCreatedCount: progress.employersCreatedCount,
          skippedWithoutSalaryCount: progress.skippedWithoutSalaryCount,
          deletedByAgeCount: progress.deletedByAgeCount,
          deletedBySizeCount: progress.deletedBySizeCount,
          errorCount: progress.errorCount,
          currentQuery: progress.currentQuery,
          currentPage: progress.currentPage,
          stopReason: progress.stopReason,
        })
      },
    })

    await HeadHunterImportJob.findByIdAndUpdate(jobId, {
      $set: {
        status: 'COMPLETED',
        finishedAt: new Date(),
        limitBytes: result.limitBytes,
        totalBytes: result.totalContentBytes,
        progressPercent: result.progressPercent,
        downloadedCount: result.downloadedCount,
        processedCount: result.processedCount,
        readyCount: result.readyCount,
        importedCount: result.importedCount,
        updatedCount: result.updatedCount,
        employersCreatedCount: result.employersCreatedCount,
        skippedWithoutSalaryCount: result.skippedWithoutSalaryCount,
        deletedByAgeCount: result.deletedByAgeCount,
        deletedBySizeCount: result.deletedBySizeCount,
        errorCount: result.errorCount,
        currentQuery: result.currentQuery,
        currentPage: result.currentPage,
        stopReason: result.stopReason,
        lastError: '',
      },
    })

    try {
      revalidatePath('/')
      revalidatePath('/companies')
      revalidatePath('/dashboard/admin')
      revalidatePath('/dashboard/employer')
    } catch {
      // Background jobs can finish outside a request lifecycle in local dev.
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown HeadHunter sync error'

    await appendHeadHunterLog(jobId, 'ERROR', message)
    await HeadHunterImportJob.findByIdAndUpdate(jobId, {
      $set: {
        status: 'FAILED',
        finishedAt: new Date(),
        lastError: message,
      },
      $inc: {
        errorCount: 1,
      },
    })
  }
}

export async function getLatestHeadHunterImportJobSnapshot(): Promise<HeadHunterImportSnapshot | null> {
  await dbConnect()

  const job = await HeadHunterImportJob.findOne({ key: HEADHUNTER_IMPORT_JOB_KEY }).lean()
  return job ? serializeHeadHunterImportJob(job) : null
}

export async function startHeadHunterSyncJob(
  options: StartHeadHunterSyncOptions = {}
): Promise<HeadHunterImportApiResponse> {
  await dbConnect()

  const existingJob = await HeadHunterImportJob.findOne({ key: HEADHUNTER_IMPORT_JOB_KEY })
  if (existingJob?.status === 'RUNNING') {
    return {
      job: serializeHeadHunterImportJob(existingJob.toObject()),
      alreadyRunning: true,
    }
  }

  const now = new Date()
  const searchTerms = options.text?.trim() ? [options.text.trim()] : options.searchTerms || []

  const job =
    existingJob ||
    (await HeadHunterImportJob.create({
      key: HEADHUNTER_IMPORT_JOB_KEY,
      status: 'IDLE',
      limitBytes: HEADHUNTER_IMPORT_LIMIT_BYTES,
      logs: [],
      searchTerms: [],
    }))

  await HeadHunterImportJob.findByIdAndUpdate(job._id, {
    $set: {
      status: 'RUNNING',
      startedAt: now,
      finishedAt: null,
      limitBytes: HEADHUNTER_IMPORT_LIMIT_BYTES,
      totalBytes: 0,
      progressPercent: 0,
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
      currentQuery: '',
      currentPage: 0,
      stopReason: '',
      lastError: '',
      searchTerms,
      logs: [{ timestamp: now, level: 'INFO', message: 'HeadHunter import queued.' }],
    },
  })

  void runHeadHunterSyncJob(job._id.toString(), options)

  const refreshedJob = await HeadHunterImportJob.findById(job._id).lean()
  return {
    job: refreshedJob ? serializeHeadHunterImportJob(refreshedJob) : null,
    alreadyRunning: false,
  }
}
