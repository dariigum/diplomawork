import Link from "next/link"
import { ArrowLeft, MapPin, Clock, Briefcase, Heart, Wifi, Building2, Users, Calendar, Globe, Share2, Flag } from "lucide-react"
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

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  await dbConnect();
  const jobRecord = await Vacancy.findById(id).populate('employerId').lean() as any;

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

  const session = await getSession();
  let savedJobsCount = 0;
  let isSaved = false;
  if (session && session.user.role === 'EMPLOYEE') {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id });
    isSaved = !!(await SavedVacancy.findOne({ userId: session.user.id, vacancyId: id }).lean());
    await recordVacancyBehaviourEvent({
      userId: session.user.id,
      vacancyId: id,
      eventType: "VACANCY_VIEWED",
      source: "job_detail_page",
    });
  }

  const company = jobRecord.employerId as any;

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground flex-shrink-0">
                    {company?.logoUrl || "💼"}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-foreground">{jobRecord.title}</h1>
                        <p className="text-lg text-muted-foreground mt-1">{company.name}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon">
                          <Heart className="h-5 w-5" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Share2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" />
                        <span>{jobRecord.workMode === 'REMOTE' ? 'Remote' : `${jobRecord.city || jobRecord.address}${jobRecord.country ? `, ${jobRecord.country}` : ''}`}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        <span>{jobRecord.employmentType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{jobRecord.experience}</span>
                      </div>
                      {jobRecord.workMode === 'REMOTE' && (
                        <div className="flex items-center gap-1.5 text-accent">
                          <Wifi className="h-4 w-4" />
                          <span className="font-medium">Remote</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xl font-semibold text-foreground mt-4">${jobRecord.salaryMin.toLocaleString()} - ${jobRecord.salaryMax.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle>Job Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground whitespace-pre-wrap">{jobRecord.description}</p>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    {jobRecord.responsibilities?.map((resp: string, idx: number) => (
                      <li key={idx}>{resp}</li>
                    ))}
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-3">Requirements</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    {jobRecord.requirements?.map((req: string, idx: number) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader>
                <CardTitle>Required Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {jobRecord.skillsRequired.split(',').map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill.trim()}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Apply Card */}
            <Card className="sticky top-24">
              <CardContent className="p-6 space-y-4">
                <JobDetailActions
                  job={{
                    id,
                    title: jobRecord.title,
                    company: company.name,
                    location: jobRecord.workMode === 'REMOTE' ? 'Remote' : `${jobRecord.city || jobRecord.address}${jobRecord.country ? `, ${jobRecord.country}` : ''}`,
                  }}
                  initialSaved={isSaved}
                  canApply={session?.user?.role !== 'EMPLOYER'}
                />
                <p className="text-xs text-center text-muted-foreground">
                  Posted {new Date(jobRecord.createdAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card>
              <CardHeader>
                <CardTitle>About the Company</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                    {company?.logoUrl || "🏢"}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{company.name}</h3>
                    <p className="text-sm text-muted-foreground">{company.industry || "Technology"}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>{company.employees || "51-200 employees"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{company.location || "Multiple Locations"}</span>
                  </div>
                  {company.website && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground hover:underline">
                        {company.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Active Hiring</span>
                  </div>
                </div>

                <Link href={`/companies/${company._id.toString()}`}>
                  <Button variant="outline" className="w-full mt-2">
                    View Company Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Report */}
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto">
              <Flag className="h-4 w-4" />
              Report this job
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
