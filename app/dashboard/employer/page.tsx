import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import mongoose from 'mongoose';
import { User, Vacancy, Response } from '@/lib/db/schema';
import { ProfileChatDashboardShell } from '@/components/dashboard/profile-chat-dashboard-shell';
import { EmployerProfileSection } from './employer-profile-section';
import { EmployerChatView } from '@/components/chat/employer-chat-view';
import { cookies } from 'next/headers';
import { getDictionary } from '@/lib/i18n/dictionaries';

export default async function EmployerDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'EMPLOYER') return null;

  await dbConnect();
  
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const dictionary = getDictionary(locale as any)
  const t = dictionary

  const userData = await User.findById(session.user.id);
  const employerVacancies = await Vacancy.find({ employerId: session.user.id }).sort({ createdAt: -1 }).lean();

  const ids = employerVacancies.map((v) => v._id);
  let countMap = new Map<string, number>();
  if (ids.length > 0) {
    const counts = await Response.aggregate([
      { $match: { vacancyId: { $in: ids } } },
      { $group: { _id: '$vacancyId', c: { $sum: 1 } } },
    ]);
    countMap = new Map(counts.map((x: { _id: mongoose.Types.ObjectId; c: number }) => [x._id.toString(), x.c]));
  }

  const vacancies = employerVacancies.map((v) => ({
    id: v._id.toString(),
    title: v.title,
    salaryMin: v.salaryMin,
    salaryMax: v.salaryMax,
    responseCount: countMap.get(v._id.toString()) ?? 0,
  }));

  return (
    <ProfileChatDashboardShell
      profileTitle={t.common.employer + " Dashboard"}
      subtitle={t.common.employer + " / " + t.common.employee + " Dashboard"}
      profile={
        <EmployerProfileSection
          companyId={session.user.id}
          companyName={userData?.name || ''}
          location={userData?.location || ''}
          website={userData?.website || ''}
          description={userData?.description || ''}
          email={userData?.email || ''}
          vacancies={vacancies}
        />
      }
      chat={<EmployerChatView currentUserId={session.user.id} />}
    />
  );
}
