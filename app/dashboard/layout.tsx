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
    <div className="flex min-h-dvh flex-col bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
