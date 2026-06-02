'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useI18n } from '@/lib/i18n/provider';
import { useEmployerDashboardNav } from '@/components/dashboard/employer-dashboard-nav';
import { EmployerRankedApplicantsList } from '@/components/dashboard/employer-ranked-applicants-list';
import { EmployerMatchingCandidates } from '@/components/dashboard/employer-matching-candidates';

type SubTab = 'applied' | 'recommended';

function parseSubTab(value: string | null): SubTab {
  return value === 'recommended' ? 'recommended' : 'applied';
}

type EmployerCandidatesTabProps = {
  vacancies: { id: string; title: string }[];
};

export function EmployerCandidatesTab({ vacancies }: EmployerCandidatesTabProps) {
  const { t } = useI18n();
  const { vacancyId, setVacancyId } = useEmployerDashboardNav();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [applicantsCount, setApplicantsCount] = useState(0);
  const [recommendedCount, setRecommendedCount] = useState(0);

  const handleApplicantsCount = useCallback((n: number) => setApplicantsCount(n), []);
  const handleRecommendedCount = useCallback((n: number) => setRecommendedCount(n), []);

  const subTab = parseSubTab(searchParams.get('subtab'));
  const selectedVacancyId = vacancyId ?? vacancies[0]?.id ?? '';

  const handleSubTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('subtab', value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  if (vacancies.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t.dashboard.noVacanciesYet}
      </p>
    );
  }

  const applicantsLabel = applicantsCount > 0
    ? `${t.dashboard.appliedTab} (${applicantsCount})`
    : t.dashboard.appliedTab;

  const recommendedLabel = recommendedCount > 0
    ? `${t.dashboard.recommendedTab} (${recommendedCount})`
    : t.dashboard.recommendedTab;

  return (
    <div className="space-y-5">
      {/* Shared vacancy selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="candidates-vacancy-select" className="shrink-0 text-sm font-medium">
          {t.dashboard.matchVacancyLabel}
        </label>
        <select
          id="candidates-vacancy-select"
          value={selectedVacancyId}
          onChange={(e) => setVacancyId(e.target.value)}
          className="flex-1 max-w-sm rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {vacancies.map((v) => (
            <option key={v.id} value={v.id}>
              {v.title}
            </option>
          ))}
        </select>
      </div>

      {/* Applicants / Recommended sub-tabs — value driven by URL ?subtab= */}
      <Tabs value={subTab} onValueChange={handleSubTabChange}>
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="applied">{applicantsLabel}</TabsTrigger>
          <TabsTrigger value="recommended">{recommendedLabel}</TabsTrigger>
        </TabsList>

        <TabsContent value="applied" className="mt-4">
          <EmployerRankedApplicantsList
            vacancies={vacancies}
            onCountChange={handleApplicantsCount}
          />
        </TabsContent>

        <TabsContent value="recommended" className="mt-4">
          <EmployerMatchingCandidates
            vacancies={vacancies}
            hideSelector
            onCountChange={handleRecommendedCount}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
