"use client"

import { useState, useTransition } from "react"
import { Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n/provider"
import { toast } from "sonner"

type ReportJobDialogProps = {
  vacancyId: string
  jobTitle: string
}

export function ReportJobDialog({ vacancyId, jobTitle }: ReportJobDialogProps) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = () => {
    const trimmed = reason.trim()
    if (trimmed.length < 5) {
      toast.error(t.jobs.reportJobReasonRequired)
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/jobs/report", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vacancyId,
            title: jobTitle,
            reason: trimmed,
          }),
        })

        const data = (await res.json()) as { error?: string }

        if (!res.ok || data.error) {
          toast.error(t.jobs.reportJobError)
          return
        }

        toast.success(t.jobs.reportJobSuccess)
        setReason("")
        setOpen(false)
      } catch {
        toast.error(t.jobs.reportJobError)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-auto flex w-full max-w-sm items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <Flag className="h-4 w-4 shrink-0" />
          {t.jobs.reportJob}
        </button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm gap-4 p-4 sm:max-w-sm">
        <DialogHeader className="gap-1 text-left">
          <DialogTitle className="text-base">{t.jobs.reportJobTitle}</DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {t.jobs.reportJobDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label htmlFor="report-reason" className="text-sm font-medium text-foreground">
            {t.jobs.reportJobReasonLabel}
          </label>
          <Textarea
            id="report-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t.jobs.reportJobReasonPlaceholder}
            rows={5}
            maxLength={2000}
            disabled={isPending}
            className="min-h-[120px] resize-none text-sm"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {t.jobs.reportJobCancel}
          </Button>
          <Button type="button" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? t.common.loading : t.jobs.reportJobSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
