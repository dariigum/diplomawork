"use client"

import { useState, useMemo, useEffect } from "react"
import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import { FiltersSidebar, type FilterState } from "@/components/jobs/filters-sidebar"
import { JobList, JobListHeader, type SortOption } from "@/components/jobs/job-list"
import { SemanticJobSearchPanel } from "@/components/jobs/semantic-job-search-panel"
import { getHomeData, toggleSaveVacancyAction } from "@/app/actions/vacancy"
import { DEFAULT_SALARY_RANGE, isDefaultSalaryRange, jobSalaryOverlapsFilter } from "@/lib/salary-filter-steps"
import { emitSavedVacanciesUpdated } from "@/lib/saved-vacancies-events"
import { toast } from "sonner"

import { useI18n } from "@/lib/i18n/provider"

const initialFilters: FilterState = {
  search: "",
  locations: [],
  employmentTypes: [],
  experienceLevels: [],
  salaryRange: [...DEFAULT_SALARY_RANGE],
  remoteOnly: false,
}

export default function VacanciesPage() {
  const { t } = useI18n()
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [jobs, setJobs] = useState<any[]>([])
  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<{ locations: string[], employmentTypes: string[], experienceLevels: string[] }>({
    locations: [],
    employmentTypes: [],
    experienceLevels: [],
  })
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  
  useEffect(() => {
    getHomeData().then(data => {
      setJobs(data.jobs)
      setSavedJobs(data.savedJobs)
      setViewerRole(data.viewerRole || null)
      if (data.filterOptions) setFilterOptions(data.filterOptions)
    }).catch(console.error)
  }, [])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.skills.some((skill: string) => skill.toLowerCase().includes(searchLower))
        if (!matchesSearch) return false
      }

      // Location filter
      if (filters.locations.length > 0) {
        const matchesLocation = filters.locations.some(
          (loc) => job.location.includes(loc) || (loc === "Remote" && job.isRemote)
        )
        if (!matchesLocation) return false
      }

      // Employment type filter
      if (filters.employmentTypes.length > 0) {
        if (!filters.employmentTypes.includes(job.employmentType)) return false
      }

      // Experience level filter
      if (filters.experienceLevels.length > 0) {
        const matchesExperience = filters.experienceLevels.some((level) =>
          job.experience.includes(level)
        )
        if (!matchesExperience) return false
      }

      // Salary range filter
      if (!isDefaultSalaryRange(filters.salaryRange) && !jobSalaryOverlapsFilter(job.salary, filters.salaryRange)) {
        return false
      }

      // Remote only filter
      if (filters.remoteOnly && !job.isRemote) return false

      return true
    })
  }, [filters, jobs])

  const handleSaveJob = async (jobId: string) => {
    const wasSaved = savedJobs.includes(jobId)

    setSavedJobs((prev) =>
      wasSaved
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    )

    const result = await toggleSaveVacancyAction(jobId)
    if (result?.error) {
      setSavedJobs((prev) =>
        wasSaved
          ? [...prev, jobId]
          : prev.filter((id) => id !== jobId)
      )
      toast.error(t.home.onlyEmployeesCanSave)
      return
    }

    emitSavedVacanciesUpdated()
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header savedJobsCount={savedJobs.length} />

      <main className="container mx-auto flex flex-1 flex-col px-4 py-6 lg:px-6">
        {/* Hero Section */}
        <section className="mb-8 text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground text-balance">
            {t.home.findYourDreamJob}
          </h1>
          <p className="mt-2 text-muted-foreground text-lg max-w-2xl mx-auto lg:mx-0">
            {t.home.discoverThousands}
          </p>
        </section>

        <div className="min-w-0 flex-1 space-y-6">
          <SemanticJobSearchPanel />

          {jobs.length > 0 ? (
            <JobListHeader
              jobsCount={filteredJobs.length}
              sortBy={sortBy}
              onSortByChange={setSortBy}
            />
          ) : null}

          <div className="grid min-w-0 gap-6 lg:grid-cols-[20rem_1fr] lg:items-start">
            <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
              <FiltersSidebar
                filters={filters}
                onFiltersChange={setFilters}
                locationOptions={filterOptions.locations}
                employmentTypeOptions={filterOptions.employmentTypes}
                experienceLevelOptions={filterOptions.experienceLevels}
              />
            </aside>

            <div className="min-w-0">
              {jobs.length === 0 ? (
                <div className="flex min-h-[40vh] items-center justify-center lg:min-h-0">
                  <p className="text-center text-muted-foreground">
                    {t.home.noVacanciesPosted}
                  </p>
                </div>
              ) : (
                <JobList
                  jobs={filteredJobs}
                  savedJobs={savedJobs}
                  onSaveJob={handleSaveJob}
                  canApply={viewerRole !== "EMPLOYER"}
                  showHeader={false}
                  sortBy={sortBy}
                  onSortByChange={setSortBy}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer className="mt-auto" />
    </div>
  )
}
