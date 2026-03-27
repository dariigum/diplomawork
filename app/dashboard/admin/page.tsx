import Link from 'next/link';
import { logoutAction } from '@/app/actions/auth';
import { getSession } from '@/lib/auth';
import dbConnect from '@/lib/db/mongoose';
import { Article, Response, Resume, SavedVacancy, User, Vacancy } from '@/lib/db/schema';
import { getLatestHeadHunterImportJobSnapshot } from '@/lib/headhunter-sync-job';
import { HeadHunterSyncPanel } from '@/components/admin/headhunter-sync-panel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function AdminDashboard() {
  const session = await getSession();
  if (!session || session.user.role !== 'ADMIN') return null;

  await dbConnect();
  const initialHeadHunterJob = await getLatestHeadHunterImportJobSnapshot();

  const [
    usersCount,
    employeesCount,
    employersCount,
    resumesCount,
    vacanciesCount,
    responsesCount,
    savedVacanciesCount,
    articlesCount,
  ] = await Promise.all([
    User.countDocuments({}),
    User.countDocuments({ role: 'EMPLOYEE' }),
    User.countDocuments({ role: 'EMPLOYER' }),
    Resume.countDocuments({}),
    Vacancy.countDocuments({}),
    Response.countDocuments({}),
    SavedVacancy.countDocuments({}),
    Article.countDocuments({}),
  ]);

  const metrics = [
    { label: 'Employees', value: employeesCount, href: '/dashboard/admin/employees' },
    { label: 'Employers', value: employersCount, href: '/dashboard/admin/employers' },
    { label: 'Resumes', value: resumesCount, href: '/dashboard/admin/resumes' },
    { label: 'Vacancies', value: vacanciesCount, href: '/dashboard/admin/vacancies' },
    { label: 'Responses', value: responsesCount, href: '/dashboard/admin/responses' },
    {
      label: 'Saved Vacancies',
      value: savedVacanciesCount,
      href: '/dashboard/admin/saved-vacancies',
    },
    { label: 'Articles', value: articlesCount, href: '/dashboard/admin/articles' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Signed in as {session.user.email}. This account is reserved for administration.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-foreground">
        All users: <span className="font-semibold">{usersCount}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((metric) => (
          <Link key={metric.label} href={metric.href} className="block">
            <Card className="h-full transition-colors hover:border-primary/50 hover:bg-muted/20">
              <CardHeader>
                <CardTitle className="text-base">{metric.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{metric.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <HeadHunterSyncPanel initialJob={initialHeadHunterJob} />

      <div className="flex justify-end border-t border-border pt-6">
        <form action={logoutAction}>
          <Button variant="outline" type="submit">
            Logout
          </Button>
        </form>
      </div>
    </div>
  );
}
