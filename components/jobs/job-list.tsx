"use client"

import { useEffect, useState } from "react"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { JobCard } from "./job-card"
import { ApplyModal } from "./apply-modal"
import type { Job } from "@/lib/job-data"
import { useI18n } from "@/lib/i18n/provider"

const PAGE_SIZE = 20
const LOAD_MORE_STEP = 20

interface JobListProps {
  jobs: Job[]
  savedJobs: string[]
  onSaveJob: (jobId: string) => void
  canApply: boolean
}

type SortOption = "newest" | "salary-high" | "salary-low" | "relevance"

export function JobList({ jobs, savedJobs, onSaveJob, canApply }: JobListProps) {
  const { t } = useI18n()
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [jobs, sortBy])

  const handleApply = (job: Job) => {
    setSelectedJob(job)
    setIsApplyModalOpen(true)
  }

  const sortedJobs = [...jobs].sort((a, b) => {
    switch (sortBy) {
      case "salary-high":
        const aMax = parseInt(a.salary.replace(/[^0-9]/g, "").slice(-6))
        const bMax = parseInt(b.salary.replace(/[^0-9]/g, "").slice(-6))
        return bMax - aMax
      case "salary-low":
        const aMin = parseInt(a.salary.replace(/[^0-9]/g, "").slice(0, 6))
        const bMin = parseInt(b.salary.replace(/[^0-9]/g, "").slice(0, 6))
        return aMin - bMin
      case "relevance":
        return b.isFeatured === a.isFeatured ? 0 : b.isFeatured ? 1 : -1
      case "newest":
      default:
        return 0
    }
  })

  const visibleJobs = sortedJobs.slice(0, visibleCount)

  return (
    <div className="min-w-0 w-full flex-1">
      {/* Header */}
      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{t.home.jobVacancies}</h1>
          <p className="mt-1 text-muted-foreground">
            {jobs.length} {jobs.length === 1 ? t.home.jobFound : t.home.jobsFound}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:gap-3">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-9 w-full min-w-[11rem] bg-card border-border sm:w-44">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder={t.home.sortBy} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.home.newestFirst}</SelectItem>
              <SelectItem value="relevance">{t.home.relevance}</SelectItem>
              <SelectItem value="salary-high">{t.home.salaryHigh}</SelectItem>
              <SelectItem value="salary-low">{t.home.salaryLow}</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* Job Cards */}
      {sortedJobs.length > 0 ? (
        <div className="flex min-w-0 flex-col gap-4">
          {visibleJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={handleApply}
              onSave={onSaveJob}
              isSaved={savedJobs.includes(job.id)}
              canApply={canApply}
            />
          ))}

          <p className="text-center text-sm text-muted-foreground">
            {t.home.showingVacancies
              .replace('{visible}', String(visibleJobs.length))
              .replace('{total}', String(sortedJobs.length))}
          </p>

          {visibleCount < sortedJobs.length ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-full min-w-0 sm:w-auto"
                onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
              >
                {t.home.showMore}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="text-5xl mb-4">
            <span role="img" aria-label="No results">
              🔍
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t.home.noJobsFound}</h3>
          <p className="text-muted-foreground">{t.home.tryAdjustingFilters}</p>
        </div>
      )}

      {/* Apply Modal */}
      {canApply && (
        <ApplyModal
          job={selectedJob}
          isOpen={isApplyModalOpen}
          onClose={() => {
            setIsApplyModalOpen(false)
            setSelectedJob(null)
          }}
        />
      )}
    </div>
  )
}
