import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Header } from '@/components/jobs/header';
import dbConnect from '@/lib/db/mongoose';
import { SavedVacancy } from '@/lib/db/schema';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let savedJobsCount = 0;
  if (session.user.role === 'EMPLOYEE') {
    await dbConnect();
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header savedJobsCount={savedJobsCount} />
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
