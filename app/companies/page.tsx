import { Header } from "@/components/jobs/header"
import dbConnect from "@/lib/db/mongoose"
import { User, Vacancy, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { CompaniesClient } from "@/components/companies/companies-client"

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
        <CompaniesClient
          companies={companyStats.map((company) => ({
            id: company._id.toString(),
            name: company.name || 'Unknown Company',
            logoUrl: company.logoUrl || '🏢',
            industry: company.industry || 'Technology',
            description: company.description || 'No description provided.',
            location: company.location || 'Multiple Locations',
            employees: company.employees || '50-200',
            openJobs: company.openJobs || 0,
          }))}
        />
      </main>
    </div>
  )
}
