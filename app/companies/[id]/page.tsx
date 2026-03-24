import Link from "next/link"
import { ArrowLeft, MapPin, Users, Globe, ExternalLink, Building2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/jobs/header"
import dbConnect from "@/lib/db/mongoose"
import { User, Vacancy, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

export default async function CompanyProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  await dbConnect();
  const company = await User.findById(id).lean() as any;
  const vacancies = await Vacancy.find({ employerId: id }).lean() as any[];

  const session = await getSession();
  let savedJobsCount = 0;
  if (session && session.user.role === 'EMPLOYEE') {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id });
  }

  if (!company || company.role !== 'EMPLOYER') {
    return (
      <div className="min-h-screen bg-background">
        <Header savedJobsCount={savedJobsCount} />
        <main className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold">Company not found</h1>
          <Link href="/companies" className="text-primary mt-4 inline-block hover:underline">Back to Companies</Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      
      <main className="container mx-auto px-4 py-8">
        <Link href="/companies" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Companies
        </Link>

        {/* Company Header Profile */}
        <div className="bg-card border border-border rounded-xl p-8 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary flex-shrink-0">
            {company.logoUrl || "🏢"}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{company.name}</h1>
            <div className="flex items-center gap-4 mt-2 mb-4">
              <Badge variant="secondary">{company.industry || 'Technology'}</Badge>
            </div>
            <p className="text-muted-foreground max-w-2xl leading-relaxed">
              {company.description || "Leading innovator in the industry."}
            </p>
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground bg-muted/30 p-4 rounded-lg md:min-w-48 border border-border">
             <div className="flex items-center gap-2">
               <MapPin className="h-4 w-4 text-primary" />
               <span>{company.location || 'Multiple Locations'}</span>
             </div>
             <div className="flex items-center gap-2">
               <Users className="h-4 w-4 text-primary" />
               <span>{company.employees || '50-200 employees'}</span>
             </div>
             <div className="flex items-center gap-2">
               <Globe className="h-4 w-4 text-primary" />
               {company.website ? (
                 <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline transition-colors">
                   Visit Website
                 </a>
               ) : (
                 <span>No website provided</span>
               )}
             </div>
          </div>
        </div>

        {/* Open Vacancies */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            Open Positions ({vacancies.length})
          </h2>
          {vacancies.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-border">
              No open positions at the moment.
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-4">
              {vacancies.map(job => (
                <Link key={job._id.toString()} href={`/jobs/${job._id.toString()}`}>
                  <Card className="hover:border-primary/40 hover:shadow-md transition-all h-full cursor-pointer bg-card">
                    <CardContent className="p-5 flex flex-col justify-between h-full">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground transition-colors mix-blend-normal">
                          {job.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                           <Badge variant="outline" className="bg-background">{job.employmentType || "Full-time"}</Badge>
                           <span className="flex items-center gap-1"><MapPin className="h-3 w-3"/> {job.workMode === 'REMOTE' ? 'Remote' : [job.city, job.country].filter(Boolean).join(', ') || job.address}</span>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                         <span className="font-medium text-foreground">${job.salaryMin.toLocaleString()} - ${job.salaryMax.toLocaleString()}</span>
                         <span className="text-primary flex items-center gap-1 text-sm font-medium">View Job <ExternalLink className="h-3 w-3"/></span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
