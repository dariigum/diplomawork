import Link from "next/link"
import { ArrowLeft, MapPin, Clock, Briefcase, Heart, Wifi, Building2, Calendar, Globe, Share2, Flag, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Header } from "@/components/jobs/header"
import { JobDetailActions } from "@/components/jobs/job-detail-actions"
import dbConnect from "@/lib/db/mongoose"
import { Vacancy, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { recordVacancyBehaviourEvent } from "@/lib/vacancy-behaviour-events"
import { buildVacancyDetailView } from "@/lib/vacancy-detail-display"

export const dynamic = "force-dynamic"

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  await dbConnect()
  const jobRecord = await Vacancy.findById(id).populate("employerId").lean()

  if (!jobRecord) {
    return (
      <div className="min-h-screen bg-background">
        <Header savedJobsCount={0} />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground">Job not found</h1>
          <p className="text-muted-foreground mt-2">The job you are looking for does not exist.</p>
          <Link href="/">
            <Button className="mt-6">Back to Jobs</Button>
          </Link>
        </main>
      </div>
    )
  }

  const session = await getSession()
  let savedJobsCount = 0
  let isSaved = false
  if (session && session.user.role === "EMPLOYEE") {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
    isSaved = !!(await SavedVacancy.findOne({ userId: session.user.id, vacancyId: id }).lean())
    await recordVacancyBehaviourEvent({
      userId: session.user.id,
      vacancyId: id,
      eventType: "VACANCY_VIEWED",
      source: "job_detail_page",
    })
  }

  const view = buildVacancyDetailView(jobRecord, id)
  const showListSections = view.showResponsibilitiesSection || view.showRequirementsSection
  const showCompanyMeta =
    view.companyIndustry != null ||
    view.companyEmployees != null ||
    view.companyLocation != null ||
    view.companyWebsite != null

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />

      <main className="container mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        {view.metadataIncomplete ? (
          <p className="mb-4 text-sm text-muted-foreground rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
            Some listing details are incomplete or imported from an external source. Core information is shown where available.
          </p>
        ) : null}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground flex-shrink-0">
                    {view.companyLogoMark}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h1 className="text-2xl font-bold text-foreground break-words">{view.title}</h1>
                        <p className="text-lg text-muted-foreground mt-1 break-words">{view.companyName}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="ghost" size="icon" type="button" aria-label="Save (header)">
                          <Heart className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon" type="button" aria-label="Share">
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{view.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <span>{view.employmentType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{view.experience}</span>
                      </div>
                      {view.isRemote ? (
                        <div className="flex items-center gap-1.5 text-accent">
                          <Wifi className="h-4 w-4 shrink-0" />
                          <span className="font-medium">Remote</span>
                        </div>
                      ) : null}
                    </div>

                    <p className="text-xl font-semibold text-foreground mt-4">{view.salaryLabel}</p>

                    {view.sourceListing ? (
                      <a
                        href={view.sourceListing.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        View original listing
                      </a>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground whitespace-pre-wrap break-words">{view.description}</p>

                {showListSections ? (
                  <>
                    <Separator />

                    {view.showResponsibilitiesSection ? (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Responsibilities</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          {view.responsibilities.map((resp) => (
                            <li key={resp} className="break-words">
                              {resp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {view.showResponsibilitiesSection && view.showRequirementsSection ? <Separator /> : null}

                    {view.showRequirementsSection ? (
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Requirements</h3>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                          {view.requirements.map((req) => (
                            <li key={req} className="break-words">
                              {req}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </CardContent>
            </Card>

            {view.showSkillsSection ? (
              <Card>
                <CardHeader>
                  <CardTitle>Required Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {view.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-3 py-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <JobDetailActions
                  job={{
                    id: view.vacancyId,
                    title: view.title,
                    company: view.companyName,
                    location: view.location,
                  }}
                  initialSaved={isSaved}
                  canApply={session?.user?.role !== "EMPLOYER"}
                />
                <p className="text-xs text-center text-muted-foreground">Posted {view.postedLabel}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About the Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground shrink-0">
                    {view.companyLogoMark}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground break-words">{view.companyName}</h3>
                    {view.companyIndustry ? (
                      <p className="text-sm text-muted-foreground">{view.companyIndustry}</p>
                    ) : null}
                  </div>
                </div>

                {showCompanyMeta ? (
                  <div className="space-y-3 text-sm">
                    {view.companyEmployees ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Building2 className="h-4 w-4 shrink-0" />
                        <span>{view.companyEmployees}</span>
                      </div>
                    ) : null}
                    {view.companyLocation ? (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span>{view.companyLocation}</span>
                      </div>
                    ) : null}
                    {view.companyWebsite ? (
                      <div className="flex items-center gap-3 text-muted-foreground min-w-0">
                        <Globe className="h-4 w-4 shrink-0" />
                        <a
                          href={view.companyWebsite.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-foreground hover:underline truncate"
                        >
                          {view.companyWebsite.label}
                        </a>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Calendar className="h-4 w-4 shrink-0" />
                      <span>Active Hiring</span>
                    </div>
                  </div>
                ) : null}

                {view.companyProfileId ? (
                  <Link href={`/companies/${view.companyProfileId}`}>
                    <Button variant="outline" className="w-full mt-2">
                      View Company Profile
                    </Button>
                  </Link>
                ) : null}
              </CardContent>
            </Card>

            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
            >
              <Flag className="h-4 w-4" />
              Report this job
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
