'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { updateEmployerProfileAction } from '@/app/actions/employer';
import { useI18n } from '@/lib/i18n/provider';
import { EmployerMatchingCandidates } from '@/components/dashboard/employer-matching-candidates';

export type EmployerProfileProps = {
  companyId: string;
  companyName: string;
  location: string;
  website: string;
  description: string;
  email: string;
  vacancies: { id: string; title: string; salaryMin: number; salaryMax: number; responseCount: number }[];
};

export function EmployerProfileSection({
  companyId,
  companyName,
  location,
  website,
  description,
  email,
  vacancies,
}: EmployerProfileProps) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>{t.dashboard.companyProfile}</CardTitle>
          <Button size="sm" variant="outline" asChild>
            <Link href={`/companies/${companyId}`}>{t.dashboard.viewPublicCompanyProfile}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <form action={updateEmployerProfileAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="companyName" className="text-sm font-medium">
                {t.dashboard.companyName}
              </label>
              <Input id="companyName" name="companyName" defaultValue={companyName} required />
            </div>
            <div className="space-y-2">
              <label htmlFor="location" className="text-sm font-medium">
                {t.dashboard.companyLocation}
              </label>
              <Input
                id="location"
                name="location"
                defaultValue={location}
                placeholder="Almaty, Kazakhstan"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="website" className="text-sm font-medium">
                {t.dashboard.website}
              </label>
              <Input
                id="website"
                name="website"
                type="url"
                defaultValue={website}
                placeholder="https://company.com"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                {t.dashboard.companyDescription}
              </label>
              <Textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={description}
                placeholder={t.dashboard.companyDescPlaceholder}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.auth.email}</p>
              <p className="font-medium">{email}</p>
            </div>
            <Button type="submit" variant="outline">
              {t.dashboard.saveProfile}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-xl shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>{t.dashboard.myVacancies}</CardTitle>
          <Button size="sm" asChild>
            <Link href="/dashboard/employer/vacancy/new">{t.dashboard.postVacancy}</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {vacancies.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t.dashboard.noVacanciesYet}</p>
          ) : (
            <ul className="mt-4 space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {vacancies.map((v) => (
                <li key={v.id} className="flex flex-col gap-2 rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{v.title}</p>
                      <p className="text-sm text-muted-foreground">
                        ${v.salaryMin} - ${v.salaryMax}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/dashboard/employer/vacancy/${v.id}/edit`}>{t.common.edit}</Link>
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <span className="rounded bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                      {v.responseCount} {t.dashboard.responses}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/jobs/${v.id}`}>{t.dashboard.viewListing}</Link>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EmployerMatchingCandidates
        vacancies={vacancies.map((v) => ({ id: v.id, title: v.title }))}
      />
    </div>
  );
}
