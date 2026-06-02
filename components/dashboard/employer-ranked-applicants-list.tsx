'use client';

import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatSkillDisplayName } from '@/lib/format-skill-display-name';
import { useI18n } from '@/lib/i18n/provider';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import {
  useEmployerDashboardNav,
  type PendingApplicant,
} from '@/components/dashboard/employer-dashboard-nav';
import { EmployerCandidateCardActions } from '@/components/dashboard/employer-candidate-card-actions';

const MAX_MATCHING_SKILLS = 5;
const RANKED_FETCH_LIMIT = 80;

type ApplicantFitLevel = 'Strong Fit' | 'Related' | 'Exploratory';

function fitLevelLabel(level: ApplicantFitLevel, dict: Dictionary): string {
  if (level === 'Strong Fit') return dict.dashboard.matchFitStrong;
  if (level === 'Related') return dict.dashboard.matchFitRelated;
  return dict.dashboard.matchFitExploratory;
}

type EmployerRankedApplicantsListProps = {
  vacancies: { id: string; title: string }[];
  onCountChange?: (n: number) => void;
};

export function EmployerRankedApplicantsList({ vacancies, onCountChange }: EmployerRankedApplicantsListProps) {
  const { t } = useI18n();
  const { vacancyId, setPendingApplicant, goToTab } = useEmployerDashboardNav();

  const [applicants, setApplicants] = React.useState<PendingApplicant[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [rankError, setRankError] = React.useState<string | null>(null);
  const [rankedTotal, setRankedTotal] = React.useState<number | null>(null);

  const loadApplicants = React.useCallback(
    async (vid: string) => {
      setLoading(true);
      setRankError(null);
      setRankedTotal(null);
      try {
        const rankedRes = await fetch(
          `/api/employer/vacancies/${vid}/ranked-applicants?limit=${RANKED_FETCH_LIMIT}`,
          { credentials: 'include' },
        );
        if (rankedRes.ok) {
          const data = await rankedRes.json();
          const rows = Array.isArray(data.candidates) ? data.candidates : [];
          const total = Number(data?.vacancy?.applicantsTotal ?? rows.length);
          setRankedTotal(Number.isFinite(total) ? total : rows.length);
          setApplicants(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows.map((c: any): PendingApplicant => ({
              applicationId: String(c.applicationId ?? ''),
              employee: {
                id: String(c.employee?.id ?? ''),
                name: String(c.employee?.name ?? ''),
                image: c.employee?.image ?? null,
              },
              resume: c.resume
                ? {
                    id: String(c.resume.id ?? ''),
                    title: String(c.resume.title ?? ''),
                    skillsPreview: String(c.resume.skillsPreview ?? ''),
                    cvFile: typeof c.resume.cvFile === 'string' ? c.resume.cvFile : undefined,
                    cvLink: typeof c.resume.cvLink === 'string' ? c.resume.cvLink : undefined,
                  }
                : null,
              status: String(c.status ?? ''),
              appliedAt: String(c.appliedAt ?? ''),
              unreadCount: Number(c.chat?.unreadCount ?? 0),
              chatId: c.chat?.id ? String(c.chat.id) : null,
              match: c.match
                ? {
                    semanticScore: Number(c.match.semanticScore ?? 0),
                    matchScore: Number(c.match.matchScore ?? 0),
                    fitLevel: c.match.fitLevel as ApplicantFitLevel,
                  }
                : null,
              overlapSkills: Array.isArray(c.overlapSkills) ? c.overlapSkills : [],
            })),
          );
          return;
        }

        const fallback = await fetch(`/api/employer/vacancies/${vid}/applicants`, {
          credentials: 'include',
        });
        const data = await fallback.json();
        const rows = Array.isArray(data.applicants) ? data.applicants : [];
        setApplicants(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rows.map((c: any): PendingApplicant => ({
            applicationId: String(c.applicationId ?? ''),
            employee: {
              id: String(c.employee?.id ?? ''),
              name: String(c.employee?.name ?? ''),
              image: c.employee?.image ?? null,
            },
            resume: c.resume
              ? {
                  id: String(c.resume.id ?? ''),
                  title: String(c.resume.title ?? ''),
                  skillsPreview: String(c.resume.skillsPreview ?? ''),
                  cvFile: typeof c.resume.cvFile === 'string' ? c.resume.cvFile : undefined,
                  cvLink: typeof c.resume.cvLink === 'string' ? c.resume.cvLink : undefined,
                }
              : null,
            status: String(c.status ?? ''),
            appliedAt: String(c.appliedAt ?? ''),
            unreadCount: Number(c.unreadCount ?? 0),
            chatId: c.chatId ? String(c.chatId) : null,
            match: null,
            overlapSkills: [],
          })),
        );
        setRankError(t.chat.rankErrorUnavailable);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  React.useEffect(() => {
    if (!vacancyId) {
      setApplicants([]);
      setRankedTotal(null);
      return;
    }
    void loadApplicants(vacancyId);
  }, [vacancyId, loadApplicants]);

  React.useEffect(() => {
    onCountChange?.(applicants.length);
  }, [applicants.length, onCountChange]);

  const handleOpenChat = React.useCallback(
    (applicant: PendingApplicant) => {
      setPendingApplicant(applicant);
      goToTab('chat', vacancyId);
    },
    [setPendingApplicant, goToTab, vacancyId],
  );

  const totalCount = rankedTotal ?? applicants.length;
  const showCapNote = !rankError && applicants.length > 0 && rankedTotal !== null && applicants.length < rankedTotal;

  const rankingSummary = React.useMemo(() => {
    if (rankError) return null;
    let strongFit = 0, related = 0, exploratory = 0;
    for (const a of applicants) {
      const level = a.match?.fitLevel;
      if (level === 'Strong Fit') strongFit += 1;
      else if (level === 'Related') related += 1;
      else if (level === 'Exploratory') exploratory += 1;
    }
    if (strongFit + related + exploratory === 0) return null;
    return { strongFit, related, exploratory };
  }, [applicants, rankError]);

  if (!vacancyId) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t.chat.chooseVacancy}</p>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">{t.chat.noApplicationsYet}</p>
    );
  }

  return (
    <div className="space-y-3">
      {/* AI Analysis header banner */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5">
        <p className="text-xs font-semibold leading-snug text-foreground">
          {t.chat.aiRankedApplicants}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {t.chat.rankedApplicantsDescription}
        </p>
        {rankError ? (
          <p className="mt-1 text-[11px] leading-relaxed text-destructive/80">{rankError}</p>
        ) : null}
        {showCapNote ? (
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/90">
            {t.chat.rankedApplicantsLimitedNote
              .replace('{shown}', String(applicants.length))
              .replace('{total}', String(totalCount))}
          </p>
        ) : null}

        {rankingSummary ? (
          <div className="mt-2.5 space-y-2 border-t border-border/50 pt-2.5">
            <div className="flex items-start gap-2">
              <p className="text-[11px] font-semibold tracking-tight text-foreground">
                {t.chat.aiAnalysis}
              </p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p>{t.dashboard.matchFitStrong}: 80–100%</p>
                    <p>{t.dashboard.matchFitRelated}: 60–79%</p>
                    <p>{t.dashboard.matchFitExploratory}: 0–59%</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
            <div>
              <Badge variant="secondary" className="text-[10px] font-medium">
                {t.chat.rankingSummaryApplicants}: {totalCount}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge
                variant="outline"
                className="border-emerald-500/40 bg-emerald-500/5 text-[10px] font-medium text-emerald-800 dark:text-emerald-400"
              >
                {t.chat.rankingSummaryStrongFit}: {rankingSummary.strongFit}
              </Badge>
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/5 text-[10px] font-medium text-amber-900 dark:text-amber-400"
              >
                {t.chat.rankingSummaryRelated}: {rankingSummary.related}
              </Badge>
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
                {t.chat.rankingSummaryExploratory}: {rankingSummary.exploratory}
              </Badge>
            </div>
          </div>
        ) : null}
      </div>

      {/* Applicant cards */}
      {applicants.map((a, index) => {
        const rank = index + 1;
        const matchingSkills = (a.overlapSkills ?? []).slice(0, MAX_MATCHING_SKILLS);
        const fitLevel = a.match?.fitLevel;

        return (
          <div
            key={a.applicationId}
            className="rounded-lg border border-border/60 bg-card/30 px-3 py-2.5"
          >
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 text-sm font-semibold leading-snug text-foreground">
                <span className="mr-1.5 tabular-nums text-muted-foreground">#{rank}</span>
                <span className="truncate">{a.employee.name}</span>
              </p>
              {a.unreadCount > 0 ? (
                <Badge className="shrink-0 text-[10px]">{a.unreadCount}</Badge>
              ) : null}
            </div>

            {a.match && fitLevel ? (
              <div className="mb-2.5">
                <p className="text-sm font-semibold text-primary tabular-nums">
                  {a.match.matchScore}% {t.chat.matchPercentLabel}
                  <span className="text-muted-foreground"> · </span>
                  <span className="text-xs font-medium text-foreground">
                    {fitLevelLabel(fitLevel, t)}
                  </span>
                </p>
              </div>
            ) : (
              <div className="mb-2.5 rounded-md border border-border/30 bg-muted/25 px-2.5 py-2">
                <p className="text-[11px] font-medium text-muted-foreground">{t.chat.notRanked}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/90">
                  {t.chat.resumeEmbeddingUnavailable}
                </p>
              </div>
            )}

            {matchingSkills.length > 0 ? (
              <div className="mb-2">
                <p className="mb-1 text-[11px] font-medium text-foreground">
                  {t.chat.matchingSkills}
                </p>
                <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                  {matchingSkills.map((skill) => (
                    <li key={skill} className="flex gap-1.5">
                      <span className="shrink-0 text-muted-foreground/80">•</span>
                      <span className="min-w-0 truncate">{formatSkillDisplayName(skill)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {/* Actions: View Resume + Open Chat */}
            <div
              className="mt-2 flex flex-wrap items-center gap-2"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {a.resume?.id ? (
                <EmployerCandidateCardActions
                  resumeId={a.resume.id}
                  viewResumeLabel={t.dashboard.viewResume}
                  returnTo={vacancyId
                    ? `/dashboard/employer?tab=candidates&vacancy=${vacancyId}&subtab=applied`
                    : '/dashboard/employer?tab=candidates'}
                  className="mt-0"
                />
              ) : null}
              <button
                type="button"
                onClick={() => handleOpenChat(a)}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs',
                )}
              >
                {t.dashboard.openChatBtn}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
