export type HeadHunterImportStatus = 'IDLE' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type HeadHunterImportLogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'

export interface HeadHunterImportLogEntry {
  timestamp: string
  level: HeadHunterImportLogLevel
  message: string
}

export interface HeadHunterImportSnapshot {
  id: string
  status: HeadHunterImportStatus
  startedAt: string | null
  finishedAt: string | null
  limitBytes: number
  totalBytes: number
  progressPercent: number
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
  currentQuery: string
  currentPage: number
  stopReason: string
  lastError: string
  searchTerms: string[]
  logs: HeadHunterImportLogEntry[]
  createdAt: string
  updatedAt: string
}

export interface HeadHunterImportApiResponse {
  job: HeadHunterImportSnapshot | null
  alreadyRunning?: boolean
}
