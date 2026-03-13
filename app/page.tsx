"use client"

import { useState, useMemo } from "react"
import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import { FiltersSidebar, type FilterState } from "@/components/jobs/filters-sidebar"
import { JobList } from "@/components/jobs/job-list"
import { jobs } from "@/lib/job-data"

const initialFilters: FilterState = {
  search: "",
  locations: [],
  employmentTypes: [],
  experienceLevels: [],
  salaryRange: [0, 200],
  remoteOnly: false,
}

export default function VacanciesPage() {
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [savedJobs, setSavedJobs] = useState<string[]>([])

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch =
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.skills.some((skill) => skill.toLowerCase().includes(searchLower))
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
      const salaryMatch = job.salary.match(/\$(\d+),?(\d*)/g)
      if (salaryMatch) {
        const minSalary = parseInt(salaryMatch[0].replace(/[^0-9]/g, "")) / 1000
        if (minSalary < filters.salaryRange[0] || minSalary > filters.salaryRange[1]) {
          return false
        }
      }

      // Remote only filter
      if (filters.remoteOnly && !job.isRemote) return false

      return true
    })
  }, [filters])

  const handleSaveJob = (jobId: string) => {
    setSavedJobs((prev) =>
      prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobs.length} />
      
      <main className="container mx-auto px-4 lg:px-6 py-6">
        {/* Hero Section */}
        <section className="mb-8 text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Find Your Dream Job
          </h1>
          <p className="mt-2 text-muted-foreground text-lg max-w-2xl mx-auto lg:mx-0">
            Discover thousands of job opportunities with all the information you need.
          </p>
        </section>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <FiltersSidebar filters={filters} onFiltersChange={setFilters} />
          
          {/* Job Listings */}
          <JobList
            jobs={filteredJobs}
            savedJobs={savedJobs}
            onSaveJob={handleSaveJob}
          />
        </div>
      </main>

      <Footer />
    </div>
  )
}
