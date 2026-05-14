import Link from "next/link"
import { Search, MapPin, Users, Briefcase, Star } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/jobs/header"
import dbConnect from "@/lib/db/mongoose"
import { User, Vacancy, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

/** Avoid build-time DB prerender when Atlas is unreachable (runtime fetch only). */
export const dynamic = "force-dynamic"

export default async function CompaniesPage() {
  await dbConnect();
  
  const employers = await User.find({ role: 'EMPLOYER' }).lean() as any[];
  
  // Calculate open jobs per employer
  const companyStats = await Promise.all(employers.map(async (emp) => {
    const openJobs = await Vacancy.countDocuments({ employerId: emp._id });
    return { ...emp, openJobs };
  }));

  const session = await getSession();
  let savedJobsCount = 0;
  if (session && session.user.role === 'EMPLOYEE') {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Explore Companies</h1>
          <p className="text-muted-foreground mt-2">Discover great places to work and find your dream employer</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companyStats.map((company) => (
            <Link key={company._id.toString()} href={`/companies/${company._id.toString()}`}>
              <Card className="h-full hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground flex-shrink-0">
                      {company.logoUrl || "🏢"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-foreground truncate">{company.name}</h3>
                      <Badge variant="secondary" className="mt-1">{company.industry || 'Technology'}</Badge>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4 line-clamp-3">
                    {company.description || "No description provided."}
                  </p>

                  <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      <span>{company.location || 'Multiple Locations'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      <span>{company.employees || '50-200'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium text-foreground">4.8</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-primary">
                      <Briefcase className="h-4 w-4" />
                      <span className="font-medium">{company.openJobs} open jobs</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
