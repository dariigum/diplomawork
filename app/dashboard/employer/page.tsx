import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Response, User, Vacancy } from '@/lib/db/schema';
import { EmployerDashboardClient } from '@/components/dashboard/employer-dashboard-client';

interface EmployerDashboardPageProps {
  searchParams?: Promise<{
    tab?: string;
    vacancyId?: string;
    responseId?: string;
  }>;
}

export default async function EmployerDashboard({ searchParams }: EmployerDashboardPageProps) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') return null;

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTab = resolvedSearchParams.tab === 'chat' ? 'chat' : 'profile';
  const initialVacancyId = resolvedSearchParams.vacancyId || null;
  const initialResponseId = resolvedSearchParams.responseId || null;

  await dbConnect();

  const userData = await User.findById(session.user.id).lean() as any;
  const employerVacancies = await Vacancy.find({ employerId: session.user.id }).lean() as any[];
  const responseCounts = employerVacancies.length > 0
    ? await Response.aggregate([
        { $match: { vacancyId: { $in: employerVacancies.map((vacancy) => vacancy._id) } } },
        { $group: { _id: '$vacancyId', count: { $sum: 1 } } },
      ])
    : [];

  const countMap = new Map<string, number>();
  for (const entry of responseCounts) {
    countMap.set(entry._id.toString(), entry.count);
  }

  return (
    <EmployerDashboardClient
      user={{
        id: session.user.id,
        name: userData?.name || 'Company',
        email: userData?.email || session.user.email,
        location: userData?.location || '',
        website: userData?.website || '',
        description: userData?.description || '',
      }}
      vacancies={employerVacancies.map((vacancy) => ({
        id: vacancy._id.toString(),
        title: vacancy.title,
        salaryMin: vacancy.salaryMin,
        salaryMax: vacancy.salaryMax,
        salaryCurrency: vacancy.salaryCurrency || '',
        responsesCount: countMap.get(vacancy._id.toString()) || 0,
      }))}
      initialTab={initialTab}
      initialVacancyId={initialVacancyId}
      initialResponseId={initialResponseId}
    />
  );
}
