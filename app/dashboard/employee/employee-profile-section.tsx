'use client';

import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteEmployeeAccountButton } from '@/components/dashboard/delete-employee-account-button';
import { DeleteResumeButton } from '@/components/dashboard/delete-resume-button';
import { setActiveResumeForAiAction, updateEmployeeProfileAction } from '@/app/actions/employee';
import { useI18n } from '@/lib/i18n/provider';
import { Badge } from '@/components/ui/badge';

export type EmployeeProfileProps = {
  userName: string;
  userEmail: string;
  userLocation: string;
  resumes: { id: string; title: string; skills: string; cvFile?: string; activeForAi: boolean }[];
  savedVacancies: { id: string; title: string; salaryMin: number; salaryMax: number }[];
  responses: {
    id: string;
    status: string;
    vacancyTitle: string;
    salaryMin: number;
    salaryMax: number;
    resumeTitle: string | null;
  }[];
};

function splitDisplayName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export function EmployeeProfileSection({
  userName,
  userEmail,
  userLocation,
  resumes,
  savedVacancies,
  responses,
}: EmployeeProfileProps) {
  const { t } = useI18n();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isProfilePending, startProfileTransition] = useTransition();
  const [displayName, setDisplayName] = useState(userName);
  const [displayLocation, setDisplayLocation] = useState(userLocation);
  const [resumeList, setResumeList] = useState(resumes);
  const nameParts = splitDisplayName(displayName);

  useEffect(() => {
    setDisplayName(userName);
    setDisplayLocation(userLocation);
  }, [userName, userLocation]);

  useEffect(() => {
    setResumeList(resumes);
  }, [resumes]);

  const handleProfileSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startProfileTransition(async () => {
      const result = await updateEmployeeProfileAction(formData);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      const firstName = (formData.get('firstName') as string)?.trim() ?? '';
      const lastName = (formData.get('lastName') as string)?.trim() ?? '';
      const location = (formData.get('location') as string)?.trim() ?? '';

      setDisplayName(`${firstName} ${lastName}`.trim());
      setDisplayLocation(location);
      setIsEditingProfile(false);
      toast.success(t.dashboard.profileUpdated);
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.myProfile}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="firstName" className="text-sm font-medium">
                      {t.auth.firstName}
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      defaultValue={nameParts.firstName}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="lastName" className="text-sm font-medium">
                      {t.auth.lastName}
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      defaultValue={nameParts.lastName}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="location" className="text-sm font-medium">
                    {t.dashboard.profileLocation}
                  </label>
                  <Input
                    id="location"
                    name="location"
                    defaultValue={displayLocation}
                    placeholder={t.dashboard.profileLocationPlaceholder}
                  />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.auth.email}</p>
                  <p className="font-medium">{userEmail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={isProfilePending}>
                    {t.dashboard.saveProfile}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isProfilePending}
                    onClick={() => setIsEditingProfile(false)}
                  >
                    {t.common.cancel}
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">{t.dashboard.name}</p>
                  <p className="font-medium">{displayName}</p>
                </div>
                {displayLocation ? (
                  <div>
                    <p className="text-sm text-muted-foreground">{t.dashboard.profileLocation}</p>
                    <p className="font-medium">{displayLocation}</p>
                  </div>
                ) : null}
                <div>
                  <p className="text-sm text-muted-foreground">{t.auth.email}</p>
                  <p className="font-medium">{userEmail}</p>
                </div>
                <Button variant="outline" type="button" onClick={() => setIsEditingProfile(true)}>
                  {t.dashboard.editProfile}
                </Button>
              </>
            )}
            <DeleteEmployeeAccountButton />
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle>{t.dashboard.myResumes}</CardTitle>
            <Button size="sm" asChild>
              <Link href="/dashboard/employee/resume/new">{t.dashboard.addResume}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {resumeList.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t.dashboard.noResumesYet}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {resumeList.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <p className="truncate font-medium leading-none">{r.title}</p>
                        {r.activeForAi ? (
                          <Badge
                            variant="outline"
                            className="shrink-0 rounded-full border-blue-500/35 bg-blue-500/[0.08] text-[0.65rem] font-medium text-blue-900 dark:text-blue-100"
                          >
                            {t.dashboard.activeResumeBadge}
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-sm text-muted-foreground">{r.skills}</p>
                      {r.cvFile ? (
                        <p className="mt-2 text-xs">
                          <a
                            href={r.cvFile}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {t.dashboard.viewCv}
                          </a>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex w-full shrink-0 flex-col items-end gap-2 sm:ml-2 sm:w-auto">
                      <div className="flex w-full justify-end">
                        {r.activeForAi ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            type="button"
                            disabled
                            className="h-8 max-w-full cursor-not-allowed whitespace-nowrap text-center opacity-80"
                          >
                            {t.dashboard.activeResumeCurrentlyActive}
                          </Button>
                        ) : (
                          <form action={setActiveResumeForAiAction} className="inline-flex max-w-full justify-end">
                            <input type="hidden" name="id" value={r.id} />
                            <Button
                              variant="outline"
                              size="sm"
                              type="submit"
                              className="h-8 max-w-full whitespace-nowrap text-center"
                            >
                              {t.dashboard.activeResumeUseForRecommendations}
                            </Button>
                          </form>
                        )}
                      </div>
                      <div className="flex w-full flex-wrap justify-end gap-2">
                        <Button variant="secondary" size="sm" asChild className="h-8 whitespace-nowrap">
                          <Link href={`/dashboard/employee/resume/${r.id}`}>{t.common.edit}</Link>
                        </Button>
                        <DeleteResumeButton
                          resumeId={r.id}
                          resumeTitle={r.title}
                          onDeleted={(deletedId) => {
                            setResumeList((prev) => prev.filter((resume) => resume.id !== deletedId));
                          }}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.header.savedVacancies}</CardTitle>
          </CardHeader>
          <CardContent>
            {savedVacancies.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">{t.header.noSavedJobs}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {savedVacancies.map((v) => (
                  <li key={v.id} className="flex flex-col gap-2 rounded-lg border p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{v.title}</p>
                        <p className="text-sm text-muted-foreground">
                          ${v.salaryMin} - ${v.salaryMax}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/jobs/${v.id}`}>{t.dashboard.view}</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>{t.dashboard.myApplications}</CardTitle>
          </CardHeader>
          <CardContent>
            {responses.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.dashboard.noApplicationsYet}</p>
            ) : (
              <ul className="mt-4 space-y-4">
                {responses.map((response) => (
                  <li key={response.id} className="space-y-2 rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{response.vacancyTitle}</p>
                        <p className="text-sm text-muted-foreground">
                          ${response.salaryMin} - ${response.salaryMax}
                        </p>
                      </div>
                      {response.status !== 'PENDING' && (
                        <span className="rounded-full bg-secondary px-2 py-1 text-xs text-secondary-foreground">
                          {response.status === 'ACCEPTED'
                            ? t.dashboard.accepted
                            : response.status === 'REJECTED'
                            ? t.dashboard.rejected
                            : t.dashboard.pending}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t.dashboard.resume}: {response.resumeTitle || t.dashboard.customResume}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
