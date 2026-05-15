import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Response, User, Resume, SavedVacancy } from '@/lib/db/schema';
import { ProfileChatDashboardShell } from '@/components/dashboard/profile-chat-dashboard-shell';
import { EmployeeProfileSection } from './employee-profile-section';
import { EmployeeChatView } from '@/components/chat/employee-chat-view';
import { cookies } from 'next/headers';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function EmployeeDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYEE') return null;

  await dbConnect();
  
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const dictionary = getDictionary(locale as any)
  const t = dictionary

  const userData = await User.findById(session.user.id);
  const userResumes = await Resume.find({ userId: session.user.id });
  const savedVacanciesRecords = (await SavedVacancy.find({ userId: session.user.id })
    .populate('vacancyId')
    .lean()) as any[];
  const userResponses = (await Response.find({ userId: session.user.id })
    .populate('vacancyId', 'title salaryMin salaryMax')
    .populate('resumeId', 'title')
    .sort({ createdAt: -1 })
    .lean()) as any[];

  const resumes = userResumes.map((r) => ({
    id: r.id,
    title: r.title,
    skills: r.skills,
    cvFile: r.cvFile || undefined,
  }));

  const savedVacancies = savedVacanciesRecords
    .map((record) => {
      const v = record.vacancyId;
      if (!v) return null;
      return {
        id: v._id.toString(),
        title: v.title,
        salaryMin: v.salaryMin,
        salaryMax: v.salaryMax,
      };
    })
    .filter(Boolean) as { id: string; title: string; salaryMin: number; salaryMax: number }[];

  const responses = userResponses
    .map((response) => {
      const vacancy = response.vacancyId;
      if (!vacancy) return null;
      return {
        id: response._id.toString(),
        status: response.status,
        vacancyTitle: vacancy.title,
        salaryMin: vacancy.salaryMin,
        salaryMax: vacancy.salaryMax,
        resumeTitle: response.resumeId?.title ?? null,
      };
    })
    .filter(Boolean) as {
    id: string;
    status: string;
    vacancyTitle: string;
    salaryMin: number;
    salaryMax: number;
    resumeTitle: string | null;
  }[];

  return (
    <ProfileChatDashboardShell
      profileTitle={t.common.employee + " Dashboard"}
      subtitle={t.common.employer + " / " + t.common.employee + " Dashboard"}
      profile={
        <EmployeeProfileSection
          userName={userData?.name || ''}
          userEmail={userData?.email || ''}
          resumes={resumes}
          savedVacancies={savedVacancies}
          responses={responses}
        />
      }
      chat={<EmployeeChatView currentUserId={session.user.id} />}
    />
  );
}
