"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, MapPin, Clock, Briefcase, Heart, Wifi, Building2, Users, Calendar, DollarSign, Share2, Flag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { jobs } from "@/lib/job-data"
import { Header } from "@/components/jobs/header"

export default function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const job = jobs.find(j => j.id === id)

  if (!job) {
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

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />
      
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
                    {job.companyLogo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-foreground">{job.title}</h1>
                        <p className="text-lg text-muted-foreground mt-1">{job.company}</p>
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
                        <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        <span>{job.employmentType}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        <span>{job.experience}</span>
                      </div>
                      {job.isRemote && (
                        <div className="flex items-center gap-1.5 text-accent">
                          <Wifi className="h-4 w-4" />
                          <span className="font-medium">Remote</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xl font-semibold text-foreground mt-4">{job.salary}</p>
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
                <p className="text-muted-foreground">{job.description}</p>
                
                <Separator />
                
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Responsibilities</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Design and implement new features for our web applications</li>
                    <li>Collaborate with product and design teams to define requirements</li>
                    <li>Write clean, maintainable, and well-tested code</li>
                    <li>Participate in code reviews and provide constructive feedback</li>
                    <li>Mentor junior developers and share knowledge with the team</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-3">Requirements</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>{job.experience} of professional experience</li>
                    <li>Strong proficiency in {job.skills.slice(0, 2).join(" and ")}</li>
                    <li>Experience with modern development practices and tools</li>
                    <li>Excellent problem-solving and communication skills</li>
                    <li>Bachelor&apos;s degree in Computer Science or equivalent experience</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold text-foreground mb-3">Nice to Have</h3>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Experience with {job.skills.slice(2).join(", ") || "related technologies"}</li>
                    <li>Contributions to open source projects</li>
                    <li>Experience in a fast-paced startup environment</li>
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
                  {job.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="px-3 py-1">
                      {skill}
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
                <Button className="w-full h-12 text-base" size="lg">
                  Apply Now
                </Button>
                <Button variant="outline" className="w-full h-12 text-base" size="lg">
                  <Heart className="h-5 w-5 mr-2" />
                  Save Job
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Posted {job.postedAt}
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
                    {job.companyLogo}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{job.company}</h3>
                    <p className="text-sm text-muted-foreground">Technology</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Building2 className="h-4 w-4" />
                    <span>51-200 employees</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Founded 2018</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>12 open positions</span>
                  </div>
                </div>

                <Link href={`/companies/${job.company.toLowerCase().replace(/\s+/g, '-')}`}>
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
