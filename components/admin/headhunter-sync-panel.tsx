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
  const [isLogOpen, setIsLogOpen] = useState(false)
  const logBottomRef = useRef<HTMLDivElement | null>(null)

  const isRunning = job?.status === 'RUNNING'

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

  async function handleStartImport() {
    setIsStarting(true)
    setIsLogOpen(true)

    try {
      const response = await fetch('/api/headhunter/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const data = (await response.json()) as HeadHunterImportApiResponse & { error?: string }
      if (!response.ok) {
        throw new Error(data.error || 'Failed to start HeadHunter import')
      }

      setJob(data.job)

      if (data.alreadyRunning) {
        toast.message('HeadHunter import is already running')
      } else {
        toast.success('HeadHunter import started')
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
