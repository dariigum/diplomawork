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
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden p-4 md:p-8">
        {children}
      </main>
    </div>
  );
}
