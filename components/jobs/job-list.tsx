"use client"

import { useState } from "react"
import { ArrowUpDown } from "lucide-react"
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

interface JobListProps {
  jobs: Job[]
  savedJobs: string[]
  onSaveJob: (jobId: string) => void
  canApply: boolean
}

type SortOption = "newest" | "salary-high" | "salary-low" | "relevance"

export function JobList({ jobs, savedJobs, onSaveJob, canApply }: JobListProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest")
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
    <div className="min-w-0 w-full flex-1">
      {/* Header */}
      <div className="mb-6 flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">Browse all vacancies</h1>
          <p className="mt-1 text-muted-foreground">
            {jobs.length} {jobs.length === 1 ? "job" : "jobs"} found
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:gap-3">
          {/* Sort */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="h-9 w-full min-w-[11rem] bg-card border-border sm:w-44">
              <ArrowUpDown className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="salary-high">Salary: High to Low</SelectItem>
              <SelectItem value="salary-low">Salary: Low to High</SelectItem>
            </SelectContent>
          </Select>

        </div>
      </div>

      {/* Job Cards */}
      {sortedJobs.length > 0 ? (
        <div className="flex flex-col gap-4">
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
          <h3 className="text-lg font-semibold text-foreground mb-2">No jobs found</h3>
          <p className="text-muted-foreground">
            Try adjusting your filters or search criteria
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
