'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useEffectEvent } from 'react'
import { AlertCircle, CheckCircle2, Database, Download, HardDrive, Play, ScrollText } from 'lucide-react'
import { toast } from 'sonner'

import type {
  HeadHunterImportApiResponse,
  HeadHunterImportLogEntry,
  HeadHunterImportSnapshot,
} from '@/lib/headhunter-import-types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'

type HeadHunterBrowserImportSettings = {
  cutoffDate: string
  dateTo: string
  areaIds: string[]
  perPage: number
  maxPages: number | null
  searchTerms: string[]
}

type HeadHunterSearchItem = {
  id: string
  name?: string
  employer?: {
    id?: string
    name?: string
    alternate_url?: string
  } | null
  salary?: {
    from?: number | null
    to?: number | null
    currency?: string | null
  } | null
  area?: {
    id?: string
    name?: string
  } | null
  published_at?: string
  created_at?: string
  alternate_url?: string
}

type HeadHunterVacancyDetail = HeadHunterSearchItem & {
  description?: string
  key_skills?: Array<{ name?: string }>
  address?: {
    city?: string | null
    raw?: string | null
  } | null
  employment?: { name?: string } | null
  experience?: { name?: string } | null
  schedule?: { id?: string; name?: string } | null
}

type HeadHunterSearchResponse = {
  items: HeadHunterSearchItem[]
  pages: number
}

type HeadHunterSyncMutationResponse = HeadHunterImportApiResponse & {
  error?: string
  settings?: HeadHunterBrowserImportSettings
  stopRequested?: boolean
  mode?: 'browser' | 'server'
}

