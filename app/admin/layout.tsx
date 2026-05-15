import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { AdminHeader } from '@/components/admin/header';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden md:flex">
        <AdminSidebar />
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminHeader />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
