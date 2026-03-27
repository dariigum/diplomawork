import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Response, Resume, SavedVacancy, User } from '@/lib/db/schema';
import { EmployeeDashboardClient } from '@/components/dashboard/employee-dashboard-client';

interface EmployeeDashboardPageProps {
  searchParams?: Promise<{
    tab?: string;
    responseId?: string;
  }>;
}

export default async function EmployeeDashboard({ searchParams }: EmployeeDashboardPageProps) {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return null;

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialTab = resolvedSearchParams.tab === 'chat' ? 'chat' : 'profile';
  const initialResponseId = resolvedSearchParams.responseId || null;

  await dbConnect();

  const userData = await User.findById(session.user.id).lean() as any;
  const userResumes = await Resume.find({ userId: session.user.id }).lean() as any[];
  const savedVacanciesRecords = await SavedVacancy.find({ userId: session.user.id })
    .populate('vacancyId')
    .lean() as any[];
  const userResponses = await Response.find({ userId: session.user.id })
    .populate('vacancyId', 'title salaryMin salaryMax salaryCurrency')
    .populate('resumeId', 'title')
    .sort({ createdAt: -1 })
    .lean() as any[];

  return (
    <EmployeeDashboardClient
      user={{
        id: session.user.id,
        name: userData?.name || 'Employee',
        email: userData?.email || session.user.email,
        username: userData?.username || session.user.username || '',
      }}
      resumes={userResumes.map((resume) => ({
        id: resume._id.toString(),
        title: resume.title,
        skills: resume.skills,
        cvFile: resume.cvFile || '',
      }))}
      savedVacancies={savedVacanciesRecords
        .filter((record) => record.vacancyId)
        .map((record) => ({
          id: record.vacancyId._id.toString(),
          title: record.vacancyId.title,
          salaryMin: record.vacancyId.salaryMin,
          salaryMax: record.vacancyId.salaryMax,
          salaryCurrency: record.vacancyId.salaryCurrency || '',
        }))}
      responses={userResponses
        .filter((response) => response.vacancyId)
        .map((response) => ({
          id: response._id.toString(),
          status: response.status,
          vacancyId: response.vacancyId._id.toString(),
          vacancyTitle: response.vacancyId.title,
          salaryMin: response.vacancyId.salaryMin,
          salaryMax: response.vacancyId.salaryMax,
          salaryCurrency: response.vacancyId.salaryCurrency || '',
          resumeTitle: response.resumeId?.title || 'Custom resume',
        }))}
      initialTab={initialTab}
      initialResponseId={initialResponseId}
    />
  );
}
