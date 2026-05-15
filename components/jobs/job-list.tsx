"use client"

import { useState } from "react"
import { ArrowUpDown, Grid3X3, List } from "lucide-react"
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
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)

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

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t.home.jobVacancies}</h1>
          <p className="text-muted-foreground mt-1">
            {jobs.length} {jobs.length === 1 ? t.home.jobFound : t.home.jobsFound}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-44 bg-card border-border">
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

          {/* View Toggle */}
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
              <span className="sr-only">{t.home.listView}</span>
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="sr-only">{t.home.gridView}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Job Cards */}
      {sortedJobs.length > 0 ? (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 xl:grid-cols-2 gap-4"
              : "flex flex-col gap-4"
          }
        >
          {sortedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onApply={handleApply}
              onSave={onSaveJob}
              isSaved={savedJobs.includes(job.id)}
              canApply={canApply}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="text-5xl mb-4">
            <span role="img" aria-label="No results">
              🔍
            </span>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">{t.home.noJobsFound}</h3>
          <p className="text-muted-foreground">
            {t.home.tryAdjustingFilters}
          </p>
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
