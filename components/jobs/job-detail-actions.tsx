"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ApplyModal } from "@/components/jobs/apply-modal"
import { toggleSaveVacancyAction } from "@/app/actions/vacancy"
import { emitSavedVacanciesUpdated } from "@/lib/saved-vacancies-events"
import { toast } from "sonner"

interface JobDetailActionsProps {
  job: {
    id: string
    title: string
    company: string
    location: string
  }
  initialSaved: boolean
  canApply: boolean
}

export function JobDetailActions({ job, initialSaved, canApply }: JobDetailActionsProps) {
  const [isSaved, setIsSaved] = useState(initialSaved)
  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    const previousState = isSaved
    setIsSaved(!previousState)

    startTransition(async () => {
      const result = await toggleSaveVacancyAction(job.id)
      if (result?.error) {
        setIsSaved(previousState)
        toast.error("Only employees can save vacancies.")
        return
      }

      setIsSaved(!!result.saved)
      emitSavedVacanciesUpdated()
      toast.success(result.saved ? "Vacancy saved." : "Vacancy removed from saved.")
    })
  }

  return (
    <>
      <div className="space-y-4">
        {canApply && (
          <Button className="w-full h-12 text-base" size="lg" onClick={() => setIsApplyOpen(true)}>
            Apply Now
          </Button>
        )}
        <Button
          variant="outline"
          className="w-full h-12 text-base"
          size="lg"
          onClick={handleSave}
          disabled={isPending}
        >
          <Heart className={`mr-2 h-5 w-5 ${isSaved ? "fill-current text-destructive" : ""}`} />
          {isSaved ? "Saved" : "Save Job"}
        </Button>
      </div>

      {canApply && <ApplyModal job={job} isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} />}
    </>
  )
}
