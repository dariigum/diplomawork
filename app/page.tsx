"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import { FiltersSidebar, type FilterState } from "@/components/jobs/filters-sidebar"
import { JobList } from "@/components/jobs/job-list"
import { getHomeData, toggleSaveVacancyAction } from "@/app/actions/vacancy"
import { emitSavedVacanciesUpdated } from "@/lib/saved-vacancies-events"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

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

  // allJobs — полный список без поиска (для фильтров)
  const [allJobs, setAllJobs] = useState<any[]>([])
  // searchJobs — результат семантического поиска (null = поиск не активен)
  const [searchJobs, setSearchJobs] = useState<any[] | null>(null)

  const [savedJobs, setSavedJobs] = useState<string[]>([])
  const [viewerRole, setViewerRole] = useState<string | null>(null)
  const [filterOptions, setFilterOptions] = useState<{
    locations: string[]
    employmentTypes: string[]
    experienceLevels: string[]
  }>({ locations: [], employmentTypes: [], experienceLevels: [] })
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false)
  const [isRecommendationsActive, setIsRecommendationsActive] = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Загрузка всех вакансий при старте
  useEffect(() => {
    getHomeData().then(data => {
      setAllJobs(data.jobs)
      setSavedJobs(data.savedJobs)
      setViewerRole(data.viewerRole || null)
      if (data.filterOptions) setFilterOptions(data.filterOptions)
    }).catch(console.error)
  }, [])

  // Семантический поиск с дебаунсом 500ms
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!filters.search.trim()) {
      setSearchJobs(null) // сброс — показываем allJobs
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      try {
        const data = await getHomeData(filters.search)
        setSearchJobs(data.jobs)
      } catch (e) {
        console.error(e)
      } finally {
        setIsSearching(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filters.search])

  // Базовый список: результаты поиска или все вакансии
  const baseJobs = searchJobs !== null ? searchJobs : allJobs

  // Остальные фильтры работают поверх baseJobs — как было в оригинале
  const filteredJobs = useMemo(() => {
    return baseJobs.filter((job) => {
      if (filters.locations.length > 0) {
        const matchesLocation = filters.locations.some(
          (loc) => job.location.includes(loc) || (loc === "Remote" && job.isRemote)
        )
        if (!matchesLocation) return false
      }

      if (filters.employmentTypes.length > 0) {
        if (!filters.employmentTypes.includes(job.employmentType)) return false
      }

      if (filters.experienceLevels.length > 0) {
        const matchesExperience = filters.experienceLevels.some((level) =>
          job.experience.includes(level)
        )
        if (!matchesExperience) return false
      }

      const salaryMatch = job.salary.match(/\$(\d+),?(\d*)/g)
      if (salaryMatch) {
        const minSalary = parseInt(salaryMatch[0].replace(/[^0-9]/g, "")) / 1000
        if (minSalary < filters.salaryRange[0] || minSalary > filters.salaryRange[1]) {
          return false
        }
      }

      if (filters.remoteOnly && !job.isRemote) return false

      return true
    })
  }, [baseJobs, filters.locations, filters.employmentTypes, filters.experienceLevels, filters.salaryRange, filters.remoteOnly])

  const handleSaveJob = async (jobId: string) => {
    const wasSaved = savedJobs.includes(jobId)
    setSavedJobs((prev) =>
      wasSaved ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    )
    const result = await toggleSaveVacancyAction(jobId)
    if (result?.error) {
      setSavedJobs((prev) =>
        wasSaved ? [...prev, jobId] : prev.filter((id) => id !== jobId)
      )
      toast.error("Only employees can save vacancies.")
      return
    }
    emitSavedVacanciesUpdated()
  }

  const handleGetRecommendations = async () => {
    setIsLoadingRecommendations(true)
    try {
      const res = await fetch("/api/recommendations", { method: "GET" })
      if (!res.ok) throw new Error("Failed to fetch recommendations")

      const data = await res.json()
      const recommended = Array.isArray(data?.recommendedVacancies) ? data.recommendedVacancies : []

      const mappedJobs = recommended.map((v: any) => ({
        id: v._id?.toString?.() || "",
        title: v.title || "Untitled vacancy",
        company: v.employerId?.name || "Unknown Company",
        companyLogo: v.employerId?.name?.slice(0, 2)?.toUpperCase() || "JC",
        location: v.workMode === "REMOTE" ? "Remote" : [v.city, v.country].filter(Boolean).join(", ") || v.address || "Remote",
        salary: `$${(v.salaryMin ?? 0).toLocaleString()} - $${(v.salaryMax ?? 0).toLocaleString()}`,
        employmentType: v.employmentType || "Full-time",
        experience: v.experience || "Any experience",
        skills: v.skillsRequired ? v.skillsRequired.split(",").map((s: string) => s.trim()) : [],
        description: v.description || "No description provided.",
        postedAt: v.createdAt ? new Date(v.createdAt).toLocaleDateString() : "",
        isRemote: v.workMode === "REMOTE",
        isFeatured: false,
        match: v.match,
        reason: v.reason,
      }))

      setSearchJobs(mappedJobs)
      setIsRecommendationsActive(true)
    } catch (error) {
      console.error(error)
      toast.error("Could not load AI recommendations.")
    } finally {
      setIsLoadingRecommendations(false)
    }
  }

  const handleShowAllJobs = () => {
    setSearchJobs(null)
    setIsRecommendationsActive(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobs.length} />
      
      <main className="container mx-auto px-4 lg:px-6 py-6">
        <section className="mb-8 text-center lg:text-left">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground text-balance">
            Find Your Dream Job
          </h1>
          <p className="mt-2 text-muted-foreground text-lg max-w-2xl mx-auto lg:mx-0">
            Discover thousands of job opportunities with AI-powered recommendations.
          </p>
          {isSearching && (
            <p className="mt-2 text-sm text-muted-foreground">Searching...</p>
          )}
          <div className="mt-4 flex items-center justify-center lg:justify-start gap-3">
            <Button
              type="button"
              onClick={handleGetRecommendations}
              disabled={isLoadingRecommendations}
            >
              {isLoadingRecommendations ? "Loading..." : "Get AI Recommendations"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleShowAllJobs}
              disabled={!isRecommendationsActive}
            >
              Show All Jobs
            </Button>
          </div>
        </section>

        <div className="flex flex-col lg:flex-row gap-6">
          <FiltersSidebar
            filters={filters}
            onFiltersChange={setFilters}
            locationOptions={filterOptions.locations}
            employmentTypeOptions={filterOptions.employmentTypes}
            experienceLevelOptions={filterOptions.experienceLevels}
          />
          
          {allJobs.length === 0 && !isSearching ? (
            <p className="text-muted-foreground w-full text-center py-12">No vacancies posted yet.</p>
          ) : (
            <JobList
              jobs={filteredJobs}
              savedJobs={savedJobs}
              onSaveJob={handleSaveJob}
              canApply={viewerRole !== "EMPLOYER"}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