function formatMegabytes(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatTimestamp(value?: string | null) {
  if (!value) return 'Not started'
  return new Date(value).toLocaleString()
}

function getStatusTone(status: HeadHunterImportSnapshot['status']) {
  switch (status) {
    case 'RUNNING':
      return 'bg-primary/10 text-primary border-primary/20'
    case 'COMPLETED':
      return 'bg-green-500/10 text-green-700 border-green-500/20'
    case 'FAILED':
      return 'bg-destructive/10 text-destructive border-destructive/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

function LogLine({ entry }: { entry: HeadHunterImportLogEntry }) {
  const tone =
    entry.level === 'ERROR'
      ? 'text-destructive'
      : entry.level === 'WARNING'
        ? 'text-amber-600'
        : entry.level === 'SUCCESS'
          ? 'text-green-700'
          : 'text-foreground'

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline" className={tone}>
          {entry.level}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {new Date(entry.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <p className="mt-2 text-sm text-foreground">{entry.message}</p>
    </div>
  )
}

export function HeadHunterSyncPanel({
  initialJob,
}: {
  initialJob: HeadHunterImportSnapshot | null
}) {
  const [job, setJob] = useState<HeadHunterImportSnapshot | null>(initialJob)
  const [isStarting, setIsStarting] = useState(false)
  const [isClientImporting, setIsClientImporting] = useState(false)
  const [isLogOpen, setIsLogOpen] = useState(false)
  const logBottomRef = useRef<HTMLDivElement | null>(null)

  const isRunning = job?.status === 'RUNNING' || isClientImporting

  const pollStatus = useEffectEvent(async () => {
    try {
      const response = await fetch('/api/headhunter/sync', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to read HeadHunter sync status')
      }

      const data = (await response.json()) as HeadHunterImportApiResponse
      setJob(data.job)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to read HeadHunter sync status'
      toast.error(message)
    }
  })

  useEffect(() => {
    if (!isRunning) return

    const intervalId = window.setInterval(() => {
      void pollStatus()
    }, 2000)

    return () => window.clearInterval(intervalId)
  }, [isRunning, pollStatus])

  useEffect(() => {
    if (!isLogOpen) return
    logBottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isLogOpen, job?.logs.length])

  const recentLogs = useMemo(() => (job?.logs || []).slice(-5), [job?.logs])

  function formatHeadHunterBrowserError(status: number, errorText: string) {
    if (status === 403 && /"type"\s*:\s*"forbidden"/i.test(errorText)) {
      return [
        'HeadHunter blocked browser requests from the current environment (403 forbidden).',
        'This usually means ddos-guard rejected the import.',
        'If it keeps happening, open hh.ru in the same browser, confirm access there, or configure a registered HH app token in HH_API_TOKEN on the server.',
      ].join(' ')
    }

    return `HeadHunter request failed (${status}): ${errorText}`
  }

  async function fetchHeadHunterJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(formatHeadHunterBrowserError(response.status, errorText))
    }

    return response.json() as Promise<T>
  }

  async function mutateSyncRoute(payload: Record<string, unknown>) {
    const response = await fetch('/api/headhunter/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = (await response.json()) as HeadHunterSyncMutationResponse
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update HeadHunter import')
    }

    if (data.job) {
      setJob(data.job)
    }

    return data
  }

  async function runBrowserAssistedImport(settings: HeadHunterBrowserImportSettings) {
    const seenVacancyIds = new Set<string>()

    try {
      for (const searchTerm of settings.searchTerms) {
        let page = 0
        let totalPages = 1

        while (page < totalPages && (settings.maxPages === null || page < settings.maxPages)) {
          const searchParams = new URLSearchParams({
            page: String(page),
            per_page: String(settings.perPage),
            order_by: 'publication_time',
            date_from: settings.cutoffDate,
            date_to: settings.dateTo,
            text: searchTerm,
          })

          for (const areaId of settings.areaIds) {
            searchParams.append('area', areaId)
          }

          const searchResponse = await fetchHeadHunterJson<HeadHunterSearchResponse>(
            `https://api.hh.ru/vacancies?${searchParams.toString()}`
          )
          totalPages = searchResponse.pages || 0

          const records: Array<{ item: HeadHunterSearchItem; detail: HeadHunterVacancyDetail }> = []
          for (const item of searchResponse.items) {
            if (seenVacancyIds.has(item.id)) {
              continue
            }

            seenVacancyIds.add(item.id)
            const detail = await fetchHeadHunterJson<HeadHunterVacancyDetail>(
              `https://api.hh.ru/vacancies/${item.id}`
            )
            records.push({ item, detail })
          }

          const chunkSize = 10
          for (let index = 0; index < records.length; index += chunkSize) {
            const chunk = records.slice(index, index + chunkSize)
            const data = await mutateSyncRoute({
              action: 'ingest_client',
              settings,
              currentQuery: searchTerm,
              currentPage: page + 1,
              records: chunk,
            })

            if (data.stopRequested) {
              page = totalPages
              break
            }
          }

          page += 1
        }
      }

      await mutateSyncRoute({ action: 'finalize_client' })
      toast.success('HeadHunter import completed')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'HeadHunter browser-assisted import failed'
      await mutateSyncRoute({ action: 'fail_client', message }).catch(() => undefined)
      toast.error(message)
    } finally {
      setIsClientImporting(false)
      void pollStatus()
    }
  }

  async function handleStartImport() {
    setIsStarting(true)
    setIsLogOpen(true)

    try {
      const data = await mutateSyncRoute({ action: 'prepare_client' })

      if (data.alreadyRunning) {
        toast.message('HeadHunter import is already running')
      } else if (data.mode === 'server') {
        toast.success('HeadHunter server import started')
        void pollStatus()
      } else if (!data.settings) {
        throw new Error('HeadHunter import settings were not returned by the server')
      } else {
        setIsClientImporting(true)
        toast.success('HeadHunter browser-assisted import started')
        void runBrowserAssistedImport(data.settings)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start HeadHunter import'
      toast.error(message)
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <>
      <Card className="border-primary/10">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CardTitle>HeadHunter IT Import</CardTitle>
                <Badge variant="outline" className={getStatusTone(job?.status || 'IDLE')}>
                  {job?.status || 'IDLE'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Imports Kazakhstan-focused IT vacancies and employer accounts from HeadHunter with a hard storage limit of 350 MB.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleStartImport} disabled={isStarting || isRunning}>
                {isStarting || isRunning ? (
                  <>
                    <Spinner className="mr-2" />
                    {isRunning ? 'Import running' : 'Starting'}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start HH import
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsLogOpen(true)}
                disabled={!job}
              >
                <ScrollText className="mr-2 h-4 w-4" />
                Open logs
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Storage usage</span>
              <span className="font-medium">
                {formatMegabytes(job?.totalBytes || 0)} / {formatMegabytes(job?.limitBytes || 350 * 1024 * 1024)}
              </span>
            </div>
            <Progress value={job?.progressPercent || 0} className="h-2.5" />
            <p className="text-xs text-muted-foreground">
              Progress: {(job?.progressPercent || 0).toFixed(2)}%
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Download className="h-4 w-4" />
                Downloaded from HH
              </div>
              <p className="mt-3 text-2xl font-bold">{job?.downloadedCount || 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Ready on site
              </div>
              <p className="mt-3 text-2xl font-bold">{job?.readyCount || 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                Employers created
              </div>
              <p className="mt-3 text-2xl font-bold">{job?.employersCreatedCount || 0}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <HardDrive className="h-4 w-4" />
                Processed
              </div>
              <p className="mt-3 text-2xl font-bold">{job?.processedCount || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Import state
              </div>
              <div className="mt-4 space-y-2 text-muted-foreground">
                <p>Started: {formatTimestamp(job?.startedAt)}</p>
                <p>Finished: {formatTimestamp(job?.finishedAt)}</p>
                <p>Current query: {job?.currentQuery || 'Waiting for start'}</p>
                <p>Current page: {job?.currentPage || 0}</p>
                <p>Imported: {job?.importedCount || 0}</p>
                <p>Updated: {job?.updatedCount || 0}</p>
                <p>Skipped without salary: {job?.skippedWithoutSalaryCount || 0}</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="h-4 w-4" />
                Alerts
              </div>
              <div className="mt-4 space-y-2 text-muted-foreground">
                <p>Errors: {job?.errorCount || 0}</p>
                <p>Deleted by age: {job?.deletedByAgeCount || 0}</p>
                <p>Deleted by size: {job?.deletedBySizeCount || 0}</p>
                <p>Stop reason: {job?.stopReason || 'Not stopped'}</p>
                <p>Last error: {job?.lastError || 'No errors'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">Recent logs</h3>
              <Button variant="ghost" size="sm" onClick={() => setIsLogOpen(true)} disabled={!job}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {recentLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs yet.</p>
              ) : (
                recentLogs.map((entry, index) => <LogLine key={`${entry.timestamp}-${index}`} entry={entry} />)
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isLogOpen} onOpenChange={setIsLogOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>HeadHunter import logs</DialogTitle>
            <DialogDescription>
              Live log stream for the current or latest HeadHunter import run.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[28rem] rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-3 pr-3">
              {(job?.logs || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No logs yet.</p>
              ) : (
                (job?.logs || []).map((entry, index) => (
                  <LogLine key={`${entry.timestamp}-${index}`} entry={entry} />
                ))
              )}
              <div ref={logBottomRef} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}
